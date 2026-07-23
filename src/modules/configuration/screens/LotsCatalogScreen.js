import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import CatalogList from '@/modules/configuration/components/CatalogList'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import LotFormModal from '@/modules/configuration/components/LotFormModal'

// Catálogo de lotes (Configuración → Lotes). La VISTA de lotes con conteos vive
// en livestock (LotsScreen); esta pantalla solo administra el catálogo.
export default function LotsCatalogScreen() {
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const lots = useSelector((s) => s.configuration.lots)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, lot: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!online) return // offline: catálogo ya hidratado desde el cache
    try {
      await dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los lotes'), 'error')
    }
  }, [dispatch, toast, online])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, activeFarmId])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(deleteItem({ module: 'configuration', nameState: 'lots', url: `/configuration/lots/${toDelete.id}/`, value: toDelete.id }))
      toast('Lote eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el lote'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CatalogList
        items={lots}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        icon="select-group"
        newLabel="Nuevo lote"
        emptyTitle="Aún no hay lotes"
        emptyText="Crea los lotes con los que organizas tu finca (Escotero, Paridas…) para asignarlos a los animales."
        onNew={() => setForm({ visible: true, lot: null })}
        onEdit={(lot) => setForm({ visible: true, lot })}
        onDelete={(lot) => setToDelete(lot)}
      />
      <LotFormModal
        visible={form.visible}
        lot={form.lot}
        onDismiss={() => setForm({ visible: false, lot: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Lote actualizado' : 'Lote creado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar lote?"
        message={`Se eliminará ${toDelete?.name || ''} del catálogo. Los animales que lo tengan asignado quedarán sin lote.`}
      />
    </>
  )
}
