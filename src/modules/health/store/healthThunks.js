import apiClient from '@/api/client'
import { fetchState } from '@/modules/shared/store/sharedThunks'

/**
 * Health-domain thunks (online-first, como en el web). El CRUD de protocolos usa
 * los shared thunks (createItem/updateItem/deleteItem sobre module 'health').
 * La agenda de aplicaciones y los tratamientos por animal son acciones de
 * dominio: llaman al API directo. El offline de sanidad es fase posterior.
 */

// Catálogo de protocolos (?type=TREATMENT filtra en backend).
export const fetchProtocols =
  (params) =>
  (dispatch) =>
    dispatch(fetchState({ module: 'health', nameState: 'protocols', url: '/health/protocols/', params }))

// Agenda sanitaria: aplicaciones filtrables por estado/animal/rango/vencidas.
export const fetchApplications =
  (params = {}) =>
  (dispatch) =>
    dispatch(fetchState({ module: 'health', nameState: 'applications', url: '/health/applications/', params }))

// Resolver una aplicación: aplicada (guarda quién y cuándo).
export const applyApplication =
  ({ id, applied_at, notes }) =>
  async () => {
    const { data } = await apiClient.post(`/health/applications/${id}/apply/`, { applied_at, notes })
    return data
  }

// Resolver una aplicación: omitida (no se realizó).
export const skipApplication =
  ({ id, notes }) =>
  async () => {
    const { data } = await apiClient.post(`/health/applications/${id}/skip/`, { notes })
    return data
  }

// Tratamiento sobre un animal. Con `protocol` las aplicaciones se generan solas
// (start_at + offset_hours); ad-hoc = name + applications[].
export const createTreatment =
  ({ animalId, data }) =>
  async () => {
    const { data: created } = await apiClient.post(`/livestock/animals/${animalId}/treatments/`, data)
    return created
  }

// Cancelar un tratamiento: sus aplicaciones PENDING pasan a SKIPPED.
export const cancelTreatment =
  ({ animalId, id }) =>
  async () => {
    const { data } = await apiClient.post(`/livestock/animals/${animalId}/treatments/${id}/cancel/`, {})
    return data
  }
