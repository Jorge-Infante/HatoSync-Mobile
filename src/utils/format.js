import { API_ORIGIN } from '@/api/client'

// Date string (YYYY-MM-DD) → "12 mar 2026" (es-CO). Mirrors the web helpers.
export function formatDate(date) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Full ISO datetime → "12 mar 2026"
export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

// birth_date → human age ("3 meses", "2 a 4 m", "Recién nacido")
export function formatAge(birthDate) {
  if (!birthDate) return 'Edad desconocida'
  const birth = new Date(`${birthDate}T00:00:00`)
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 1) return 'Recién nacido'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest ? `${years} a ${rest} m` : `${years} ${years === 1 ? 'año' : 'años'}`
}

// today as YYYY-MM-DD
export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Header that tells ngrok (free tier) to skip its browser-warning interstitial.
// The native <Image> loader doesn't go through the axios client, so remote
// images must carry this header themselves or ngrok returns an HTML page.
export const MEDIA_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

// Relative /media/... URL → absolute, prefixed with the configured backend origin.
// Also normalizes ABSOLUTE backend URLs (e.g. http://localhost:8000/media/...) to
// the current origin, so images work through the tunnel even if the API baked in
// a localhost/http URL.
export function mediaUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) {
    const idx = url.indexOf('/media/')
    return idx !== -1 ? `${API_ORIGIN}${url.slice(idx)}` : url
  }
  return `${API_ORIGIN}${url}`
}

// Image source for a remote backend image: { uri, headers } ready for <Image>/Avatar.Image.
export function mediaSource(url) {
  const uri = mediaUrl(url)
  return uri ? { uri, headers: MEDIA_HEADERS } : null
}

// "newest photo URL" for an animal list row (primary_photo or photos[0])
export function animalThumb(animal) {
  const url = animal.primary_photo || (animal.photos && animal.photos[0] && animal.photos[0].image)
  return mediaUrl(url)
}

export function initials(fullName) {
  if (!fullName) return 'U'
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}
