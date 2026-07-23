// /legacy: en SDK 56 las funciones (downloadAsync, getInfoAsync, documentDirectory)
// viven en /legacy; el paquete raíz lanza "deprecated" en runtime.
import * as FileSystem from 'expo-file-system/legacy'
import { MEDIA_HEADERS } from '@/utils/format'

/**
 * Caché LOCAL de archivos de foto para uso OFFLINE.
 *
 * El problema que resuelve: la descarga offline guardaba solo la METADATA de las
 * fotos (la URL del servidor), no los bytes. En el campo sin señal, expo-image
 * solo podía mostrar las fotos que ya se habían visto online (las tenía en su
 * caché por URL); las de animales nunca abiertos salían en blanco. Aquí se
 * descargan los ARCHIVOS a almacenamiento persistente y se referencian por su
 * uri local (file://), que `mediaUrl` deja pasar tal cual → se ven sin señal.
 */
const DIR = `${FileSystem.documentDirectory}media-cache/`

let ensured = false
async function ensureDir() {
  if (ensured) return
  const info = await FileSystem.getInfoAsync(DIR)
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true })
  ensured = true
}

/**
 * Descarga el archivo de UNA foto a almacenamiento persistente. Idempotente: si
 * ya está bajado (y no vacío) no re-descarga. Devuelve la uri local (file://) o
 * null si falla. Las fotos ya locales (file:) se devuelven tal cual.
 */
export async function cachePhotoFile(photoId, remoteUrl) {
  if (!photoId || !remoteUrl) return null
  if (remoteUrl.startsWith('file:')) return remoteUrl
  await ensureDir()
  const dest = `${DIR}${photoId}.jpg`
  try {
    const existing = await FileSystem.getInfoAsync(dest)
    if (existing.exists && existing.size > 0) return dest
    const res = await FileSystem.downloadAsync(remoteUrl, dest, { headers: MEDIA_HEADERS })
    if (res && res.status === 200) {
      const info = await FileSystem.getInfoAsync(dest)
      if (info.exists && info.size > 0) return dest
    }
    // Descarga fallida (404 / html de error / 0 bytes): no dejar basura.
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {})
    return null
  } catch {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {})
    return null
  }
}

// Vacía toda la caché de fotos (cambio de cuenta: los datos del usuario anterior
// no deben quedar en el dispositivo).
export async function clearMediaCache() {
  ensured = false
  try {
    await FileSystem.deleteAsync(DIR, { idempotent: true })
  } catch {
    // sin drama
  }
}
