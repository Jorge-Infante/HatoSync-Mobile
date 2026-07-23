// Metadatos compartidos del módulo de potreros (colores del estado de rotación).
export const ROTATION_STATUS_COLORS = {
  OCCUPIED: '#2E7D32', // primary
  RESTING: '#C98A2D', // accent / ochre
  NEVER_USED: '#3F5847', // secondary
}

export const ROTATION_STATUS_ICONS = {
  OCCUPIED: 'cow',
  RESTING: 'sprout-outline',
  NEVER_USED: 'circle-outline',
}

// Paleta para pintar el potrero guardado en el mapa (espejo del web).
export const PADDOCK_COLORS = ['#2E7D32', '#C98A2D', '#3F5847', '#4E7AA3', '#8A4E62', '#7B5E3B', '#5B7F3B', '#A3572E']

// Trazo de dibujo en el editor: amarillo alta visibilidad (sobre pasto el verde
// de la marca no se distingue) — misma decisión que el web.
export const DRAW_COLOR = '#FFD60A'

export function rotationStatusColor(status) {
  return ROTATION_STATUS_COLORS[status] || '#3F5847'
}

export function formatArea(paddock) {
  const ha = paddock.area_ha || 0
  if (ha >= 1) return `${ha.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ha`
  return `${Math.round(paddock.area_m2 || 0).toLocaleString('es-CO')} m²`
}
