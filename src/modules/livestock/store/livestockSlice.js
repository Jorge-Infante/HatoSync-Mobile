import { createCrudSlice } from '@/modules/shared/store/createCrudSlice'

/**
 * Livestock domain (animals). The list is a lean serializer (no pagination yet
 * on the backend — plain arrays). CRUD goes through the shared thunks targeting
 * module: 'livestock', nameState: 'animals'. Reproduction flows (birth/wean)
 * and photos will add domain-specific thunks here later.
 */
const livestockSlice = createCrudSlice('livestock', {
  // `externals` = genética externa (GET /livestock/animals/?external=true):
  // referenciable como padre/madre/sire y en genealogía, nunca parte del hato.
  initialState: { animals: [], externals: [] },
})

export default livestockSlice.reducer
