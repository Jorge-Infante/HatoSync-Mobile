import { getDb } from './index'

/**
 * Key/value metadata store (sync_meta): cached profile, last-download info, etc.
 * Values are JSON-serialized.
 */
export async function setMeta(key, value) {
  const db = await getDb()
  await db.runAsync('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)', [key, JSON.stringify(value)])
}

export async function getMeta(key) {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT value FROM sync_meta WHERE key = ?', [key])
  if (!row) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

// Cached user profile so the app can open offline with the last session
export const cacheProfile = (user) => setMeta('profile', user)
export const getCachedProfile = () => getMeta('profile')
