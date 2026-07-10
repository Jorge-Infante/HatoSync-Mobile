import React, { useState, useEffect, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, HelperText, Text, Button, Card, Chip, IconButton, Divider, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import { fetchState, createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'
import { DOSE_UNITS, ROUTES, INTERVAL_UNITS } from '@/modules/health/constants'

function hoursToDay(hours) {
  const d = (Number(hours) || 0) / 24
  return Number.isInteger(d) ? d : Math.round(d * 100) / 100
}

function dayChip(day) {
  const d = Number(day) || 0
  return d === 0 ? 'Día 0 · al iniciar' : `Día ${d}`
}

/**
 * Crear/editar protocolo (plantilla). Calendario por DÍAS relativos al inicio
 * (0 = al iniciar). Generador de pauta repetida ("cada N días/horas, M veces").
 * Espejo de ProtocolFormDialog.vue.
 */
export default function ProtocolFormModal({ visible, protocol, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const isEdit = !!protocol
  const medications = useSelector((s) => s.configuration.medications.filter((m) => m.is_active))
  const medOptions = useMemo(() => medications.map((m) => ({ label: m.name, value: m.id })), [medications])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState([])
  const [seq, setSeq] = useState(0)
  const [gen, setGen] = useState({ medication: null, dose_amount: '', dose_unit: 'ML', route: 'IM', startDay: '0', interval: '1', unit: 'days', count: '3' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    let s = 0
    const wrap = (it) => ({ ...it, _k: s++ })
    if (protocol) {
      setName(protocol.name || '')
      setDescription(protocol.description || '')
      setItems((protocol.items || []).map((i) => wrap({
        medication: i.medication,
        dose_amount: String(i.dose_amount),
        dose_unit: i.dose_unit,
        route: i.route || null,
        day: String(hoursToDay(i.offset_hours)),
      })))
    } else {
      setName('')
      setDescription('')
      setItems([])
    }
    setSeq(s)
    setGen({ medication: null, dose_amount: '', dose_unit: 'ML', route: 'IM', startDay: '0', interval: '1', unit: 'days', count: '3' })
    setError('')
    // Cargar catálogo de medicamentos si falta.
    if (!medications.length) {
      dispatch(fetchState({ module: 'configuration', nameState: 'medications', url: '/configuration/medications/' })).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, protocol])

  function nextKey() {
    const k = seq
    setSeq((v) => v + 1)
    return k
  }

  function addItem() {
    const last = items[items.length - 1]
    const nextDay = last ? (Number(last.day) || 0) + 1 : 0
    setItems((arr) => [...arr, { _k: nextKey(), medication: null, dose_amount: '', dose_unit: 'ML', route: 'IM', day: String(nextDay) }])
  }

  function updateItem(idx, patch) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }

  const previewDays = useMemo(() => {
    const count = Math.min(Number(gen.count) || 0, 12)
    const start = Number(gen.startDay) || 0
    const stepDays = gen.unit === 'hours' ? (Number(gen.interval) || 0) / 24 : Number(gen.interval) || 0
    const out = []
    for (let k = 0; k < count; k += 1) {
      const d = start + k * stepDays
      out.push(Number.isInteger(d) ? d : Math.round(d * 100) / 100)
    }
    return out
  }, [gen])

  function generate() {
    if (!gen.medication) return setError('Elige el medicamento de la pauta.')
    if (!(Number(gen.dose_amount) > 0)) return setError('La dosis de la pauta debe ser mayor que cero.')
    const count = Number(gen.count) || 0
    if (count < 1) return setError('La pauta debe generar al menos una aplicación.')
    setError('')
    let k = seq
    const rows = previewDays.map((day) => ({
      _k: k++,
      medication: gen.medication,
      dose_amount: String(gen.dose_amount),
      dose_unit: gen.dose_unit,
      route: gen.route || null,
      day: String(day),
    }))
    setSeq(k)
    setItems((arr) => [...arr, ...rows])
  }

  async function submit() {
    if (!name.trim()) return setError('El nombre es requerido')
    if (!items.length) return setError('Agrega al menos una aplicación al protocolo.')
    for (const it of items) {
      if (!it.medication) return setError('Cada aplicación necesita un medicamento.')
      if (!(Number(it.dose_amount) > 0)) return setError('Cada dosis debe ser mayor que cero.')
    }
    setSaving(true)
    setError('')
    try {
      const sorted = [...items].sort((a, b) => Number(a.day) - Number(b.day))
      const data = {
        name: name.trim(),
        protocol_type: 'TREATMENT',
        description: description.trim(),
        items: sorted.map((i) => ({
          medication: i.medication,
          dose_amount: i.dose_amount,
          dose_unit: i.dose_unit,
          route: i.route || null,
          offset_hours: Math.round(Number(i.day) * 24),
        })),
      }
      if (isEdit) {
        await dispatch(updateItem({ module: 'health', nameState: 'protocols', url: `/health/protocols/${protocol.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'health', nameState: 'protocols', url: '/health/protocols/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el protocolo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar protocolo' : 'Nuevo protocolo'}
      icon={isEdit ? 'pencil-outline' : 'clipboard-list-outline'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear protocolo'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      {!medications.length ? (
        <HelperText type="info" visible>
          Registra medicamentos en Configuración → Medicamentos para poder añadirlos.
        </HelperText>
      ) : null}

      <TextInput mode="outlined" label="Nombre del protocolo *" value={name} onChangeText={setName} left={<TextInput.Icon icon="clipboard-text-outline" />} style={styles.field} />
      <TextInput mode="outlined" label="Descripción (opcional)" value={description} onChangeText={setDescription} multiline numberOfLines={2} style={styles.field} />

      <Text variant="labelSmall" style={styles.overline}>CALENDARIO DE APLICACIONES</Text>
      <Text variant="bodySmall" style={styles.hint}>
        El día es relativo al inicio: 0 = el día que empieza, 1 = al día siguiente, 7 = una semana. Puedes
        mezclar medicamentos distintos en días distintos.
      </Text>

      {/* Generador de pauta repetida */}
      {medications.length ? (
        <Card mode="outlined" style={styles.genCard}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.genTitle}>Generar pauta repetida</Text>
            <Text variant="bodySmall" style={styles.hint}>Varias aplicaciones del mismo medicamento (ej. «cada 3 días, 4 veces»).</Text>
            <PickerField label="Medicamento" value={gen.medication} options={medOptions} onChange={(v) => setGen((g) => ({ ...g, medication: v }))} style={styles.field} />
            <View style={styles.row}>
              <TextInput mode="outlined" label="Dosis" value={gen.dose_amount} onChangeText={(v) => setGen((g) => ({ ...g, dose_amount: v }))} keyboardType="decimal-pad" style={styles.half} />
              <PickerField label="Unidad" value={gen.dose_unit} options={DOSE_UNITS} onChange={(v) => setGen((g) => ({ ...g, dose_unit: v }))} style={styles.half} />
            </View>
            <PickerField label="Vía" value={gen.route} options={ROUTES} onChange={(v) => setGen((g) => ({ ...g, route: v }))} clearable style={styles.field} />
            <View style={styles.row}>
              <TextInput mode="outlined" label="Primer día" value={gen.startDay} onChangeText={(v) => setGen((g) => ({ ...g, startDay: v }))} keyboardType="number-pad" style={styles.half} />
              <TextInput mode="outlined" label="Cada" value={gen.interval} onChangeText={(v) => setGen((g) => ({ ...g, interval: v }))} keyboardType="number-pad" style={styles.half} />
            </View>
            <View style={styles.row}>
              <PickerField label="Unidad" value={gen.unit} options={INTERVAL_UNITS} onChange={(v) => setGen((g) => ({ ...g, unit: v }))} style={styles.half} />
              <TextInput mode="outlined" label="N.º aplicaciones" value={gen.count} onChangeText={(v) => setGen((g) => ({ ...g, count: v }))} keyboardType="number-pad" style={styles.half} />
            </View>
            <Text variant="bodySmall" style={styles.hint}>Días: {previewDays.join(', ') || '—'}</Text>
            <Button mode="contained-tonal" icon="plus" onPress={generate} style={styles.genBtn}>Generar</Button>
          </Card.Content>
        </Card>
      ) : null}

      <View style={styles.itemsHeader}>
        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{items.length} aplicación(es)</Text>
        <Button mode="contained-tonal" compact icon="plus" disabled={!medications.length} onPress={addItem}>Agregar una</Button>
      </View>

      {!items.length ? (
        <Text variant="bodySmall" style={styles.emptyInline}>Usa «Generar pauta repetida» o «Agregar una».</Text>
      ) : null}

      {items.map((item, idx) => (
        <Card key={item._k} mode="outlined" style={styles.itemCard}>
          <Card.Content>
            <View style={styles.itemTop}>
              <Chip compact style={{ backgroundColor: theme.colors.primary + '22' }} textStyle={{ color: theme.colors.primary }}>{dayChip(item.day)}</Chip>
              <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => removeItem(idx)} />
            </View>
            <PickerField label="Medicamento *" value={item.medication} options={medOptions} onChange={(v) => updateItem(idx, { medication: v })} style={styles.field} />
            <View style={styles.row}>
              <TextInput mode="outlined" label="Dosis *" value={item.dose_amount} onChangeText={(v) => updateItem(idx, { dose_amount: v })} keyboardType="decimal-pad" style={styles.half} />
              <PickerField label="Unidad *" value={item.dose_unit} options={DOSE_UNITS} onChange={(v) => updateItem(idx, { dose_unit: v })} style={styles.half} />
            </View>
            <View style={styles.row}>
              <PickerField label="Vía" value={item.route} options={ROUTES} onChange={(v) => updateItem(idx, { route: v })} clearable style={styles.half} />
              <TextInput mode="outlined" label="Día *" value={item.day} onChangeText={(v) => updateItem(idx, { day: v })} keyboardType="number-pad" style={styles.half} />
            </View>
          </Card.Content>
        </Card>
      ))}
      <Divider style={{ opacity: 0 }} />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  overline: { letterSpacing: 1, opacity: 0.6, color: '#2E7D32', marginTop: 4 },
  hint: { opacity: 0.7, marginBottom: 8 },
  genCard: { marginBottom: 14, backgroundColor: 'rgba(46,125,50,0.04)' },
  genTitle: { marginBottom: 2 },
  genBtn: { marginTop: 4 },
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  emptyInline: { textAlign: 'center', opacity: 0.6, paddingVertical: 16 },
  itemCard: { marginBottom: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
})
