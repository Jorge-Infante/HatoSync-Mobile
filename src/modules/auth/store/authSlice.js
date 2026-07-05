import { createSlice } from '@reduxjs/toolkit'
import apiClient from '@/api/client'
import tokenStorage from '@/api/tokenStorage'
import { initDb } from '@/db'
import { cacheProfile, getCachedProfile } from '@/db/meta'
import { clearLocalData } from '@/db/repositories'
import { hydrateFromDb } from '@/sync/hydrate'
import { crudRegistry } from '@/modules/shared/store/createCrudSlice'

/**
 * Auth + session. Mirrors the web's auth_store, adapted to RN: because tokens
 * live in (async) SecureStore, the session can't be resolved synchronously at
 * init like the web does. Instead `booted` starts false and the `bootstrap`
 * thunk (run once from App.js) decides whether a session can be restored.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    booted: false, // becomes true once bootstrap() has run (gates the splash)
  },
  reducers: {
    SET_USER(state, { payload }) {
      state.user = payload
    },
    SET_AUTHENTICATED(state, { payload }) {
      state.isAuthenticated = payload
    },
    SET_BOOTED(state, { payload = true }) {
      state.booted = payload
    },
    CLEAR_AUTH(state) {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { SET_USER, SET_AUTHENTICATED, SET_BOOTED, CLEAR_AUTH } = authSlice.actions

// --- thunks -----------------------------------------------------------------

// POST /auth/login/ {email, password} → {user, tokens: {access, refresh}}
export const login =
  ({ email, password }) =>
  async (dispatch) => {
    const { data } = await apiClient.post('/auth/login/', { email, password })
    // The SQLite cache is per-device, not per-account: if someone else was
    // cached here (e.g. the superuser), their farms would hydrate into this
    // session's farm switcher. Different account → wipe cache and Redux lists.
    try {
      const cached = await getCachedProfile()
      if (!cached || String(cached.id) !== String(data.user.id)) {
        await clearLocalData()
        Object.values(crudRegistry).forEach((actions) => dispatch(actions.RESET()))
      }
    } catch {
      // cache unavailable → nothing stale to leak
    }
    await tokenStorage.setTokens(data.tokens)
    dispatch(SET_USER(data.user))
    dispatch(SET_AUTHENTICATED(true))
    cacheProfile(data.user).catch(() => {})
    return data.user
  }

// GET /auth/me/ — restores the profile when a session token already exists
export const fetchProfile = () => async (dispatch) => {
  const { data } = await apiClient.get('/auth/me/')
  dispatch(SET_USER(data))
  cacheProfile(data).catch(() => {})
  return data
}

// POST /auth/me/active-farm/ {farm_id} → switches farm, returns updated user
export const switchActiveFarm = (farmId) => async (dispatch) => {
  const { data } = await apiClient.post('/auth/me/active-farm/', { farm_id: farmId })
  dispatch(SET_USER(data))
  cacheProfile(data).catch(() => {})
  return data
}

export const logout = () => async (dispatch) => {
  await tokenStorage.clear()
  dispatch(CLEAR_AUTH())
}

/**
 * Run once on app start. Opens the local DB, restores the session and hydrates
 * Redux from the offline cache. Crucially OFFLINE-AWARE: a network failure on
 * /auth/me/ must NOT log the user out (that only happens on a real 401) — we
 * fall back to the cached profile so the app opens in the field without signal.
 */
export const bootstrap = () => async (dispatch) => {
  try {
    await initDb()
  } catch {
    // a broken DB shouldn't block the app; offline cache just won't be available
  }
  try {
    const refresh = await tokenStorage.getRefreshToken()
    if (!refresh) return

    dispatch(SET_AUTHENTICATED(true))

    let user = null
    try {
      user = await dispatch(fetchProfile()) // online path
    } catch (e) {
      const status = e.response && e.response.status
      if (status === 401) {
        await dispatch(logout()) // token truly invalid → end session
        return
      }
      // offline / server unreachable → restore the cached session
      const cached = await getCachedProfile()
      if (cached) {
        dispatch(SET_USER(cached))
        user = cached
      }
    }

    const farmId = user && user.active_farm
    if (farmId != null) {
      try {
        await hydrateFromDb(dispatch, farmId)
      } catch {
        // no cache yet (never downloaded) → screens start empty, that's fine
      }
    }
  } finally {
    dispatch(SET_BOOTED(true))
  }
}

export default authSlice.reducer
