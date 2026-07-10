import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import {
  Portal,
  Modal,
  Text,
  IconButton,
  Button,
  Chip,
  TextInput,
  Divider,
  ActivityIndicator,
  HelperText,
  Avatar,
  useTheme,
} from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import PickerField from '@/modules/shared/components/PickerField'
import DateField from '@/modules/shared/components/DateField'
import { fetchReproductionEvents, createReproductionEvent } from '@/modules/livestock/store/livestockThunks'
import { EVENT_TYPE_OPTIONS, RESULT_OPTIONS, eventMeta, reproStatusColor } from '@/modules/livestock/constants'
import { formatDate, todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

const emptyForm = () => ({ event_type: null, date: todayISO(), sire: null, result: null, gestation_days: '', notes: '' })

export default function ReproductionEventsModal({ visible, animalId, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const animal = useSelector((s) => s.livestock.animals.find((a) => a.id === animalId))
  const males = useSelector((s) => s.livestock.animals.filter((a) => a.sex === 'MALE'))
  const externalMales = useSelector((s) => s.livestock.externals.filter((a) => a.sex === 'MALE'))
  const repro = (animal && animal.reproduction) || {}

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!animalId) return
    setLoading(true)
    try {
      const data = await dispatch(fetchReproductionEvents(animalId))
      setEvents(data)
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo cargar el historial'))
    } finally {
      setLoading(false)
    }
  }, [animalId, dispatch])

  useEffect(() => {
    if (visible) {
      setEvents([])
      setShowForm(false)
      setForm(emptyForm())
      setError('')
      load()
    }
  }, [visible, load])

  const needsSire = ['INSEMINATION', 'NATURAL_MATING'].includes(form.event_type)
  const isCheck = form.event_type === 'PREGNANCY_CHECK'

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.event_type || !form.date) return setError('Tipo y fecha son requeridos')
    if (isCheck && !form.result) return setError('El resultado del chequeo es requerido')
    setSaving(true)
    setError('')
    try {
      const payload = { event_type: form.event_type, date: form.date }
      if (form.notes.trim()) payload.notes = form.notes.trim()
      if (needsSire && form.sire) payload.sire = form.sire
      if (isCheck) {
        payload.result = form.result
        if (form.result === 'POSITIVE' && form.gestation_days) payload.gestation_days = Number(form.gestation_days)
      }
      await dispatch(createReproductionEvent({ animalId, data: payload }))
      setShowForm(false)
      setForm(emptyForm())
      onSaved && onSaved()
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo registrar el evento'))
    } finally {
      setSaving(false)
    }
  }

  // events siempre array (el thunk normaliza); desempate por created_at, no por
  // id (los id son UUID string desde la migración: `b.id - a.id` daba NaN).
  const sortedEvents = (Array.isArray(events) ? [...events] : []).sort(
    (a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
  )

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <IconButton icon="history" size={22} iconColor={theme.colors.primary} style={{ margin: 0 }} />
          <Text variant="titleMedium" style={styles.title}>
            Historial reproductivo
          </Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>
        <Divider />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Summary */}
          <View style={[styles.summary, { borderColor: theme.colors.outline }]}>
            <Text variant="titleSmall" style={styles.summaryName}>
              {animal?.name}
            </Text>
            <View style={styles.chips}>
              {repro.status ? (
                <Chip compact style={{ backgroundColor: reproStatusColor(repro.status) + '22' }} textStyle={{ color: reproStatusColor(repro.status) }}>
                  {repro.status_display}
                </Chip>
              ) : null}
              {repro.calf_at_side ? (
                <Chip compact icon="baby-bottle-outline">
                  Cría al pie
                </Chip>
              ) : null}
              {repro.open_days != null ? (
                <Text variant="bodySmall" style={styles.muted}>
                  {repro.open_days} días abiertos
                </Text>
              ) : null}
            </View>
          </View>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <View style={styles.eventsHeader}>
            <Text variant="labelLarge">Eventos</Text>
            <Button
              mode="contained-tonal"
              compact
              icon={showForm ? 'close' : 'plus'}
              onPress={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancelar' : 'Registrar evento'}
            </Button>
          </View>

          {showForm ? (
            <View style={[styles.form, { borderColor: theme.colors.outline }]}>
              <PickerField label="Tipo de evento *" value={form.event_type} options={EVENT_TYPE_OPTIONS} onChange={(v) => setField('event_type', v)} style={styles.field} />
              <DateField label="Fecha *" value={form.date} onChange={(v) => setField('date', v)} max={todayISO()} style={styles.field} />
              {needsSire ? (
                <PickerField
                  label="Toro / padre (opcional)"
                  value={form.sire}
                  options={[
                    ...males.map((a) => ({ label: a.name, value: a.id })),
                    ...externalMales.map((a) => ({ label: `${a.name} (externo)`, value: a.id })),
                  ]}
                  onChange={(v) => setField('sire', v)}
                  searchable
                  clearable
                  style={styles.field}
                />
              ) : null}
              {isCheck ? (
                <>
                  <PickerField label="Resultado *" value={form.result} options={RESULT_OPTIONS} onChange={(v) => setField('result', v)} style={styles.field} />
                  {form.result === 'POSITIVE' ? (
                    <TextInput
                      mode="outlined"
                      label="Días de gestación"
                      value={String(form.gestation_days || '')}
                      onChangeText={(t) => setField('gestation_days', t.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      style={styles.field}
                    />
                  ) : null}
                </>
              ) : null}
              <TextInput mode="outlined" label="Notas (opcional)" value={form.notes} onChangeText={(t) => setField('notes', t)} multiline style={styles.field} />
              <Button mode="contained" onPress={submit} loading={saving} disabled={saving}>
                Guardar evento
              </Button>
            </View>
          ) : null}

          {/* Timeline */}
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} />
          ) : sortedEvents.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyEvents}>
              Aún no hay eventos reproductivos registrados.
            </Text>
          ) : (
            sortedEvents.map((event) => {
              const meta = eventMeta(event.event_type)
              return (
                <View key={event.id} style={styles.eventRow}>
                  <Avatar.Icon size={34} icon={meta.icon} color="#fff" style={{ backgroundColor: meta.color }} />
                  <View style={styles.eventBody}>
                    <View style={styles.eventTitleRow}>
                      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                        {event.event_type_display || meta.label}
                      </Text>
                      {event.event_type === 'PREGNANCY_CHECK' && event.result ? (
                        <Chip compact textStyle={styles.smallChipText} style={{ backgroundColor: (event.result === 'POSITIVE' ? '#3E8E48' : '#B3402F') + '22' }}>
                          {event.result === 'POSITIVE' ? 'Positiva' : 'Negativa'}
                        </Chip>
                      ) : null}
                    </View>
                    <Text variant="bodySmall" style={styles.muted}>
                      {formatDate(event.date)}
                      {event.gestation_days ? ` · ${event.gestation_days} días gestación` : ''}
                      {event.sire_name ? ` · Toro: ${event.sire_name}` : ''}
                      {event.offspring_name ? ` · Cría: ${event.offspring_name}` : ''}
                    </Text>
                    {event.notes ? <Text variant="bodySmall">{event.notes}</Text> : null}
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, borderRadius: 20, maxHeight: '88%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, paddingVertical: 4, flexShrink: 0 },
  title: { flex: 1, fontWeight: '700', marginLeft: 4 },
  scroll: { flexShrink: 1 },
  body: { padding: 16 },
  summary: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: 'rgba(46,125,50,0.04)' },
  summaryName: { fontWeight: '700', fontStyle: 'italic', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  muted: { opacity: 0.7 },
  eventsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  form: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16, backgroundColor: 'rgba(46,125,50,0.03)' },
  field: { marginBottom: 12 },
  emptyEvents: { textAlign: 'center', opacity: 0.6, paddingVertical: 24 },
  eventRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  eventBody: { flex: 1 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallChipText: { fontSize: 11 },
})
