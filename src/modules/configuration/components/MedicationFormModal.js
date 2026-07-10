import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, HelperText, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'
import { DOSE_UNITS } from '@/modules/health/constants'

export default function MedicationFormModal({ visible, medication, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!medication
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('ML')
  const [concentration, setConcentration] = useState('')
  const [meat, setMeat] = useState('0')
  const [milk, setMilk] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setName(medication?.name || '')
      setUnit(medication?.unit || 'ML')
      setConcentration(medication?.concentration || '')
      setMeat(String(medication?.withdrawal_days_meat ?? 0))
      setMilk(String(medication?.withdrawal_days_milk ?? 0))
      setNotes(medication?.notes || '')
      setError('')
    }
  }, [visible, medication])

  async function submit() {
    if (!name.trim()) return setError('El nombre es requerido')
    setSaving(true)
    setError('')
    try {
      const data = {
        name: name.trim(),
        unit,
        concentration: concentration.trim(),
        withdrawal_days_meat: Number(meat) || 0,
        withdrawal_days_milk: Number(milk) || 0,
        notes: notes.trim(),
      }
      if (isEdit) {
        await dispatch(updateItem({ module: 'configuration', nameState: 'medications', url: `/configuration/medications/${medication.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'configuration', nameState: 'medications', url: '/configuration/medications/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el medicamento'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar medicamento' : 'Nuevo medicamento'}
      icon={isEdit ? 'pencil-outline' : 'pill'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear medicamento'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <TextInput
        mode="outlined"
        label="Nombre *"
        placeholder="Oxitetraciclina, Ivermectina…"
        value={name}
        onChangeText={setName}
        left={<TextInput.Icon icon="pill" />}
        autoFocus
        style={styles.field}
      />
      <PickerField label="Unidad de dosis *" value={unit} options={DOSE_UNITS} onChange={setUnit} style={styles.field} />
      <TextInput mode="outlined" label="Concentración" placeholder="200 mg/ml" value={concentration} onChangeText={setConcentration} style={styles.field} />

      <Text variant="labelSmall" style={styles.overline}>DÍAS DE RETIRO</Text>
      <Text variant="bodySmall" style={styles.hint}>
        Días que deben pasar tras la última aplicación antes de aprovechar el producto.
      </Text>
      <View style={styles.row}>
        <TextInput mode="outlined" label="Carne (días)" value={meat} onChangeText={setMeat} keyboardType="number-pad" style={styles.half} left={<TextInput.Icon icon="food-steak" />} />
        <TextInput mode="outlined" label="Leche (días)" value={milk} onChangeText={setMilk} keyboardType="number-pad" style={styles.half} left={<TextInput.Icon icon="cup-water" />} />
      </View>
      <TextInput mode="outlined" label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={styles.field} />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  overline: { letterSpacing: 1, opacity: 0.6, color: '#2E7D32', marginTop: 2 },
  hint: { opacity: 0.7, marginBottom: 8 },
})
