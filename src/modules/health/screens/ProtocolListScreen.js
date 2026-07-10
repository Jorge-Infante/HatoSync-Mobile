import React, { useState, useEffect, useCallback } from 'react'
import { Chip } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { deleteItem } from '@/modules/shared/store/sharedThunks'
import { fetchProtocols } from '@/modules/health/store/healthThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import CatalogList from '@/modules/configuration/components/CatalogList'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import ProtocolFormModal from '@/modules/health/components/ProtocolFormModal'

export default function ProtocolListScreen() {
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const protocols = useSelector((s) => s.health.protocols.filter((p) => p.protocol_type === 'TREATMENT'))
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, protocol: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!online) return
    try {
      await dispatch(fetchProtocols({ type: 'TREATMENT' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los protocolos'), 'error')
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
      await dispatch(deleteItem({ module: 'health', nameState: 'protocols', url: `/health/protocols/${toDelete.id}/`, value: toDelete.id }))
      toast('Protocolo eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el protocolo'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CatalogList
        items={protocols}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        icon="clipboard-list-outline"
        newLabel="Nuevo protocolo"
        emptyTitle="Aún no hay protocolos"
        emptyText="Crea una plantilla (ej. un plan antibiótico de 3 días) para aplicarla a tus animales en un toque."
        onNew={() => setForm({ visible: true, protocol: null })}
        onEdit={(protocol) => setForm({ visible: true, protocol })}
        onDelete={(protocol) => setToDelete(protocol)}
        renderMeta={(item) => {
          const n = (item.items || []).length
          return <Chip compact>{n} {n === 1 ? 'aplicación' : 'aplicaciones'}</Chip>
        }}
      />
      <ProtocolFormModal
        visible={form.visible}
        protocol={form.protocol}
        onDismiss={() => setForm({ visible: false, protocol: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Protocolo actualizado' : 'Protocolo creado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar protocolo?"
        message={`Se eliminará ${toDelete?.name || ''}. Los tratamientos ya creados a partir de él no se modifican.`}
      />
    </>
  )
}
