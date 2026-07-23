import React, { useState, useEffect } from 'react'
import { TextInput, HelperText } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'

export default function LotFormModal({ visible, lot, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!lot
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(lot?.name || '')
      setError('')
    }
  }, [visible, lot])

  async function submit() {
    if (!name.trim()) return setError('El nombre es requerido')
    setSaving(true)
    setError('')
    try {
      const data = { name: name.trim() }
      if (isEdit) {
        await dispatch(updateItem({ module: 'configuration', nameState: 'lots', url: `/configuration/lots/${lot.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el lote'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar lote' : 'Nuevo lote'}
      icon={isEdit ? 'pencil-outline' : 'select-group'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear lote'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <TextInput
        mode="outlined"
        label="Nombre *"
        placeholder="Escotero, Paridas, Levante…"
        value={name}
        onChangeText={setName}
        left={<TextInput.Icon icon="select-group" />}
        autoFocus
      />
    </FormModal>
  )
}
