import { createSlice } from '@reduxjs/toolkit'

/**
 * Registry of every CRUD-enabled slice's action creators, keyed by module name.
 * The shared thunks (sharedThunks.js) resolve a module by name and dispatch its
 * standard reducers — mirroring the web's shared store, where actions commit
 * mutations on the TARGET module's state resolved from rootState.
 */
export const crudRegistry = {}

/**
 * Builds a namespaced slice with the four standard list reducers every DRF
 * domain needs, plus whatever domain-specific state/reducers you pass in.
 *
 *   createCrudSlice('farms', {
 *     initialState: { farms: [] },
 *     reducers: { SET_ACTIVE(state, { payload }) { ... } },
 *   })
 *
 * The standard reducers operate on a named list inside the slice's state:
 *   SET_STATE   { nameState, value }            → state[nameState] = value
 *   ADD_ITEM    { nameState, value }            → prepend
 *   UPDATE_ITEM { nameState, key, value }       → replace item where [key] matches
 *   REMOVE_ITEM { nameState, key, value }       → drop item where [key] === value
 *   RESET                                       → back to the slice's initialState
 */
export function createCrudSlice(name, { initialState = {}, reducers = {} } = {}) {
  const slice = createSlice({
    name,
    initialState,
    reducers: {
      SET_STATE(state, { payload: { nameState, value } }) {
        state[nameState] = value
      },
      ADD_ITEM(state, { payload: { nameState, value } }) {
        if (!Array.isArray(state[nameState])) state[nameState] = []
        state[nameState].unshift(value)
      },
      UPDATE_ITEM(state, { payload: { nameState, key = 'id', value } }) {
        const list = state[nameState]
        if (!Array.isArray(list)) return
        const i = list.findIndex((item) => item[key] === value[key])
        if (i !== -1) list[i] = value
      },
      REMOVE_ITEM(state, { payload: { nameState, key = 'id', value } }) {
        const list = state[nameState]
        if (!Array.isArray(list)) return
        state[nameState] = list.filter((item) => item[key] !== value)
      },
      RESET() {
        return initialState
      },
      ...reducers,
    },
  })

  crudRegistry[name] = slice.actions
  return slice
}
