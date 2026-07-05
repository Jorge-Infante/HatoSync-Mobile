/**
 * App configuration.
 *
 * API_ORIGIN: origin of the HatoSync backend (Django REST). Mirrors the web's
 * VUE_APP_BASE_API. The client prefixes this with /api/v1.
 *
 * ⚠ Device testing: a physical phone (Expo Go) CANNOT reach `localhost` /
 * 127.0.0.1 — that points at the phone itself. Set this to your computer's LAN
 * IP (e.g. http://192.168.1.20:8000) and make sure the backend's CORS/ALLOWED
 * hosts include it. Android emulator can use http://10.0.2.2:8000. The iOS
 * simulator and web can use http://127.0.0.1:8000.
 */
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export const API_BASE_URL = `${API_ORIGIN}/api/v1`
