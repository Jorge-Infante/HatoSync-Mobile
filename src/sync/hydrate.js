import { crudRegistry } from '@/modules/shared/store/createCrudSlice'
import { getAnimals, getBreeds, getIdentificationTypes, getLots, getSchedules, getInactivationReasons, getFarms, getMembers } from '@/db/repositories'

/**
 * Loads the cached snapshot from SQLite into Redux so every screen reads offline
 * exactly as if it had just fetched from the network. Run once on app start
 * (and again after a download). Only touches the CRUD slices — the auth user is
 * handled by the bootstrap thunk.
 */
export async function hydrateFromDb(dispatch, farmId) {
  const set = (module, nameState, value) => {
    const actions = crudRegistry[module]
    if (actions) dispatch(actions.SET_STATE({ nameState, value }))
  }

  const [allAnimals, breeds, idTypes, lots, schedules, inactivationReasons, farms, members] = await Promise.all([
    getAnimals(farmId),
    getBreeds(farmId),
    getIdentificationTypes(farmId),
    getLots(farmId),
    getSchedules(farmId),
    getInactivationReasons(farmId),
    getFarms(),
    getMembers(farmId),
  ])

  // Externals share the local animals table; split so the herd stays clean.
  // Inactivos fuera: un animal sacado del hato OFFLINE queda is_active=false en
  // su JSON local — sin este filtro reaparecía en el hato al reiniciar la app.
  set('livestock', 'animals', allAnimals.filter((a) => !a.is_external && a.is_active !== false))
  set('livestock', 'externals', allAnimals.filter((a) => a.is_external))
  set('configuration', 'breeds', breeds)
  set('configuration', 'identificationTypes', idTypes)
  set('configuration', 'lots', lots)
  set('configuration', 'inactivationReasons', inactivationReasons)
  set('health', 'schedules', schedules)
  set('farms', 'farms', farms)
  set('farms', 'members', members)
}
