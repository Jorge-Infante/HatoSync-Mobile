import apiClient from '@/api/client'
import { crudRegistry } from '@/modules/shared/store/createCrudSlice'
import { isOnline } from '@/sync/connectivity'
import { enqueue } from '@/sync/outbox'
import { cacheUpsertTag, getTagByCode, cacheUpsertItem } from '@/db/repositories'
import { cleanCode, formatCode } from '@/modules/tags/code'

/**
 * Chapetas QR — identificación y asociación (la GENERACIÓN de lotes es del web).
 * Local-first: la tabla `tags` de SQLite (descargada en "Datos offline") permite
 * resolver y asociar en campo sin señal; el POST /assign/ del backend es
 * idempotente, así que el reintento de la outbox es seguro.
 */

const isNetworkError = (e) => !e.response
const activeFarmId = (getState) => {
  const user = getState().auth.user
  return user ? user.active_farm : null
}

function domainError(message) {
  // Mismo shape que un 400 de DRF para que getErrorMessage lo muestre tal cual.
  const err = new Error(message)
  err.response = { status: 400, data: { detail: message } }
  return err
}

// Refleja el tag_code en el animal de Redux + cache (listado y ficha lo pintan
// de inmediato; el objeto canónico llega con el próximo refetch/descarga).
function setAnimalTagCode({ dispatch, getState, animalId, code }) {
  const state = getState().livestock
  const nameState = ['animals', 'externals'].find((n) =>
    (state[n] || []).some((a) => String(a.id) === String(animalId))
  )
  if (!nameState) return
  const animal = state[nameState].find((a) => String(a.id) === String(animalId))
  const merged = { ...animal, tag_code: code }
  dispatch(crudRegistry.livestock.UPDATE_ITEM({ nameState, key: 'id', value: merged }))
  cacheUpsertItem('livestock', nameState, activeFarmId(getState), merged).catch(() => {})
}

// Estado de una chapeta + su animal. Online → GET /tags/resolve/{code}/;
// offline → tabla local `tags` + el hato hidratado.
export const resolveTag = (code) => async (dispatch, getState) => {
  const clean = cleanCode(code)
  if (await isOnline()) {
    try {
      const { data } = await apiClient.get(`/tags/resolve/${clean}/`)
      return data
    } catch (e) {
      if (e.response) throw e // 404/403 reales del servidor
      // sin respuesta → cayó la señal: seguir al camino offline
    }
  }
  const tag = await getTagByCode(clean)
  if (!tag) {
    throw domainError('Chapeta no encontrada en los datos descargados. Descarga la finca en "Datos offline" o busca con señal.')
  }
  let animal = null
  if (tag.animal) {
    const s = getState().livestock
    const found = [...(s.animals || []), ...(s.externals || [])].find((a) => String(a.id) === String(tag.animal))
    animal = found
      ? { id: found.id, name: found.name, sex: found.sex, sex_display: found.sex_display, is_active: found.is_active !== false }
      : { id: tag.animal, name: tag.animal_name || 'Animal' }
  }
  return {
    code: tag.code,
    code_display: tag.code_display || formatCode(tag.code),
    status: tag.status,
    status_display: tag.status_display || tag.status,
    animal,
    _local: true,
  }
}

// Asociar (o reponer con replace=true). Online → POST ya; offline → validación
// local + optimista + outbox (idempotente por diseño del endpoint).
export const assignTag =
  ({ code, animalId, replace = false }) =>
  async (dispatch, getState) => {
    const clean = cleanCode(code)
    const url = `/tags/${clean}/assign/`
    const body = { animal: animalId, replace }
    const farmId = activeFarmId(getState)

    if (await isOnline()) {
      try {
        const res = await apiClient.post(url, body)
        await cacheUpsertTag(farmId, res.data).catch(() => {})
        setAnimalTagCode({ dispatch, getState, animalId, code: clean })
        return res.data
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }

    // Validación local espejo de las reglas del backend, para no encolar una
    // operación que va a rebotar 400 al sincronizar.
    const tag = await getTagByCode(clean)
    if (tag) {
      if (tag.status === 'VOID') throw domainError('La chapeta está anulada: no se puede asociar.')
      if (tag.status === 'ASSIGNED' && String(tag.animal) !== String(animalId)) {
        throw domainError(`La chapeta ya está asignada a ${tag.animal_name || 'otro animal'}.`)
      }
    }
    // Sin el tag en cache no podemos validar (finca no descargada): se encola
    // igual — el checksum ya garantiza que el código es bien formado y el
    // servidor decide al sincronizar (un rechazo queda como error en la cola).
    const optimistic = {
      ...(tag || { id: clean, code: clean }),
      status: 'ASSIGNED',
      status_display: 'Asignada',
      animal: animalId,
      _pending: true,
    }
    await cacheUpsertTag(farmId, optimistic).catch(() => {})
    setAnimalTagCode({ dispatch, getState, animalId, code: clean })
    await enqueue({ method: 'POST', url, body, entityId: clean })
    return optimistic
  }
