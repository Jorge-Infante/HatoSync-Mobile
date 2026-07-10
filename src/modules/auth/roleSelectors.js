/**
 * Selectores de rol en la finca activa (espejo de los getters del web).
 * `active_farm_role` viene del backend en /auth/me/ y en el login.
 */
export const ADMIN_ROLES = ['OWNER', 'ADMIN']

export const selectActiveFarmRole = (s) => (s.auth.user ? s.auth.user.active_farm_role : null)

// Administra la finca activa: configuración (catálogos), miembros y datos de la finca.
export const selectIsFarmAdmin = (s) => {
  const role = selectActiveFarmRole(s)
  return ADMIN_ROLES.includes(role)
}

// El socio solo consulta sus animales asignados: toda la UI de escritura se oculta.
export const selectIsPartner = (s) => selectActiveFarmRole(s) === 'PARTNER'
