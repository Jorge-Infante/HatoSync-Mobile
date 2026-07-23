import { createCrudSlice } from '@/modules/shared/store/createCrudSlice'

/**
 * Potreros de la finca activa (espejo del módulo paddocks del web).
 * `paddocks` llega con `rotation` derivada del server (estado ocupado/descanso,
 * promedios); `stays` es el historial cargado (rotación). Online-first como
 * sanidad — el offline de potreros es fase posterior.
 */
const paddocksSlice = createCrudSlice('paddocks', {
  initialState: { paddocks: [], stays: [] },
})

export default paddocksSlice.reducer
