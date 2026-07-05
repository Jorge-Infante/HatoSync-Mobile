import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, Switch, Text, HelperText, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import DateField from '@/modules/shared/components/DateField'
import PickerField from '@/modules/shared/components/PickerField'
import { registerBirth } from '@/modules/livestock/store/livestockThunks'
import { SEX_OPTIONS } from '@/modules/livestock/constants'
import { todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

export default function RegisterBirthModal({ visible, mother, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const males = useSelector((s) => s.livestock.animals.filter((a) => a.sex === 'MALE'))
  const externalMales = useSelector((s) => s.livestock.externals.filter((a) => a.sex === 'MALE'))

  const [date, setDate] = useState(todayISO())
  const [sire, setSire] = useState(null)
  const [withCalf, setWithCalf] = useState(true)
  const [calfName, setCalfName] = useState('')
  const [calfSex, setCalfSex] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setDate(todayISO())
      setSire(null)
      setWithCalf(true)
      setCalfName('')
      setCalfSex(null)
      setNotes('')
      setError('')
    }
  }, [visible])

  async function submit() {
    if (!date) return setError('La fecha del parto es requerida')
    if (withCalf && (!calfName.trim() || !calfSex)) return setError('Completa nombre y sexo de la cría')
    setSaving(true)
    setError('')
    try {
      const payload = { date }
      if (sire) payload.sire = sire
      if (notes.trim()) payload.notes = notes.trim()
      if (withCalf) payload.calf = { name: calfName.trim(), sex: calfSex }
      await dispatch(registerBirth({ animalId: mother.id, data: payload }))
      onSaved && onSaved({ calfName: withCalf ? calfName.trim() : null })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo registrar el parto'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title="Registrar parto"
      icon="baby-bottle-outline"
      onSubmit={submit}
      submitLabel="Registrar parto"
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <Text variant="bodySmall" style={styles.hint}>
        Se registrará un parto de {mother?.name}. Si la cría nació viva, también se creará en el inventario.
      </Text>

      <DateField label="Fecha del parto *" value={date} onChange={setDate} max={todayISO()} style={styles.field} />
      <PickerField
        label="Toro / padre (opcional)"
        value={sire}
        options={[
          ...males.map((a) => ({ label: a.name, value: a.id })),
          ...externalMales.map((a) => ({ label: `${a.name} (externo)`, value: a.id })),
        ]}
        onChange={setSire}
        searchable
        clearable
        noDataText="No hay machos registrados"
        style={styles.field}
      />

      <View style={styles.switchRow}>
        <Text variant="bodyMedium">La cría nació viva</Text>
        <Switch value={withCalf} onValueChange={setWithCalf} />
      </View>

      {withCalf ? (
        <>
          <TextInput
            mode="outlined"
            label="Nombre de la cría *"
            value={calfName}
            onChangeText={setCalfName}
            left={<TextInput.Icon icon="tag-outline" />}
            style={styles.field}
          />
          <PickerField
            label="Sexo *"
            value={calfSex}
            options={SEX_OPTIONS}
            onChange={setCalfSex}
            style={styles.field}
          />
        </>
      ) : null}

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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
})
