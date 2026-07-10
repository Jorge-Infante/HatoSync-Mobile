import apiClient from '@/api/client'
import { getDb } from '@/db'
import { crudRegistry } from '@/modules/shared/store/createCrudSlice'
import { cacheUpsertItem, cacheDeleteItem, cacheUpsertPhoto } from '@/db/repositories'
import { deleteOutboxPhoto } from '@/sync/photoStore'

/**
 * Outbox — the offline write queue. Every offline mutation is appended here and
 * replayed in FIFO order when connectivity returns. Because the client generates
 * the final UUID, creates are idempotent server-side (no id remap needed): a
 * parent enqueued before its child is sent first, so FK references resolve.
 */

let dbReady = null
async function db() {
  if (!dbReady) dbReady = getDb()
  return dbReady
}

export async function enqueue({ module, nameState, method, url, body, entityId }) {
  const d = await db()
  await d.runAsync(
    'INSERT INTO outbox (module, name_state, method, url, body, entity_id, status, retries, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [module || null, nameState || null, method, url, JSON.stringify(body || null), entityId || null, 'pending', 0, new Date().toISOString()]
  )
}

export async function pendingCount() {
  const d = await db()
  const row = await d.getFirstAsync("SELECT COUNT(*) AS n FROM outbox WHERE status != 'error'")
  return row ? row.n : 0
}

export async function errorCount() {
  const d = await db()
  const row = await d.getFirstAsync("SELECT COUNT(*) AS n FROM outbox WHERE status = 'error'")
  return row ? row.n : 0
}

// Entity ids with a pending op — used to badge optimistic rows as "por subir"
export async function pendingEntityIds() {
  const d = await db()
  const rows = await d.getAllAsync('SELECT DISTINCT entity_id FROM outbox WHERE entity_id IS NOT NULL')
  return rows.map((r) => r.entity_id)
}

const isNetworkError = (e) => !e.response // no response → unreachable/offline

let flushing = false

/**
 * Replays the queue against the API. Stops on the first network/5xx error
 * (still offline / server down) to retry later; marks 4xx items as 'error'
 * (validation) and skips them. Reconciles Redux + cache with the server's
 * canonical object on success. Pass the store to dispatch reconciliations.
 */
export async function flushOutbox(store) {
  if (flushing) return { synced: 0, skipped: 0, stopped: true }
  flushing = true
  const d = await db()
  let synced = 0
  let skipped = 0
  try {
    const items = await d.getAllAsync("SELECT * FROM outbox WHERE status = 'pending' ORDER BY seq ASC")
    const farmId = store.getState().auth.user ? store.getState().auth.user.active_farm : null

    for (const item of items) {
      const body = item.body ? JSON.parse(item.body) : undefined
      try {
        let res = null
        if (item.method === 'POST') res = await apiClient.post(item.url, body)
        else if (item.method === 'PATCH') res = await apiClient.patch(item.url, body)
        else if (item.method === 'DELETE') await apiClient.delete(item.url)
        else if (item.method === 'UPLOAD') {
          // Foto encolada offline (Fase 3): multipart con la copia local
          // persistente. El `id` de cliente hace el POST idempotente.
          const formData = new FormData()
          if (body.id) formData.append('id', body.id)
          if (body.caption) formData.append('caption', body.caption)
          formData.append(body.field || 'image', body.file)
          res = await apiClient.post(item.url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          // Reconciliar el cache de fotos (URI local → URL del servidor) y
          // soltar la copia local: ya vive en el backend.
          if (res && res.data && body.animalId) {
            await cacheUpsertPhoto(body.animalId, res.data).catch(() => {})
          }
          await deleteOutboxPhoto(body.file && body.file.uri)
        }

        // Reconcile Redux + cache with the canonical server object (same UUID,
        // so UPDATE_ITEM replaces the optimistic row in place).
        if (res && res.data && item.module && crudRegistry[item.module]) {
          store.dispatch(crudRegistry[item.module].UPDATE_ITEM({ nameState: item.name_state, key: 'id', value: res.data }))
          await cacheUpsertItem(item.module, item.name_state, farmId, res.data)
        }
        await d.runAsync('DELETE FROM outbox WHERE seq = ?', [item.seq])
        synced += 1
      } catch (e) {
        if (isNetworkError(e) || (e.response && e.response.status >= 500)) {
          // still offline / server error → stop, keep order, retry next time
          break
        }
        // 4xx → permanent (validation/permission). Park it for manual review.
        const msg = (e.response && JSON.stringify(e.response.data)) || String(e)
        await d.runAsync('UPDATE outbox SET status = ?, last_error = ?, retries = retries + 1 WHERE seq = ?', ['error', msg.slice(0, 500), item.seq])
        skipped += 1
      }
    }
  } finally {
    flushing = false
  }
  return { synced, skipped }
}

// For a "reintentar fallidos" action: move errored items back to pending
export async function retryErrored() {
  const d = await db()
  await d.runAsync("UPDATE outbox SET status = 'pending', last_error = NULL WHERE status = 'error'")
}
