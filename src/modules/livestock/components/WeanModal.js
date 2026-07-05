import React, { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { TextInput, Text, HelperText } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import DateField from '@/modules/shared/components/DateField'
import { weanCalf } from '@/modules/livestock/store/livestockThunks'
import { todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

export default function WeanModal({ visible, mother, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setDate(todayISO())
      setNotes('')
      setError('')
    }
  }, [visible])

  async function submit() {
    if (!date) return setError('La fecha del destete es requerida')
    setSaving(true)
    setError('')
    try {
      const payload = { date }
      if (notes.trim()) payload.notes = notes.trim()
      await dispatch(weanCalf({ animalId: mother.id, data: payload }))
      onSaved && onSaved()
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo registrar el destete'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title="Destetar cría"
      icon="link-variant-off"
      onSubmit={submit}
      submitLabel="Registrar destete"
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <Text variant="bodySmall" style={styles.hint}>
        Se registrará el destete de la cría al pie de {mother?.name}.
      </Text>
      <DateField label="Fecha del destete *" value={date} onChange={setDate} max={todayISO()} style={styles.field} />
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
