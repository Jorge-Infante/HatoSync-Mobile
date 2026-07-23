import React, { useState, useMemo, useRef } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, TextInput, Button, Chip, IconButton, Divider, ProgressBar, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { createWeight, deleteWeight } from '@/modules/livestock/store/livestockThunks'
import PickerField from '@/modules/shared/components/PickerField'
import { useToast } from '@/modules/shared/components/Toast'
import { getErrorMessage } from '@/api/errors'
import { todayISO } from '@/utils/format'

/**
 * Jornada de pesaje: captura rápida en serie (animal + kg, N veces) — pensada
 * para la manga. Cada registro usa createWeight LOCAL-FIRST (funciona sin
 * señal; sube solo al reconectar). Filtro opcional por lote con progreso.
 */
export default function WeighingSessionScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()

  const animals = useSelector((s) => s.livestock.animals)
  const lots = useSelector((s) => s.configuration.lots.filter((l) => l.is_active))

  const [lot, setLot] = useState(null)
  const [animalId, setAnimalId] = useState(null)
  const [weight, setWeight] = useState('')
  const [session, setSession] = useState([]) // { key, animal, record }
  const [saving, setSaving] = useState(false)
  const weightRef = useRef(null)

  const byLot = useMemo(
    () => (lot ? animals.filter((a) => String(a.lot) === String(lot)) : animals),
    [animals, lot]
  )
  const weighedIds = useMemo(() => new Set(session.map((s) => s.animal.id)), [session])
  const remaining = useMemo(() => byLot.filter((a) => !weighedIds.has(a.id)), [byLot, weighedIds])

  async function add() {
    const animal = animals.find((a) => a.id === animalId)
    if (!animal) return toast('Elige un animal', 'error')
    const kg = Number(String(weight).replace(',', '.'))
    if (!weight.trim() || Number.isNaN(kg) || kg <= 0) return toast('Peso inválido', 'error')
    setSaving(true)
    try {
      const record = await dispatch(createWeight({ animalId: animal.id, data: { date: todayISO(), weight_kg: String(kg) } }))
      setSession((prev) => [{ key: record.id, animal, record }, ...prev])
      setAnimalId(null)
      setWeight('')
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo registrar el peso'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove(entry) {
    try {
      await dispatch(deleteWeight({ animalId: entry.animal.id, weightId: entry.record.id }))
      setSession((prev) => prev.filter((s) => s.key !== entry.key))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar'), 'error')
    }
  }

  const progress = lot && byLot.length ? session.filter((s) => String(s.animal.lot) === String(lot)).length / byLot.length : null

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={session}
        keyExtractor={(item) => String(item.key)}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="labelSmall" style={styles.overline}>JORNADA DE PESAJE</Text>
            <Text variant="headlineSmall" style={styles.title}>Pesar en serie</Text>
            <Text variant="bodySmall" style={styles.muted}>
              Funciona sin señal: cada pesaje queda guardado y sube solo al reconectar.
            </Text>

            <PickerField
              label="Lote (opcional)"
              value={lot}
              options={lots.map((l) => ({ label: l.name, value: l.id }))}
              onChange={(v) => setLot(v)}
              clearable
              style={styles.field}
            />
            {progress != null ? (
              <View style={styles.progressWrap}>
                <ProgressBar progress={progress} style={styles.progress} />
                <Text variant="bodySmall" style={styles.muted}>
                  {session.filter((s) => String(s.animal.lot) === String(lot)).length} de {byLot.length} del lote pesados
                </Text>
              </View>
            ) : null}

            <PickerField
              label="Animal *"
              value={animalId}
              options={remaining.map((a) => ({ label: `${a.name}${a.lot_name ? ` · ${a.lot_name}` : ''}`, value: a.id }))}
              onChange={(v) => {
                setAnimalId(v)
                // Foco directo al peso: flujo manga (animal → kg → agregar → repite).
                setTimeout(() => weightRef.current && weightRef.current.focus(), 250)
              }}
              searchable
              noDataText={lot ? 'Todos los del lote ya están pesados' : 'Sin animales'}
              style={styles.field}
            />
            <View style={styles.row}>
              <TextInput
                ref={weightRef}
                mode="outlined"
                label="Peso (kg) *"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                left={<TextInput.Icon icon="scale" />}
                style={styles.weightInput}
                onSubmitEditing={add}
              />
              <Button mode="contained" icon="plus" onPress={add} loading={saving} disabled={saving} style={styles.addBtn}>
                Agregar
              </Button>
            </View>

            {session.length ? (
              <View style={styles.sessionHeader}>
                <Text variant="labelLarge">Sesión ({session.length})</Text>
                <Chip compact icon="scale">{session.reduce((sum, s) => sum + Number(s.record.weight_kg), 0).toFixed(0)} kg total</Chip>
              </View>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={Divider}
        renderItem={({ item }) => (
          <View style={styles.rowItem}>
            <View style={styles.flex}>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{item.animal.name}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                {Number(item.record.weight_kg)} kg{item.record._pending ? ' · por subir' : ''}
              </Text>
            </View>
            <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => remove(item)} />
          </View>
        )}
        ListEmptyComponent={
          <Text variant="bodySmall" style={[styles.muted, styles.empty]}>
            Los pesajes de esta sesión aparecerán aquí.
          </Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, flexGrow: 1 },
  header: { marginBottom: 4 },
  overline: { letterSpacing: 1.2, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  field: { marginTop: 12 },
  progressWrap: { marginTop: 8, gap: 4 },
  progress: { height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  weightInput: { flex: 1 },
  addBtn: {},
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  empty: { textAlign: 'center', paddingVertical: 18 },
})
