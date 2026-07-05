import React, { useState, useEffect } from 'react'
import { TextInput, HelperText } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'

export default function BreedFormModal({ visible, breed, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!breed
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(breed?.name || '')
      setError('')
    }
  }, [visible, breed])

  async function submit() {
    if (!name.trim()) return setError('El nombre es requerido')
    setSaving(true)
    setError('')
    try {
      const data = { name: name.trim() }
      if (isEdit) {
        await dispatch(updateItem({ module: 'configuration', nameState: 'breeds', url: `/configuration/breeds/${breed.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'configuration', nameState: 'breeds', url: '/configuration/breeds/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar la raza'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar raza' : 'Nueva raza'}
      icon={isEdit ? 'pencil-outline' : 'dna'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear raza'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <TextInput mode="outlined" label="Nombre *" value={name} onChangeText={setName} left={<TextInput.Icon icon="dna" />} autoFocus />
    </FormModal>
  )
}
