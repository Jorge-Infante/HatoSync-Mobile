import * as Crypto from 'expo-crypto'
import apiClient from '@/api/client'
import { crudRegistry } from './createCrudSlice'
import { isOnline } from '@/sync/connectivity'
import { enqueue, pendingOpsFor } from '@/sync/outbox'
import { cacheUpsertItem, cacheDeleteItem, saveFarms } from '@/db/repositories'

/**
 * Generic CRUD layer (the RN mirror of the web's shared store), now LOCAL-FIRST
 * for offline support (Fase 2):
 *
 * - Reads (fetchState) hit the network; the screens skip them when offline and
 *   rely on the SQLite cache hydrated at startup.
 * - Writes (create/update/delete) generate the entity's UUID on the client and:
 *     · online  → send now; on success reconcile Redux + cache.
 *     · offline → apply optimistically to Redux + cache and append to the OUTBOX,
 *                 which is flushed when connectivity returns.
 *   Because the client owns the UUID, the queued POST is idempotent server-side.
 *
 * Errors propagate so screens show the DRF message via getErrorMessage().
 */

function resolveActions(module) {
  const actions = crudRegistry[module]
  if (!actions) throw new Error(`[shared store] slice '${module}' is not registered`)
  return actions
}

function buildFormData(data) {
  if (data instanceof FormData) return data
  const formData = new FormData()
  Object.entries(data).forEach(([field, value]) => {
    if (value !== null && value !== undefined) formData.append(field, value)
  })
  return formData
}

const isNetworkError = (e) => !e.response
const activeFarmId = (getState) => {
  const user = getState().auth.user
  return user ? user.active_farm : null
}
const idFromUrl = (url) => url.replace(/\/+$/, '').split('/').pop()

// Minimal client-side enrichment so optimistic rows render before the server
// returns the canonical object.
function enrich(module, obj) {
  if (module === 'livestock') {
    return {
      sex_display: obj.sex === 'FEMALE' ? 'Hembra' : 'Macho',
      is_active: true,
      _pending: true,
      ...obj,
    }
  }
  return { _pending: true, ...obj }
}

// GET url → replaces module.nameState with the response (array or object).
// READ-YOUR-WRITES: antes de publicar el snapshot del servidor se re-aplican
// las operaciones que siguen PENDIENTES en la outbox (creadas offline o cuya
// subida aún no logra pasar por señal inestable). Sin este merge, un refetch
// al "volver" la señal pisaba la lista y los registros optimistas
// desaparecían del listado aunque siguieran en la cola (bug de campo 2026-07).
export const fetchState =
  ({ module, nameState, url, params }) =>
  async (dispatch) => {
    const { data } = await apiClient.get(url, { params })
    let value = data
    if (Array.isArray(data)) {
      try {
        const ops = await pendingOpsFor(module, nameState)
        if (ops.length) {
          let merged = [...data]
          for (const op of ops) {
            const body = op.body ? JSON.parse(op.body) : null
            const id = op.entity_id
            if (op.method === 'POST' && body) {
              if (!merged.some((x) => String(x.id) === String(id))) merged.unshift(enrich(module, body))
            } else if (op.method === 'PATCH' && body) {
              merged = merged.map((x) => (String(x.id) === String(id) ? { ...x, ...body, _pending: true } : x))
            } else if (op.method === 'DELETE') {
              merged = merged.filter((x) => String(x.id) !== String(id))
            }
          }
          value = merged
        }
      } catch {
        // sin outbox legible, publicar el snapshot tal cual
      }
    }
    dispatch(resolveActions(module).SET_STATE({ nameState, value }))
    // Farms drive the farm switcher: replace the offline snapshot with the
    // server's (memberships revoked since the last download must drop out).
    if (module === 'farms' && nameState === 'farms' && Array.isArray(value)) {
      saveFarms(value).catch(() => {})
    }
    return value
  }

// POST url → client UUID + optimistic; online sends now, offline queues.
export const createItem =
  ({ module, nameState, url, data }) =>
  async (dispatch, getState) => {
    const actions = resolveActions(module)
    const farmId = activeFarmId(getState)
    const id = (data && data.id) || Crypto.randomUUID()
    const payload = { ...data, id }

    if (await isOnline()) {
      try {
        const res = await apiClient.post(url, payload)
        dispatch(actions.ADD_ITEM({ nameState, value: res.data }))
        await cacheUpsertItem(module, nameState, farmId, res.data).catch(() => {})
        return res.data
      } catch (e) {
        if (!isNetworkError(e)) throw e // validation/permission → surface to the user
      }
    }
    // offline (or connectivity dropped mid-request)
    const optimistic = enrich(module, payload)
    dispatch(actions.ADD_ITEM({ nameState, value: optimistic }))
    await cacheUpsertItem(module, nameState, farmId, optimistic).catch(() => {})
    await enqueue({ module, nameState, method: 'POST', url, body: payload, entityId: id })
    return optimistic
  }

// PATCH url (includes the id) → optimistic merge; online sends now, offline queues.
export const updateItem =
  ({ module, nameState, url, data, key = 'id' }) =>
  async (dispatch, getState) => {
    const actions = resolveActions(module)
    const farmId = activeFarmId(getState)

    if (await isOnline()) {
      try {
        const res = await apiClient.patch(url, data)
        dispatch(actions.UPDATE_ITEM({ nameState, key, value: res.data }))
        await cacheUpsertItem(module, nameState, farmId, res.data).catch(() => {})
        return res.data
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }
    const id = idFromUrl(url)
    const list = getState()[module] ? getState()[module][nameState] : []
    const existing = (Array.isArray(list) ? list : []).find((x) => String(x.id) === String(id)) || {}
    const merged = { ...existing, ...data, id, _pending: true }
    dispatch(actions.UPDATE_ITEM({ nameState, key, value: merged }))
    await cacheUpsertItem(module, nameState, farmId, merged).catch(() => {})
    await enqueue({ module, nameState, method: 'PATCH', url, body: data, entityId: id })
    return merged
  }

// DELETE url (includes the id) → optimistic remove; online sends now, offline queues.
export const deleteItem =
  ({ module, nameState, url, key = 'id', value }) =>
  async (dispatch) => {
    const actions = resolveActions(module)
    if (await isOnline()) {
      try {
        await apiClient.delete(url)
        dispatch(actions.REMOVE_ITEM({ nameState, key, value }))
        await cacheDeleteItem(module, nameState, value).catch(() => {})
        return
      } catch (e) {
        if (!isNetworkError(e)) throw e
      }
    }
    dispatch(actions.REMOVE_ITEM({ nameState, key, value }))
    await cacheDeleteItem(module, nameState, value).catch(() => {})
    await enqueue({ module, nameState, method: 'DELETE', url, body: null, entityId: value })
  }

// POST multipart (photos). Online-only for now (binary offline = Fase 3).
export const uploadFile =
  ({ module, nameState, url, data }) =>
  async (dispatch, getState) => {
    if (!(await isOnline())) return null // offline: skip; photos sync later (Fase 3)
    const res = await apiClient.post(url, buildFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (module && nameState) {
      dispatch(resolveActions(module).ADD_ITEM({ nameState, value: res.data }))
    }
    return res.data
  }
