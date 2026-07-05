import React, { useState, useEffect, useCallback } from 'react'
import { Chip } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import CatalogList from '@/modules/configuration/components/CatalogList'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import IdentificationTypeFormModal from '@/modules/configuration/components/IdentificationTypeFormModal'

export default function IdentificationTypesScreen() {
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const types = useSelector((s) => s.configuration.identificationTypes)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, type: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!online) return // offline: catalog already hydrated from cache
    try {
      await dispatch(fetchState({ module: 'configuration', nameState: 'identificationTypes', url: '/configuration/identification-types/' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los tipos de identificación'), 'error')
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
      await dispatch(deleteItem({ module: 'configuration', nameState: 'identificationTypes', url: `/configuration/identification-types/${toDelete.id}/`, value: toDelete.id }))
      toast('Tipo de identificación eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el tipo'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CatalogList
        items={types}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        icon="tag-multiple-outline"
        newLabel="Nuevo tipo"
        emptyTitle="Aún no hay tipos de identificación"
        emptyText="Define los identificadores que usa tu finca para etiquetar a los animales."
        onNew={() => setForm({ visible: true, type: null })}
        onEdit={(type) => setForm({ visible: true, type })}
        onDelete={(type) => setToDelete(type)}
        renderMeta={(item) => (
          <Chip compact icon={item.is_unique ? 'fingerprint' : 'tag-multiple'}>
            {item.is_unique ? 'Único' : 'Repetible'}
          </Chip>
        )}
      />
      <IdentificationTypeFormModal
        visible={form.visible}
        type={form.type}
        onDismiss={() => setForm({ visible: false, type: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Tipo actualizado' : 'Tipo creado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar tipo de identificación?"
        message={`Se eliminará ${toDelete?.name || ''} del catálogo. Los animales que ya lo tengan registrado no se modifican.`}
      />
    </>
  )
}
