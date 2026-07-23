/**
 * Canonical app navigation — single source of truth for the drawer.
 * Mirrors the web's menuItems.js. `route` is the AppStack screen name.
 * Groups use `children` (rendered as a section in the drawer).
 *
 * `roles` restringe la entrada a esos roles de la finca activa (matriz
 * PLANNING §3.2.3): sin `roles` la ve cualquiera. `null` en la lista cubre al
 * usuario sin membresía todavía (necesita "Mis fincas" para su primera finca).
 */
const ADMIN_ROLES = ['OWNER', 'ADMIN']

const menuItems = [
  { title: 'Animales', icon: 'cow', route: 'AnimalList' },
  // Identificación en campo: leer la chapeta QR → ficha del animal. Todos los
  // roles (el socio también identifica; el backend limita lo que ve).
  { title: 'Escanear chapeta', icon: 'qrcode-scan', route: 'ScanTag' },
  { title: 'Lotes', icon: 'select-group', route: 'Lots' },
  { title: 'Potreros', icon: 'map-outline', route: 'PaddockList' },
  { title: 'Jornadas', icon: 'clipboard-play-outline', route: 'Jornadas' },
  {
    title: 'Sanidad',
    icon: 'hospital-box',
    children: [
      { title: 'Agenda', icon: 'calendar-clock', route: 'HealthAgenda' },
      { title: 'Protocolos', icon: 'clipboard-list-outline', roles: ADMIN_ROLES, route: 'ProtocolList' },
    ],
  },
  { title: 'Notificaciones', icon: 'bell-outline', route: 'Notifications' },
  {
    title: 'Configuración',
    icon: 'cog-outline',
    roles: ADMIN_ROLES,
    children: [
      { title: 'Razas', icon: 'dna', route: 'Breeds' },
      { title: 'Identificación', icon: 'tag-multiple-outline', route: 'IdentificationTypes' },
      { title: 'Medicamentos', icon: 'pill', route: 'MedicationList' },
      { title: 'Lotes', icon: 'select-group', route: 'LotsCatalog' },
      { title: 'Inactivación', icon: 'logout-variant', route: 'InactivationReasons' },
    ],
  },
  { title: 'Mis fincas', icon: 'barn', roles: [...ADMIN_ROLES, 'EMPLOYEE', null], route: 'FarmList' },
  { title: 'Miembros', icon: 'account-group-outline', roles: ADMIN_ROLES, route: 'FarmMembers' },
  { title: 'Datos offline', icon: 'cloud-download-outline', route: 'Sync' },
]

export function visibleMenuItems(role) {
  const allowed = (item) => !item.roles || item.roles.includes(role)
  return menuItems.filter(allowed).map((item) => {
    if (!item.children) return item
    // Filtra también los hijos por rol (ej. Protocolos = solo admins, aunque el
    // grupo Sanidad lo vea cualquiera).
    return { ...item, children: item.children.filter(allowed) }
  })
}

export default menuItems
