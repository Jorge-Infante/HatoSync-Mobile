/**
 * Canonical app navigation — single source of truth for the drawer.
 * Mirrors the web's menuItems.js. `route` is the AppStack screen name.
 * Groups use `children` (rendered as a section in the drawer).
 */
export default [
  { title: 'Animales', icon: 'cow', route: 'AnimalList' },
  {
    title: 'Configuración',
    icon: 'cog-outline',
    children: [
      { title: 'Razas', icon: 'dna', route: 'Breeds' },
      { title: 'Identificación', icon: 'tag-multiple-outline', route: 'IdentificationTypes' },
    ],
  },
  { title: 'Mis fincas', icon: 'barn', route: 'FarmList' },
  { title: 'Miembros', icon: 'account-group-outline', route: 'FarmMembers' },
  { title: 'Datos offline', icon: 'cloud-download-outline', route: 'Sync' },
]
