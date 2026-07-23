import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import CatalogList from '@/modules/configuration/components/CatalogList'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import InactivationReasonFormModal from '@/modules/configuration/components/InactivationReasonFormModal'

export default function InactivationReasonsScreen() {
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const reasons = useSelector((s) => s.configuration.inactivationReasons)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, reason: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!online) return // offline: catalog already hydrated from cache
    try {
      await dispatch(fetchState({ module: 'configuration', nameState: 'inactivationReasons', url: '/configuration/inactivation-reasons/' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los motivos'), 'error')
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
      await dispatch(deleteItem({ module: 'configuration', nameState: 'inactivationReasons', url: `/configuration/inactivation-reasons/${toDelete.id}/`, value: toDelete.id }))
      toast('Motivo eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el motivo'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CatalogList
        items={reasons}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        icon="logout-variant"
        newLabel="Nuevo motivo"
        emptyTitle="Aún no hay motivos de salida"
        emptyText="Registra los motivos (muerte, venta, regalo…) para poder sacar animales del hato con su causa."
        onNew={() => setForm({ visible: true, reason: null })}
        onEdit={(reason) => setForm({ visible: true, reason })}
        onDelete={(reason) => setToDelete(reason)}
      />
      <InactivationReasonFormModal
        visible={form.visible}
        reason={form.reason}
        onDismiss={() => setForm({ visible: false, reason: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Motivo actualizado' : 'Motivo creado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar motivo?"
        message={`Se eliminará ${toDelete?.name || ''} del catálogo. Las salidas ya registradas con este motivo no se modifican.`}
      />
    </>
  )
}
