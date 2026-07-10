import React, { useState, useEffect, useCallback } from 'react'
import { Chip } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import CatalogList from '@/modules/configuration/components/CatalogList'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import MedicationFormModal from '@/modules/configuration/components/MedicationFormModal'

export default function MedicationsScreen() {
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const medications = useSelector((s) => s.configuration.medications)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, medication: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!online) return
    try {
      await dispatch(fetchState({ module: 'configuration', nameState: 'medications', url: '/configuration/medications/' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los medicamentos'), 'error')
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
      await dispatch(deleteItem({ module: 'configuration', nameState: 'medications', url: `/configuration/medications/${toDelete.id}/`, value: toDelete.id }))
      toast('Medicamento eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el medicamento'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CatalogList
        items={medications}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        icon="pill"
        newLabel="Nuevo medicamento"
        emptyTitle="Aún no hay medicamentos"
        emptyText="Registra los productos que maneja tu finca para usarlos en protocolos y tratamientos."
        onNew={() => setForm({ visible: true, medication: null })}
        onEdit={(medication) => setForm({ visible: true, medication })}
        onDelete={(medication) => setToDelete(medication)}
        renderMeta={(item) => (
          <Chip compact>
            {item.unit_display || item.unit}{item.concentration ? ` · ${item.concentration}` : ''}
          </Chip>
        )}
      />
      <MedicationFormModal
        visible={form.visible}
        medication={form.medication}
        onDismiss={() => setForm({ visible: false, medication: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Medicamento actualizado' : 'Medicamento creado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar medicamento?"
        message={`Se eliminará ${toDelete?.name || ''} del catálogo. Los protocolos y tratamientos que ya lo usen no se modifican.`}
      />
    </>
  )
}
