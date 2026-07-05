import { createCrudSlice } from '@/modules/shared/store/createCrudSlice'

/**
 * Farms domain. CRUD goes through the shared thunks targeting this slice
 * (module: 'farms', nameState: 'farms'). Switching the active farm lives in the
 * auth slice (it mutates the user), not here.
 */
const farmsSlice = createCrudSlice('farms', {
  initialState: { farms: [], members: [] },
})

export default farmsSlice.reducer
