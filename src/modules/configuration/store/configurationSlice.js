import { createCrudSlice } from '@/modules/shared/store/createCrudSlice'

/**
 * Per-farm catalogs (breeds, identification types). Structure is in place; the
 * screens get built when the configuration module's turn comes. CRUD targets
 * module: 'configuration', nameState: 'breeds' | 'identificationTypes'.
 */
const configurationSlice = createCrudSlice('configuration', {
  initialState: { breeds: [], identificationTypes: [], medications: [] },
})

export default configurationSlice.reducer
