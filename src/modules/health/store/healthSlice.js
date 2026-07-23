import { createCrudSlice } from '@/modules/shared/store/createCrudSlice'

/**
 * Sanidad: plantillas (protocols) y agenda (applications). Espejo del
 * health_store del web. Los medicamentos viven en el slice `configuration`
 * (catálogo por finca), igual que en el web. CRUD estándar de protocolos va por
 * los shared thunks; las acciones de dominio (apply/skip/treatment) en
 * healthThunks.js.
 */
const healthSlice = createCrudSlice('health', {
  initialState: {
    protocols: [],
    applications: [],
    // Jornadas (batches de protocolo) y programados recurrentes.
    batches: [],
    schedules: [],
  },
})

export default healthSlice.reducer
