// Metadatos del módulo de sanidad (colores hex del sistema para chips de Paper,
// iconos MDI y opciones de selects). Espejo de health/constants.js del web.

export const HEALTH_STATUS_META = {
  PENDING: { label: 'Pendiente', icon: 'clock-outline', color: '#C98A2D' }, // ochre / warning
  APPLIED: { label: 'Aplicada', icon: 'check-circle-outline', color: '#3E8E48' }, // success
  SKIPPED: { label: 'Omitida', icon: 'close-circle-outline', color: '#3F5847' }, // secondary
}

export const TREATMENT_STATUS_META = {
  ACTIVE: { label: 'Activo', color: '#2E7D32' },
  COMPLETED: { label: 'Completado', color: '#3E8E48' },
  CANCELLED: { label: 'Cancelado', color: '#3F5847' },
}

export const OVERDUE_COLOR = '#B3402F' // terracotta / error

// Unidades de dosis (Medication.unit y aplicación).
export const DOSE_UNITS = [
  { label: 'ml', value: 'ML' },
  { label: 'mg', value: 'MG' },
  { label: 'g', value: 'G' },
  { label: 'UI', value: 'UI' },
  { label: 'Dosis', value: 'DOSE' },
  { label: 'Tableta', value: 'TABLET' },
  { label: 'Otra', value: 'OTHER' },
]

// Vías de administración (ProtocolItem.route / Application.route).
export const ROUTES = [
  { label: 'Intramuscular (IM)', value: 'IM' },
  { label: 'Subcutánea (SC)', value: 'SC' },
  { label: 'Intravenosa (IV)', value: 'IV' },
  { label: 'Oral', value: 'ORAL' },
  { label: 'Tópica', value: 'TOPICAL' },
  { label: 'Intravaginal', value: 'INTRAVAGINAL' },
  { label: 'Otra', value: 'OTHER' },
]

export const INTERVAL_UNITS = [
  { label: 'días', value: 'days' },
  { label: 'horas', value: 'hours' },
]

export function healthStatusMeta(status) {
  return HEALTH_STATUS_META[status] || { label: status, icon: 'needle', color: '#3F5847' }
}

export function treatmentStatusMeta(status) {
  return TREATMENT_STATUS_META[status] || HEALTH_STATUS_META[status] || { label: status, color: '#3F5847' }
}

export function doseLabel(app) {
  const unit = app.dose_unit_display || app.dose_unit || ''
  return `${app.dose_amount} ${unit}`.trim()
}
