// /legacy: mismo criterio que expo-media-library — en SDK 56 la API de
// funciones (copyAsync, deleteAsync, documentDirectory) vive en /legacy.
import * as FileSystem from 'expo-file-system/legacy'

/**
 * Copias locales de fotos pendientes de subir (Fase 3 offline).
 *
 * El picker y el manipulador dejan sus archivos en el caché del SO, que Android
 * puede purgar en cualquier momento; una foto encolada podría desaparecer antes
 * de que vuelva la señal. Por eso, al encolar, la foto se COPIA al
 * documentDirectory (persistente) y solo se borra cuando la subida confirma.
 */
const DIR = `${FileSystem.documentDirectory}outbox-photos/`

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR)
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true })
}

// Copia la foto al almacén persistente y devuelve su nueva URI local.
export async function persistOutboxPhoto(photoId, uri) {
  await ensureDir()
  const match = uri.match(/\.(\w{2,5})(\?.*)?$/)
  const ext = match ? match[1] : 'jpg'
  const dest = `${DIR}${photoId}.${ext}`
  await FileSystem.copyAsync({ from: uri, to: dest })
  return dest
}

// Vacía el almacén completo (cambio de cuenta: la outbox se borra y estas
// copias quedarían huérfanas).
export async function clearOutboxPhotos() {
  try {
    await FileSystem.deleteAsync(DIR, { idempotent: true })
  } catch {
    // sin drama
  }
}

// Borra la copia local tras subirla (o al descartar la operación). Idempotente.
export async function deleteOutboxPhoto(uri) {
  if (!uri || !uri.startsWith(DIR)) return
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true })
  } catch {
    // sin drama: quedará huérfana pero no rompe nada
  }
}
