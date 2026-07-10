import { useEffect, useState } from 'react'
import { useNetInfo } from '@react-native-community/netinfo'
import NetInfo from '@react-native-community/netinfo'
import axios from 'axios'
import { API_BASE_URL } from '@/config'
import { showGlobalToast } from '@/modules/shared/components/Toast'

/**
 * Connectivity helpers. We treat "unknown" (null) as online so we never block
 * the UI before the first reading; only an explicit `false` means offline.
 *
 * MODO DEGRADADO (señal intermitente): en el campo el celular suele reportar
 * "conectado" (hay antena) pero el servidor no responde — sin esto, las
 * peticiones quedaban colgadas y la app "cargando". Cuando una petición falla
 * por red (timeout / sin respuesta), el interceptor de axios llama a
 * reportNetworkFailure() y durante una ventana la app se comporta como
 * offline: escrituras directas al outbox, lecturas desde el cache, aviso al
 * usuario y chip de nube tachada en el header. Un probe periódico contra
 * /health/ detecta la recuperación y dispara la sincronización automática.
 */

const DEGRADED_WINDOW_MS = 45000 // ventana en modo offline tras un fallo de red
const PROBE_TIMEOUT_MS = 4000 // un ping debe responder rápido o no cuenta
const PROBE_INTERVAL_MS = 15000 // cada cuánto se re-intenta salir del modo degradado

let degradedUntil = 0
let probeTimer = null
const listeners = new Set()

function notify() {
  listeners.forEach((cb) => cb())
}

export function isDegraded() {
  return Date.now() < degradedUntil
}

// Suscripción a cambios del modo degradado (SyncProvider, useOnline).
export function onConnectivityChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// Lo llama el interceptor de axios ante un error de red (sin respuesta/timeout).
export function reportNetworkFailure() {
  const wasDegraded = isDegraded()
  degradedUntil = Date.now() + DEGRADED_WINDOW_MS
  if (!wasDegraded) {
    showGlobalToast(
      'Señal inestable: se trabajará sin conexión y los cambios se subirán automáticamente.',
      'error'
    )
    notify()
    scheduleProbe()
  }
}

// Lo llama el interceptor ante cualquier respuesta del servidor (aunque sea 4xx:
// si respondió, hay conexión) y el probe cuando /health/ vuelve a contestar.
export function reportNetworkSuccess() {
  if (!degradedUntil) return
  degradedUntil = 0
  if (probeTimer) {
    clearTimeout(probeTimer)
    probeTimer = null
  }
  showGlobalToast('Conexión restablecida: sincronizando cambios pendientes.')
  notify()
}

// Ping corto a /health/ (sin auth) con axios crudo: no pasa por los
// interceptores del apiClient para no realimentar el modo degradado.
export async function pingServer(timeoutMs = PROBE_TIMEOUT_MS) {
  try {
    await axios.get(`${API_BASE_URL}/health/`, {
      timeout: timeoutMs,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    return true
  } catch {
    return false
  }
}

function scheduleProbe() {
  if (probeTimer) clearTimeout(probeTimer)
  probeTimer = setTimeout(async () => {
    probeTimer = null
    if (!isDegraded()) return
    if (await pingServer()) {
      reportNetworkSuccess()
    } else {
      degradedUntil = Date.now() + DEGRADED_WINDOW_MS // sigue mal: extender
      scheduleProbe()
    }
  }, PROBE_INTERVAL_MS)
}

export function useOnline() {
  const net = useNetInfo()
  const [, force] = useState(0)
  useEffect(() => onConnectivityChange(() => force((n) => n + 1)), [])
  const netOk = net.isConnected !== false && net.isInternetReachable !== false
  return netOk && !isDegraded()
}

export async function isOnline() {
  if (isDegraded()) return false
  const state = await NetInfo.fetch()
  return state.isConnected !== false && state.isInternetReachable !== false
}
