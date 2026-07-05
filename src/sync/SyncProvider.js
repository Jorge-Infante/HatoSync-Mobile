import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import store from '@/store'
import { pendingCount, errorCount, flushOutbox, retryErrored } from '@/sync/outbox'
import { refreshAnimals } from '@/modules/livestock/store/livestockThunks'
import { isOnline } from '@/sync/connectivity'

/**
 * App-wide sync state + engine. Tracks how many writes are queued (pending) and
 * how many failed (error), exposes a manual `sync()` (flush) and auto-flushes
 * when connectivity returns. Wrap the app in <SyncProvider> and read via useSync().
 */
const SyncContext = createContext({ pending: 0, errors: 0, syncing: false, refresh: () => {}, sync: () => {}, retry: () => {} })

export function useSync() {
  return useContext(SyncContext)
}

export function SyncProvider({ children }) {
  const [pending, setPending] = useState(0)
  const [errors, setErrors] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const wasOnline = useRef(true)

  const refresh = useCallback(async () => {
    setPending(await pendingCount().catch(() => 0))
    setErrors(await errorCount().catch(() => 0))
  }, [])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const result = await flushOutbox(store)
      // After uploading writes, re-pull the herd so server-derived fields
      // (reproduction summary, counts) reflect the synced events.
      if (result.synced > 0 && (await isOnline())) {
        await store.dispatch(refreshAnimals()).catch(() => {})
      }
    } finally {
      setSyncing(false)
      await refresh()
    }
  }, [refresh])

  const retry = useCallback(async () => {
    await retryErrored()
    await sync()
  }, [sync])

  useEffect(() => {
    refresh()
    // Auto-flush when connectivity transitions offline → online
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false
      if (online && !wasOnline.current) sync()
      wasOnline.current = online
    })
    return unsub
  }, [refresh, sync])

  return (
    <SyncContext.Provider value={{ pending, errors, syncing, refresh, sync, retry }}>
      {children}
    </SyncContext.Provider>
  )
}
