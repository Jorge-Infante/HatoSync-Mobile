import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/modules/auth/store/authSlice'
import farmsReducer from '@/modules/farms/store/farmsSlice'
import livestockReducer from '@/modules/livestock/store/livestockSlice'
import configurationReducer from '@/modules/configuration/store/configurationSlice'

/**
 * Root store — combines the namespaced module slices, mirroring the web's
 * store/index.js. The slice keys MUST match the `module` names used by the
 * shared CRUD thunks (createCrudSlice registers under the same name).
 */
const store = configureStore({
  reducer: {
    auth: authReducer,
    farms: farmsReducer,
    livestock: livestockReducer,
    configuration: configurationReducer,
  },
})

export default store
