import axios from 'axios'
import { API_ORIGIN, API_BASE_URL } from '@/config'
import tokenStorage from './tokenStorage'

// Re-export so callers can prefix relative /media/... URLs (animal photos, etc.)
export { API_ORIGIN }

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Evita la página de advertencia que ngrok devuelve a peticiones tipo navegador;
  // con este header la API responde JSON directamente. Inofensivo fuera de ngrok.
  headers: { 'ngrok-skip-browser-warning': 'true' },
})

// Token storage is async on native, so the request interceptor is async too.
apiClient.interceptors.request.use(async (config) => {
  const access = await tokenStorage.getAccessToken()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

// Single shared refresh: concurrent 401s wait on the same request
let refreshPromise = null

function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = tokenStorage
      .getRefreshToken()
      .then((refresh) => axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh }))
      .then(async ({ data }) => {
        await tokenStorage.setTokens(data)
        return data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function forceLogout() {
  // Lazy import to avoid a circular dependency at module load (store → slices → client)
  const { default: store } = await import('@/store')
  const { logout } = await import('@/modules/auth/store/authSlice')
  store.dispatch(logout())
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response && error.response.status

    const isLoginRequest = original && original.url && original.url.includes('/auth/login')
    const hasRefresh = !!(await tokenStorage.getRefreshToken())

    if (status === 401 && original && !original._retried && !isLoginRequest && hasRefresh) {
      original._retried = true
      try {
        const access = await refreshTokens()
        original.headers.Authorization = `Bearer ${access}`
        return apiClient(original)
      } catch {
        await forceLogout()
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
