/**
 * Extracts a user-displayable message from a DRF error response.
 * Backend messages come in Spanish: 400 → {field: ["msg"]} | {non_field_errors: [...]} |
 * {detail: "..."} — possibly nested (e.g. {members: [{email: ["msg"]}]}).
 */

function firstString(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item)
      if (found) return found
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = firstString(item)
      if (found) return found
    }
  }
  return null
}

export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado') {
  if (!error.response) return 'No se pudo conectar con el servidor'

  const data = error.response.data
  if (!data || typeof data !== 'object') return fallback

  if (data.detail) return String(data.detail)
  if (data.non_field_errors) return [].concat(data.non_field_errors).join(' ')

  return firstString(data) || fallback
}
