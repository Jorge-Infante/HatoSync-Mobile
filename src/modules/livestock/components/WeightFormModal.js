import React, { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { TextInput, Text, HelperText } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import DateField from '@/modules/shared/components/DateField'
import { createWeight } from '@/modules/livestock/store/livestockThunks'
import { todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

/**
 * Registrar un pesaje (control de peso) de cualquier animal. La comparativa
 * contra el pesaje anterior la deriva el backend; offline el registro queda
 * en el outbox y sube al reconectar.
 */
export default function WeightFormModal({ visible, animal, onDismiss, onSaved }) {
  const dispatch = useDispatch()

  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setDate(todayISO())
      setWeight('')
      setNotes('')
      setError('')
    }
  }, [visible])

  async function submit() {
    if (!date) return setError('La fecha es requerida')
    const kg = Number(weight.replace(',', '.'))
    if (!weight.trim() || Number.isNaN(kg) || kg <= 0) return setError('El peso debe ser mayor que cero')
    setSaving(true)
    setError('')
    try {
      const data = { date, weight_kg: String(kg) }
      if (notes.trim()) data.notes = notes.trim()
      const record = await dispatch(createWeight({ animalId: animal.id, data }))
      onSaved && onSaved({ animal, record })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo registrar el peso'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title="Registrar peso"
      icon="scale"
      onSubmit={submit}
      submitLabel="Registrar"
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <Text variant="bodySmall" style={styles.hint}>
        Nuevo pesaje de {animal?.name}. La comparativa contra el pesaje anterior se calcula automáticamente.
      </Text>

      <DateField label="Fecha *" value={date} onChange={setDate} max={todayISO()} style={styles.field} />
      <TextInput
        mode="outlined"
        label="Peso (kg) *"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        left={<TextInput.Icon icon="scale" />}
        style={styles.field}
      />
      <TextInput
        mode="outlined"
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
        style={styles.field}
      />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  hint: { opacity: 0.7, marginBottom: 12 },
  field: { marginBottom: 12 },
})
