import { crudRegistry } from '@/modules/shared/store/createCrudSlice'
import { getAnimals, getBreeds, getIdentificationTypes, getFarms, getMembers } from '@/db/repositories'

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

  const [allAnimals, breeds, idTypes, farms, members] = await Promise.all([
    getAnimals(farmId),
    getBreeds(farmId),
    getIdentificationTypes(farmId),
    getFarms(),
    getMembers(farmId),
  ])

  // Externals share the local animals table; split so the herd stays clean.
  set('livestock', 'animals', allAnimals.filter((a) => !a.is_external))
  set('livestock', 'externals', allAnimals.filter((a) => a.is_external))
  set('configuration', 'breeds', breeds)
  set('configuration', 'identificationTypes', idTypes)
  set('farms', 'farms', farms)
  set('farms', 'members', members)
}
