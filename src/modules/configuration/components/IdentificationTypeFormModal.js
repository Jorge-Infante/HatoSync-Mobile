import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, HelperText, Switch, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'

export default function IdentificationTypeFormModal({ visible, type, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!type
  const [name, setName] = useState('')
  const [isUnique, setIsUnique] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(type?.name || '')
      setIsUnique(type ? type.is_unique : false)
      setError('')
    }
  }, [visible, type])

  async function submit() {
    if (!name.trim()) return setError('El nombre es requerido')
    setSaving(true)
    setError('')
    try {
      const data = { name: name.trim(), is_unique: isUnique }
      if (isEdit) {
        await dispatch(updateItem({ module: 'configuration', nameState: 'identificationTypes', url: `/configuration/identification-types/${type.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'configuration', nameState: 'identificationTypes', url: '/configuration/identification-types/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el tipo de identificación'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar tipo de identificación' : 'Nuevo tipo de identificación'}
      icon={isEdit ? 'pencil-outline' : 'tag-multiple-outline'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear tipo'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <TextInput
        mode="outlined"
        label="Nombre *"
        placeholder="Chapeta, Hierro, Tatuaje…"
        value={name}
        onChangeText={setName}
        left={<TextInput.Icon icon="tag-outline" />}
        autoFocus
        style={styles.field}
      />
      <View style={styles.switchRow}>
        <Text variant="bodyMedium">Valor único en la finca</Text>
        <Switch value={isUnique} onValueChange={setIsUnique} />
      </View>
      <Text variant="bodySmall" style={styles.hint}>
        Actívalo cuando el número no se puede repetir entre animales (ej. la chapeta). Déjalo apagado si
        varios animales pueden compartir el mismo valor (ej. el hierro del lote).
      </Text>
    </FormModal>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  hint: { opacity: 0.7, marginTop: 6 },
})
