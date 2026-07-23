import React, { useState, useEffect, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { TextInput, HelperText, Text, SegmentedButtons } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import DateField from '@/modules/shared/components/DateField'
import AnimalMultiSelect from '@/modules/health/components/AnimalMultiSelect'
import { createItem, updateItem, fetchState } from '@/modules/shared/store/sharedThunks'
import { fetchProtocols } from '@/modules/health/store/healthThunks'
import { todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

/**
 * Crear/editar un programado recurrente (avisar-y-ejecutar): protocolo +
 * objetivo (lote O animales fijos) + cada N días + primera fecha.
 */
export default function ScheduleFormModal({ visible, schedule, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!schedule
  const protocols = useSelector((s) => s.health.protocols)
  const lots = useSelector((s) => s.configuration.lots.filter((l) => l.is_active))
  const animals = useSelector((s) => s.livestock.animals)

  const [protocol, setProtocol] = useState(null)
  const [targetMode, setTargetMode] = useState('lot') // 'lot' | 'animals'
  const [lot, setLot] = useState(null)
  const [selectedAnimals, setSelectedAnimals] = useState([])
  const [everyDays, setEveryDays] = useState('90')
  const [nextDue, setNextDue] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedProtocol = useMemo(() => protocols.find((p) => p.id === protocol), [protocols, protocol])
  const femalesOnly = selectedProtocol?.protocol_type === 'REPRODUCTIVE'

  useEffect(() => {
    if (!visible) return
    setProtocol(schedule?.protocol || null)
    setTargetMode(schedule?.lot ? 'lot' : schedule?.animals?.length ? 'animals' : 'lot')
    setLot(schedule?.lot || null)
    setSelectedAnimals(schedule?.animals || [])
    setEveryDays(String(schedule?.every_days || 90))
    setNextDue(schedule?.next_due || todayISO())
    setNotes(schedule?.notes || '')
    setError('')
    if (!protocols.length) dispatch(fetchProtocols()).catch(() => {})
    if (!lots.length) dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' })).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, schedule])

  async function submit() {
    if (!protocol) return setError('Elige un protocolo.')
    const days = Number(everyDays)
    if (!days || days < 1) return setError('La periodicidad debe ser al menos 1 día.')
    if (!nextDue) return setError('Indica la primera fecha.')
    if (targetMode === 'lot' && !lot) return setError('Elige el lote objetivo.')
    if (targetMode === 'animals' && !selectedAnimals.length) return setError('Selecciona al menos un animal.')
    setSaving(true)
    setError('')
    try {
      const data = {
        protocol,
        every_days: days,
        next_due: nextDue,
        lot: targetMode === 'lot' ? lot : null,
        animals: targetMode === 'animals' ? selectedAnimals : [],
        notes: notes.trim(),
      }
      if (isEdit) {
        await dispatch(updateItem({ module: 'health', nameState: 'schedules', url: `/health/schedules/${schedule.id}/`, data }))
      } else {
        await dispatch(createItem({ module: 'health', nameState: 'schedules', url: '/health/schedules/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el programado'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar programado' : 'Nuevo programado'}
      icon={isEdit ? 'pencil-outline' : 'calendar-sync'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear programado'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      <Text variant="bodySmall" style={styles.hint}>
        El sistema avisa cuando vence; la jornada se ejecuta desde la app y eso reinicia el ciclo.
      </Text>

      <PickerField
        label="Protocolo *"
        value={protocol}
        options={protocols.map((p) => ({ label: `${p.name} (${p.protocol_type === 'REPRODUCTIVE' ? 'reproductivo' : 'tratamiento'})`, value: p.id }))}
        onChange={setProtocol}
        style={styles.field}
      />

      <SegmentedButtons
        value={targetMode}
        onValueChange={setTargetMode}
        buttons={[
          { value: 'lot', label: 'Por lote' },
          { value: 'animals', label: 'Animales fijos' },
        ]}
        style={styles.field}
      />

      {targetMode === 'lot' ? (
        <>
          <PickerField
            label="Lote objetivo *"
            value={lot}
            options={lots.map((l) => ({ label: l.name, value: l.id }))}
            onChange={setLot}
            style={styles.field}
          />
          <Text variant="bodySmall" style={styles.hint}>
            Al ejecutar, la jornada se prellenará con los animales que estén en el lote ese día.
          </Text>
        </>
      ) : (
        <AnimalMultiSelect
          animals={animals}
          lots={lots}
          selected={selectedAnimals}
          onChange={setSelectedAnimals}
          femalesOnly={femalesOnly}
        />
      )}

      <TextInput
        mode="outlined"
        label="Cada cuántos días *"
        value={everyDays}
        onChangeText={(v) => setEveryDays(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        left={<TextInput.Icon icon="calendar-sync" />}
        style={styles.field}
      />
      <DateField label="Primera fecha *" value={nextDue} onChange={setNextDue} style={styles.field} />
      <TextInput mode="outlined" label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={styles.field} />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  hint: { opacity: 0.7, marginBottom: 10 },
  field: { marginBottom: 12 },
})
