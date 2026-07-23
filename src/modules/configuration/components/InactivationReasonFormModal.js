import React, { useState, useEffect } from 'react'
import { TextInput, HelperText } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'

export default function InactivationReasonFormModal({ visible, reason, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!reason
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(reason?.name || '')
      setError('')
    }
  }, [visible, reason])

  async function submit() {
    if (!name.trim()) return setError('El nombre es requerido')
    setSaving(true)
    setError('')
    try {
      const data = { name: name.trim() }
      if (isEdit) {
        await dispatch(updateItem({ module: 'configuration', nameState: 'inactivationReasons', url: `/configuration/inactivation-reasons/${reason.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'configuration', nameState: 'inactivationReasons', url: '/configuration/inactivation-reasons/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el motivo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar motivo' : 'Nuevo motivo de salida'}
      icon={isEdit ? 'pencil-outline' : 'logout-variant'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear motivo'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <TextInput
        mode="outlined"
        label="Nombre *"
        placeholder="Muerte, Venta, Regalo…"
        value={name}
        onChangeText={setName}
        left={<TextInput.Icon icon="logout-variant" />}
        autoFocus
      />
    </FormModal>
  )
}
