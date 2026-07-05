import * as SecureStore from 'expo-secure-store'

/**
 * JWT token persistence. Mirrors the web's tokenStorage but backed by
 * expo-secure-store (encrypted keystore) instead of localStorage — so every
 * method is ASYNC. Keys are prefixed `hatosync_` like the web.
 */
const ACCESS_TOKEN_KEY = 'hatosync_access_token'
const REFRESH_TOKEN_KEY = 'hatosync_refresh_token'

export default {
  getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
  },
  getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  },
  async setTokens({ access, refresh }) {
    if (access) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access)
    // Refresh rotates server-side: always overwrite, the old one is blacklisted
    if (refresh) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh)
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  },
}
