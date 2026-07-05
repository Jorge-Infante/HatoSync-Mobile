import * as Crypto from 'expo-crypto'
import apiClient from '@/api/client'
import { fetchState, createItem } from '@/modules/shared/store/sharedThunks'
import { isOnline } from '@/sync/connectivity'
import { enqueue } from '@/sync/outbox'
import {
  getAnimalFullLocal,
  getEventsLocal,
  getWeightsLocal,
  buildGenealogyLocal,
  cacheUpsertEvent,
  cacheUpsertWeight,
  cacheDeleteWeight,
} from '@/db/repositories'

/**
 * Livestock-domain thunks. Reads fall back to the local cache offline; writes go
 * through the local-first path (online → API now; offline → optimistic + outbox).
 * Reproduction is unified on the GENERIC event endpoint: a parto is decomposed
 * into "create calf (animal) + create BIRTH event", so it works identically
 * online and offline with client-generated UUIDs.
 */

const isNetworkError = (e) => !e.response
const activeFarmId = (getState) => {
  const user = getState().auth.user
  return user ? user.active_farm : null
}

export const refreshAnimals = () => (dispatch) =>
  dispatch(fetchState({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/' }))

// Genética externa (pajillas / toros alquilados): alimenta los pickers de
// padre/madre/toro; nunca se mezcla con el hato.
export const refreshExternals = () => (dispatch) =>
  dispatch(fetchState({ module: 'livestock', nameState: 'externals', url: '/livestock/animals/', params: { external: true } }))

// GET event history of one cow. Offline → local cache.
export const fetchReproductionEvents = (animalId) => async () => {
  try {
    const { data } = await apiClient.get(`/livestock/animals/${animalId}/reproduction/`)
    return data
  } catch (e) {
    return getEventsLocal(animalId)
  }
}

// Full dossier. Offline → assembled from the local cache.
export const fetchAnimalFull = (animalId) => async (dispatch, getState) => {
  try {
    const { data } = await apiClient.get(`/livestock/animals/${animalId}/full/`)
    return data
  } catch (e) {
    const local = await getAnimalFullLocal(animalId, activeFarmId(getState))
    if (local) return local
    throw e
  }
}

// Ancestor tree. Offline → built locally from the cached herd.
export const fetchGenealogy =
  ({ animalId, depth = 3 }) =>
  async (dispatch, getState) => {
    try {
      const { data } = await apiClient.get(`/livestock/animals/${animalId}/genealogy/`, { params: { depth } })
      return data
    } catch (e) {
      const local = await buildGenealogyLocal(animalId, activeFarmId(getState), depth)
      if (local) return local
      throw e
    }
  }

// Create any reproductive event (INSEMINATION | NATURAL_MATING | PREGNANCY_CHECK
// | ABORTION | BIRTH | WEANING). Local-first; client UUID. Events aren't kept in
// a Redux list (fetched on demand), so offline we cache the event locally.
export const createReproductionEvent =
  ({ animalId, data }) =>
  async (dispatch, getState) => {
    const id = data.id || Crypto.randomUUID()
    const url = `/livestock/animals/${animalId}/reproduction/`
    const body = { ...data, id }

    if (await isOnline()) {
      try {
        const res = await apiClient.post(url, body)
        await dispatch(refreshAnimals()) // reproduction summary is server-derived
        return res.data
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }
    const event = { ...body, _pending: true }
    await cacheUpsertEvent(activeFarmId(getState), animalId, event).catch(() => {})
    await enqueue({ method: 'POST', url, body, entityId: id })
    return event
  }

// Control de peso: pesajes de un animal. Online el backend deriva la
// comparativa (previous_weight_kg / diff_kg); offline se cae al cache local
// (la pantalla recalcula la comparativa client-side si falta).
export const fetchWeights = (animalId) => async () => {
  try {
    const { data } = await apiClient.get(`/livestock/animals/${animalId}/weights/`)
    return data
  } catch (e) {
    return getWeightsLocal(animalId)
  }
}

// Crear pesaje: local-first con UUID de cliente (POST idempotente al sincronizar).
export const createWeight =
  ({ animalId, data }) =>
  async (dispatch, getState) => {
    const id = data.id || Crypto.randomUUID()
    const url = `/livestock/animals/${animalId}/weights/`
    const body = { ...data, id }

    if (await isOnline()) {
      try {
        const res = await apiClient.post(url, body)
        await cacheUpsertWeight(activeFarmId(getState), animalId, res.data).catch(() => {})
        return res.data
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }
    const record = { ...body, _pending: true }
    await cacheUpsertWeight(activeFarmId(getState), animalId, record).catch(() => {})
    await enqueue({ method: 'POST', url, body, entityId: id })
    return record
  }

// Eliminar pesaje: optimista; offline se encola el DELETE.
export const deleteWeight =
  ({ animalId, weightId }) =>
  async () => {
    const url = `/livestock/animals/${animalId}/weights/${weightId}/`
    if (await isOnline()) {
      try {
        await apiClient.delete(url)
        await cacheDeleteWeight(weightId).catch(() => {})
        return
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }
    await cacheDeleteWeight(weightId).catch(() => {})
    await enqueue({ method: 'DELETE', url, body: null, entityId: weightId })
  }

// Registrar parto = crear cría (animal) + evento BIRTH que la referencia.
// Igual online y offline (la cría nace con su UUID de cliente).
export const registerBirth =
  ({ animalId, data }) =>
  async (dispatch) => {
    const { date, sire, notes, calf } = data
    let offspringId = null
    if (calf) {
      offspringId = Crypto.randomUUID()
      await dispatch(
        createItem({
          module: 'livestock',
          nameState: 'animals',
          url: '/livestock/animals/',
          data: {
            id: offspringId,
            name: calf.name,
            sex: calf.sex,
            mother: animalId,
            ...(sire ? { father: sire } : {}),
            ...(date ? { birth_date: date } : {}),
          },
        })
      )
    }
    const eventData = { event_type: 'BIRTH', date }
    if (sire) eventData.sire = sire
    if (notes) eventData.notes = notes
    if (offspringId) eventData.offspring = offspringId
    return dispatch(createReproductionEvent({ animalId, data: eventData }))
  }

// Destetar = evento WEANING (vía el endpoint genérico).
export const weanCalf =
  ({ animalId, data }) =>
  async (dispatch) =>
    dispatch(createReproductionEvent({ animalId, data: { event_type: 'WEANING', ...data } }))

/**
 * Fotos: endpoint multipart, ONLINE-ONLY por ahora (binarios offline = Fase 3).
 * newFiles: [{uri, name, type}]; removedIds: ids a borrar.
 */
export const syncAnimalPhotos =
  ({ animalId, newFiles = [], removedIds = [] }) =>
  async (dispatch) => {
    if (!(await isOnline())) return // offline: se omiten; las fotos sincronizan en Fase 3
    for (const file of newFiles) {
      const formData = new FormData()
      formData.append('image', { uri: file.uri, name: file.name, type: file.type })
      await apiClient.post(`/livestock/animals/${animalId}/photos/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    for (const photoId of removedIds) {
      await apiClient.delete(`/livestock/animals/${animalId}/photos/${photoId}/`)
    }
    if (newFiles.length || removedIds.length) await dispatch(refreshAnimals())
  }
