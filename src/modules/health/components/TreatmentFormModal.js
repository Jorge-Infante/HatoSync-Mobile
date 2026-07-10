import React, { useState, useEffect, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, HelperText, Text, Button, Card, IconButton, SegmentedButtons, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import DateTimeField from '@/modules/health/components/DateTimeField'
import { fetchState } from '@/modules/shared/store/sharedThunks'
import { fetchProtocols, createTreatment } from '@/modules/health/store/healthThunks'
import { getErrorMessage } from '@/api/errors'
import { DOSE_UNITS, ROUTES } from '@/modules/health/constants'

/**
 * Crear un tratamiento sobre un animal: desde protocolo (genera las aplicaciones)
 * o manual/ad-hoc (aplicaciones una a una). Espejo de TreatmentFormDialog.vue.
 */
export default function TreatmentFormModal({ visible, animal, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const protocols = useSelector((s) => s.health.protocols.filter((p) => p.protocol_type === 'TREATMENT'))
  const medications = useSelector((s) => s.configuration.medications.filter((m) => m.is_active))
  const protocolOptions = useMemo(() => protocols.map((p) => ({ label: p.name, value: p.id })), [protocols])
  const medOptions = useMemo(() => medications.map((m) => ({ label: m.name, value: m.id })), [medications])

  const [mode, setMode] = useState('protocol')
  const [protocol, setProtocol] = useState(null)
  const [startAt, setStartAt] = useState('')
  const [name, setName] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [seq, setSeq] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setMode('protocol')
    setProtocol(null)
    setStartAt(new Date().toISOString())
    setName('')
    setDiagnosis('')
    setNotes('')
    setItems([])
    setSeq(0)
    setError('')
    if (!protocols.length) dispatch(fetchProtocols({ type: 'TREATMENT' })).catch(() => {})
    if (!medications.length) dispatch(fetchState({ module: 'configuration', nameState: 'medications', url: '/configuration/medications/' })).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  function addItem() {
    setItems((arr) => [...arr, { _k: seq, medication: null, dose_amount: '', dose_unit: 'ML', route: 'IM', scheduled_at: new Date().toISOString() }])
    setSeq((v) => v + 1)
  }
  function updateItem(idx, patch) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (mode === 'protocol') {
      if (!protocol) return setError('Elige un protocolo.')
      if (!startAt) return setError('Indica la fecha de inicio.')
    } else {
      if (!name.trim()) return setError('El nombre del tratamiento es requerido.')
      if (!items.length) return setError('Agrega al menos una aplicación.')
      for (const it of items) {
        if (!it.medication) return setError('Cada aplicación necesita un medicamento.')
        if (!(Number(it.dose_amount) > 0)) return setError('Cada dosis debe ser mayor que cero.')
        if (!it.scheduled_at) return setError('Cada aplicación necesita fecha y hora.')
      }
    }
    setSaving(true)
    setError('')
    try {
      const data = {}
      if (diagnosis.trim()) data.diagnosis = diagnosis.trim()
      if (notes.trim()) data.notes = notes.trim()
      if (mode === 'protocol') {
        data.protocol = protocol
        data.start_at = startAt
      } else {
        data.name = name.trim()
        data.applications = items.map((i) => ({
          medication: i.medication,
          dose_amount: i.dose_amount,
          dose_unit: i.dose_unit,
          route: i.route || null,
          scheduled_at: i.scheduled_at,
        }))
      }
      const treatment = await dispatch(createTreatment({ animalId: animal.id, data }))
      onSaved && onSaved({ treatment })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo crear el tratamiento'))
    } finally {
      setSaving(false)
    }
  }

  if (!animal) return null

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title="Nuevo tratamiento"
      icon="medical-bag"
      onSubmit={submit}
      submitLabel="Crear tratamiento"
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <Text variant="bodySmall" style={styles.hint}>
        Tratamiento para {animal.name}. Desde un protocolo las aplicaciones se programan solas; en modo
        manual las defines una a una.
      </Text>

      <SegmentedButtons
        value={mode}
        onValueChange={setMode}
        buttons={[
          { value: 'protocol', label: 'Protocolo' },
          { value: 'adhoc', label: 'Manual' },
        ]}
        style={styles.field}
      />

      {mode === 'protocol' ? (
        <>
          {!protocols.length ? (
            <HelperText type="info" visible>No hay protocolos de tratamiento. Crea uno o usa el modo manual.</HelperText>
          ) : null}
          <PickerField label="Protocolo *" value={protocol} options={protocolOptions} onChange={setProtocol} style={styles.field} />
          <DateTimeField label="Inicio del tratamiento *" value={startAt} onChange={setStartAt} helperText="Las aplicaciones se programan a partir de esta fecha/hora." style={styles.field} />
        </>
      ) : (
        <>
          <TextInput mode="outlined" label="Nombre del tratamiento *" value={name} onChangeText={setName} left={<TextInput.Icon icon="medical-bag" />} style={styles.field} />
          <View style={styles.itemsHeader}>
            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Aplicaciones</Text>
            <Button mode="contained-tonal" compact icon="plus" disabled={!medications.length} onPress={addItem}>Agregar</Button>
          </View>
          {!medications.length ? (
            <HelperText type="info" visible>Registra medicamentos en Configuración → Medicamentos.</HelperText>
          ) : null}
          {!items.length && medications.length ? (
            <Text variant="bodySmall" style={styles.emptyInline}>Añade al menos una aplicación con su fecha y hora.</Text>
          ) : null}
          {items.map((item, idx) => (
            <Card key={item._k} mode="outlined" style={styles.itemCard}>
              <Card.Content>
                <View style={styles.itemTop}>
                  <Text variant="labelSmall" style={styles.muted}>Aplicación {idx + 1}</Text>
                  <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => removeItem(idx)} />
                </View>
                <PickerField label="Medicamento *" value={item.medication} options={medOptions} onChange={(v) => updateItem(idx, { medication: v })} style={styles.field} />
                <View style={styles.row}>
                  <TextInput mode="outlined" label="Dosis *" value={item.dose_amount} onChangeText={(v) => updateItem(idx, { dose_amount: v })} keyboardType="decimal-pad" style={styles.half} />
                  <PickerField label="Unidad *" value={item.dose_unit} options={DOSE_UNITS} onChange={(v) => updateItem(idx, { dose_unit: v })} style={styles.half} />
                </View>
                <PickerField label="Vía" value={item.route} options={ROUTES} onChange={(v) => updateItem(idx, { route: v })} clearable style={styles.field} />
                <DateTimeField label="Fecha y hora *" value={item.scheduled_at} onChange={(v) => updateItem(idx, { scheduled_at: v })} />
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      <TextInput mode="outlined" label="Diagnóstico (opcional)" value={diagnosis} onChangeText={setDiagnosis} left={<TextInput.Icon icon="clipboard-pulse-outline" />} style={styles.field} />
      <TextInput mode="outlined" label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={styles.field} />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  hint: { opacity: 0.7, marginBottom: 12 },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  emptyInline: { textAlign: 'center', opacity: 0.6, paddingVertical: 16 },
  itemCard: { marginBottom: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  muted: { opacity: 0.7 },
})
