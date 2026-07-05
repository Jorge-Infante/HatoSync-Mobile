import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import CatalogList from '@/modules/configuration/components/CatalogList'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import BreedFormModal from '@/modules/configuration/components/BreedFormModal'

export default function BreedsScreen() {
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const breeds = useSelector((s) => s.configuration.breeds)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, breed: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!online) return // offline: catalog already hydrated from cache
    try {
      await dispatch(fetchState({ module: 'configuration', nameState: 'breeds', url: '/configuration/breeds/' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar las razas'), 'error')
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
      await dispatch(deleteItem({ module: 'configuration', nameState: 'breeds', url: `/configuration/breeds/${toDelete.id}/`, value: toDelete.id }))
      toast('Raza eliminada')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar la raza'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CatalogList
        items={breeds}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        icon="dna"
        newLabel="Nueva raza"
        emptyTitle="Aún no hay razas"
        emptyText="Crea las razas que maneja tu finca para asignarlas a los animales."
        onNew={() => setForm({ visible: true, breed: null })}
        onEdit={(breed) => setForm({ visible: true, breed })}
        onDelete={(breed) => setToDelete(breed)}
      />
      <BreedFormModal
        visible={form.visible}
        breed={form.breed}
        onDismiss={() => setForm({ visible: false, breed: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Raza actualizada' : 'Raza creada')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar raza?"
        message={`Se eliminará ${toDelete?.name || ''} del catálogo. Los animales que ya la tengan asignada no se modifican.`}
      />
    </>
  )
}
