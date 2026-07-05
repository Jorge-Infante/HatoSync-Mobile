// Shared reproduction metadata (colors/icons/labels) used by list, menus and dialogs.
// Colors are hex (the design-system semantic palette) so Paper chips can use them directly.
export const REPRO_STATUS_COLORS = {
  OPEN: '#C98A2D', // warning / ochre
  SERVED: '#38678C', // info
  PREGNANT: '#3E8E48', // success
  CALVED: '#3F5847', // secondary / eucalyptus
}

export const REPRO_EVENT_META = {
  BIRTH: { label: 'Parto', icon: 'baby-bottle-outline', color: '#3E8E48' },
  INSEMINATION: { label: 'Inseminación', icon: 'needle', color: '#38678C' },
  NATURAL_MATING: { label: 'Monta natural', icon: 'cow', color: '#C98A2D' },
  PREGNANCY_CHECK: { label: 'Chequeo de preñez', icon: 'stethoscope', color: '#38678C' },
  ABORTION: { label: 'Aborto', icon: 'alert-circle-outline', color: '#B3402F' },
  WEANING: { label: 'Destete', icon: 'link-variant-off', color: '#3F5847' },
}

export const SEX_OPTIONS = [
  { label: 'Hembra', value: 'FEMALE' },
  { label: 'Macho', value: 'MALE' },
]

export const EVENT_TYPE_OPTIONS = [
  { label: 'Inseminación', value: 'INSEMINATION' },
  { label: 'Monta natural', value: 'NATURAL_MATING' },
  { label: 'Chequeo de preñez', value: 'PREGNANCY_CHECK' },
  { label: 'Aborto', value: 'ABORTION' },
]

export const RESULT_OPTIONS = [
  { label: 'Positiva', value: 'POSITIVE' },
  { label: 'Negativa', value: 'NEGATIVE' },
]

export function reproStatusColor(status) {
  return REPRO_STATUS_COLORS[status] || '#3F5847'
}

export function eventMeta(eventType) {
  return REPRO_EVENT_META[eventType] || { label: eventType, icon: 'circle-small', color: '#3F5847' }
}
