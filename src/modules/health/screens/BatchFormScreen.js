import React, { useState, useEffect, useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Text, TextInput, Button, Chip, HelperText, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { createItem, fetchState } from '@/modules/shared/store/sharedThunks'
import { crudRegistry } from '@/modules/shared/store/createCrudSlice'
import { fetchProtocols, fetchSchedules } from '@/modules/health/store/healthThunks'
import { isOnline } from '@/sync/connectivity'
import PickerField from '@/modules/shared/components/PickerField'
import DateTimeField from '@/modules/health/components/DateTimeField'
import AnimalMultiSelect from '@/modules/health/components/AnimalMultiSelect'
import { useToast } from '@/modules/shared/components/Toast'
import { getErrorMessage } from '@/api/errors'
import { todayISO } from '@/utils/format'

function addDays(dateISO, days) {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Jornada de protocolo: aplicar un protocolo (TREATMENT o REPRODUCTIVE/IATF) a
 * N animales de una vez. El backend crea N tratamientos con sus aplicaciones
 * (start_at + offsets del protocolo) y notifica UNA vez. Si viene de un
 * programado (route.params.scheduleId), llega prellenada y ejecutarla avanza
 * el ciclo. Offline: el POST va a la outbox (UUID idempotente).
 */
export default function BatchFormScreen({ navigation, route }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const scheduleId = route?.params?.scheduleId || null

  const protocols = useSelector((s) => s.health.protocols)
  const schedules = useSelector((s) => s.health.schedules)
  const lots = useSelector((s) => s.configuration.lots.filter((l) => l.is_active))
  const animals = useSelector((s) => s.livestock.animals)
  const schedule = useMemo(() => schedules.find((x) => String(x.id) === String(scheduleId)), [schedules, scheduleId])

  const [protocol, setProtocol] = useState(null)
  const [selected, setSelected] = useState([])
  const [startAt, setStartAt] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prefilled, setPrefilled] = useState(false)

  const selectedProtocol = useMemo(() => protocols.find((p) => p.id === protocol), [protocols, protocol])
  const femalesOnly = selectedProtocol?.protocol_type === 'REPRODUCTIVE'

  // Catálogos frescos (imperativo: los parpadeos de señal no re-disparan).
  useEffect(() => {
    ;(async () => {
      if (!(await isOnline())) return
      dispatch(fetchProtocols()).catch(() => {})
      if (!animals.length) dispatch(fetchState({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/' })).catch(() => {})
      if (!lots.length) dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' })).catch(() => {})
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prellenado desde el programado: protocolo + animales (del lote AL DÍA DE
  // HOY, o la lista fija). Solo una vez, cuando ya hay datos.
  useEffect(() => {
    if (!schedule || prefilled || !animals.length) return
    setProtocol(schedule.protocol)
    if (schedule.lot) {
      const proto = protocols.find((p) => p.id === schedule.protocol)
      const onlyF = proto?.protocol_type === 'REPRODUCTIVE'
      setSelected(
        animals
          .filter((a) => String(a.lot) === String(schedule.lot) && (!onlyF || a.sex === 'FEMALE'))
          .map((a) => a.id)
      )
    } else if (Array.isArray(schedule.animals)) {
      setSelected(schedule.animals)
    }
    setPrefilled(true)
  }, [schedule, animals, protocols, prefilled])

  async function submit() {
    if (!protocol) return setError('Elige un protocolo.')
    if (!selected.length) return setError('Selecciona al menos un animal.')
    if (!startAt) return setError('Indica fecha y hora de inicio.')
    setSaving(true)
    setError('')
    try {
      const data = { protocol, animals: selected, started_at: startAt }
      if (notes.trim()) data.notes = notes.trim()
      if (scheduleId) data.schedule = scheduleId
      await dispatch(createItem({ module: 'health', nameState: 'batches', url: '/reproduction/batches/', data }))

      // Recurrencia: el server avanza next_due al crear el batch. Online →
      // refrescar; offline → avanzar OPTIMISTA en Redux (el flush lo hará real).
      if (schedule) {
        if (await isOnline()) {
          dispatch(fetchSchedules()).catch(() => {})
        } else {
          crudRegistry.health &&
            dispatch(
              crudRegistry.health.UPDATE_ITEM({
                nameState: 'schedules',
                key: 'id',
                value: { ...schedule, next_due: addDays(todayISO(), schedule.every_days), _pending: true },
              })
            )
        }
      }

      toast(`Jornada creada: ${selected.length} tratamiento(s). Las aplicaciones quedan en la Agenda de sanidad.`)
      navigation.goBack()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo crear la jornada'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="labelSmall" style={styles.overline}>JORNADA DE PROTOCOLO</Text>
      <Text variant="headlineSmall" style={styles.title}>
        {schedule ? `Ejecutar: ${schedule.protocol_name}` : 'Aplicar protocolo'}
      </Text>
      {schedule ? (
        <Chip compact icon="calendar-sync" style={styles.schedChip}>
          Programado · cada {schedule.every_days} días{schedule.lot_name ? ` · ${schedule.lot_name}` : ''}
        </Chip>
      ) : (
        <Text variant="bodySmall" style={styles.muted}>
          Un tratamiento por animal; las aplicaciones se programan desde el inicio (IATF: la hora importa).
        </Text>
      )}

      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <PickerField
        label="Protocolo *"
        value={protocol}
        options={protocols.map((p) => ({ label: `${p.name} (${p.protocol_type === 'REPRODUCTIVE' ? 'reproductivo' : 'tratamiento'})`, value: p.id }))}
        onChange={(v) => {
          setProtocol(v)
          // Cambiar a reproductivo depura machos ya seleccionados.
          const proto = protocols.find((p) => p.id === v)
          if (proto?.protocol_type === 'REPRODUCTIVE') {
            const females = new Set(animals.filter((a) => a.sex === 'FEMALE').map((a) => a.id))
            setSelected((prev) => prev.filter((id) => females.has(id)))
          }
        }}
        style={styles.field}
      />

      <DateTimeField label="Inicio de la jornada *" value={startAt} onChange={setStartAt} style={styles.field} />

      <AnimalMultiSelect animals={animals} lots={lots} selected={selected} onChange={setSelected} femalesOnly={femalesOnly} />

      <TextInput mode="outlined" label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={[styles.field, styles.notes]} />

      <Button mode="contained" icon="check" onPress={submit} loading={saving} disabled={saving}>
        Crear jornada ({selected.length})
      </Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },
  overline: { letterSpacing: 1.2, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7, marginBottom: 10 },
  schedChip: { alignSelf: 'flex-start', marginVertical: 8 },
  field: { marginBottom: 12 },
  notes: { marginTop: 12 },
})
