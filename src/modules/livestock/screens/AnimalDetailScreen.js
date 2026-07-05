import React, { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import {
  Text,
  Card,
  Chip,
  Button,
  SegmentedButtons,
  Avatar,
  ActivityIndicator,
  Divider,
  IconButton,
  useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState } from '@/modules/shared/store/sharedThunks'
import { fetchAnimalFull, deleteWeight } from '@/modules/livestock/store/livestockThunks'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import { reproStatusColor, eventMeta } from '@/modules/livestock/constants'
import { formatDate, formatAge } from '@/utils/format'
import AnimalGallery from '@/modules/livestock/components/AnimalGallery'
import AnimalFormModal from '@/modules/livestock/components/AnimalFormModal'
import RegisterBirthModal from '@/modules/livestock/components/RegisterBirthModal'
import WeanModal from '@/modules/livestock/components/WeanModal'
import ReproductionEventsModal from '@/modules/livestock/components/ReproductionEventsModal'
import GenealogyModal from '@/modules/livestock/components/GenealogyModal'
import WeightFormModal from '@/modules/livestock/components/WeightFormModal'
import WeightChart from '@/modules/livestock/components/WeightChart'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'

// Comparativa de respaldo calculada client-side: los pesajes creados offline
// aún no traen previous_weight_kg/diff_kg del servidor. Con datos online el
// resultado coincide con el derivado del backend.
function weightsWithDiffs(records) {
  const asc = [...records].sort((a, b) =>
    a.date === b.date
      ? String(a.created_at || '').localeCompare(String(b.created_at || ''))
      : a.date < b.date
        ? -1
        : 1
  )
  let prev = null
  const out = []
  for (const r of asc) {
    const kg = Number(r.weight_kg)
    out.push({ ...r, previous_weight_kg: prev, diff_kg: prev == null ? null : Math.round((kg - prev) * 100) / 100 })
    prev = kg
  }
  return out.reverse()
}

export default function AnimalDetailScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const animalId = route.params.id
  const herd = useSelector((s) => s.livestock.animals)

  const [animal, setAnimal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('ficha')

  const [editVisible, setEditVisible] = useState(false)
  const [birthVisible, setBirthVisible] = useState(false)
  const [weanVisible, setWeanVisible] = useState(false)
  const [eventsVisible, setEventsVisible] = useState(false)
  const [genealogyVisible, setGenealogyVisible] = useState(false)
  const [weightVisible, setWeightVisible] = useState(false)
  const [weightToDelete, setWeightToDelete] = useState(null)
  const [deletingWeight, setDeletingWeight] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await dispatch(fetchAnimalFull(animalId))
      setAnimal(data)
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo cargar el detalle del animal'))
    } finally {
      setLoading(false)
    }
  }, [animalId, dispatch])

  useEffect(() => {
    setTab('ficha')
    load()
    // herd + externals needed for sire/mother pickers in the reused modals
    if (!herd.length) {
      dispatch(fetchState({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/' })).catch(() => {})
    }
    dispatch(fetchState({ module: 'livestock', nameState: 'externals', url: '/livestock/animals/', params: { external: true } })).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }
  if (error || !animal) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Avatar.Icon size={56} icon="alert-circle-outline" color="#fff" style={{ backgroundColor: theme.colors.error }} />
        <Text variant="bodyMedium" style={styles.muted}>
          {error || 'No encontrado'}
        </Text>
        <Button mode="contained-tonal" onPress={load}>
          Reintentar
        </Button>
      </View>
    )
  }

  const isFemale = animal.sex === 'FEMALE'
  const repro = animal.reproduction || {}
  const events = animal.reproductive_events || []
  const offspring = animal.offspring || []
  const weights = weightsWithDiffs(animal.weight_records || [])
  const age = formatAge(animal.birth_date)

  const statTiles = []
  statTiles.push({ label: 'Edad', value: age })
  if (isFemale) {
    statTiles.push({ label: 'Partos', value: animal.births_count ?? 0 })
    if (repro.open_days != null) statTiles.push({ label: 'Días abiertos', value: repro.open_days })
  } else {
    statTiles.push({ label: 'Crías', value: animal.offspring_count ?? 0 })
  }
  statTiles.push({ label: 'Descendientes', value: offspring.length })

  const tabs = [
    { value: 'ficha', label: 'Ficha' },
    ...(isFemale ? [{ value: 'repro', label: 'Reprod.' }] : []),
    { value: 'offspring', label: 'Descend.' },
    { value: 'peso', label: 'Peso' },
  ]

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
        <AnimalGallery photos={animal.photos || []} fallbackIcon={isFemale ? 'gender-female' : 'gender-male'} />

        {/* Identity */}
        <View style={styles.identity}>
          <Text variant="labelSmall" style={styles.overline}>
            {(animal.breed_name || 'Ficha del animal').toUpperCase()}
          </Text>
          <Text variant="headlineSmall" style={styles.name}>
            {animal.name}
          </Text>

          <View style={styles.chips}>
            <Chip compact icon={isFemale ? 'gender-female' : 'gender-male'}>
              {animal.sex_display}
            </Chip>
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
            {animal.is_external ? (
              <Chip compact icon="dna">
                Genética externa
              </Chip>
            ) : null}
            {!animal.is_active ? (
              <Chip compact textStyle={{ color: theme.colors.error }}>
                Inactivo
              </Chip>
            ) : null}
            {(animal.identifications || []).map((id) => (
              <Chip key={id.id} compact icon="tag-outline" mode="outlined">
                {id.identification_type_name} {id.value}
              </Chip>
            ))}
          </View>

          {/* Parents */}
          <View style={styles.parents}>
            <View style={styles.parentCol}>
              <Text variant="labelSmall" style={styles.miniLabel}>
                MADRE
              </Text>
              {animal.mother ? (
                <Pressable onPress={() => navigation.push('AnimalDetail', { id: animal.mother })}>
                  <Text style={[styles.link, { color: theme.colors.primary }]}>{animal.mother_name || 'Ver madre'}</Text>
                </Pressable>
              ) : (
                <Text style={styles.muted}>—</Text>
              )}
            </View>
            <View style={styles.parentCol}>
              <Text variant="labelSmall" style={styles.miniLabel}>
                PADRE
              </Text>
              {animal.father ? (
                <Pressable onPress={() => navigation.push('AnimalDetail', { id: animal.father })}>
                  <Text style={[styles.link, { color: theme.colors.primary }]}>{animal.father_name || 'Ver padre'}</Text>
                </Pressable>
              ) : (
                <Text style={styles.muted}>—</Text>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button mode="contained-tonal" compact icon="pencil-outline" onPress={() => setEditVisible(true)}>
              Editar
            </Button>
            <Button mode="contained-tonal" compact icon="family-tree" onPress={() => setGenealogyVisible(true)}>
              Genealogía
            </Button>
            {isFemale ? (
              <Button mode="contained-tonal" compact icon="baby-bottle-outline" onPress={() => setBirthVisible(true)}>
                Parto
              </Button>
            ) : null}
            {isFemale ? (
              <Button mode="contained-tonal" compact icon="link-variant-off" disabled={!repro.calf_at_side} onPress={() => setWeanVisible(true)}>
                Destetar
              </Button>
            ) : null}
          </View>
        </View>

        {/* Stat tiles */}
        <View style={styles.stats}>
          {statTiles.slice(0, 4).map((tile) => (
            <Card key={tile.label} style={styles.statCard} mode="outlined">
              <Card.Content>
                <Text variant="labelSmall" style={styles.statLabel}>
                  {tile.label.toUpperCase()}
                </Text>
                <Text variant="titleLarge" style={styles.statValue}>
                  {tile.value}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Tabs */}
        <SegmentedButtons value={tab} onValueChange={setTab} buttons={tabs} style={styles.segmented} />

        {tab === 'ficha' ? (
          <Card mode="outlined" style={styles.tabCard}>
            <Card.Content>
              <Row label="Sexo" value={animal.sex_display} />
              <Row label="Nacimiento" value={formatDate(animal.birth_date)} />
              <Row label="Edad" value={age} />
              <Row label="Raza" value={animal.breed_name || '—'} />
              <Row
                label="Identificación"
                value={(animal.identifications || []).length ? animal.identifications.map((id) => `${id.identification_type_name}: ${id.value}`).join('   ') : '—'}
              />
              <Row label="Estado" value={animal.is_active ? 'Activo' : 'Inactivo'} last />
            </Card.Content>
          </Card>
        ) : null}

        {tab === 'repro' ? (
          <Card mode="outlined" style={styles.tabCard}>
            <Card.Content>
              <View style={styles.reproGrid}>
                <ReproCell label="Estado" value={repro.status_display || '—'} color={repro.status ? reproStatusColor(repro.status) : undefined} />
                <ReproCell label="Días abiertos" value={repro.open_days != null ? String(repro.open_days) : '—'} />
                <ReproCell label="Concepción" value={formatDate(repro.conception_date)} sub={repro.conception_source === 'SERVICE' ? 'Servicio' : repro.conception_source === 'ESTIMATED' ? 'Estimado' : ''} />
                <ReproCell label="Parto probable" value={formatDate(repro.expected_due_date)} />
              </View>
              <Divider style={styles.divider} />
              <View style={styles.reproHeader}>
                <Text variant="labelLarge">Historial</Text>
                <Button mode="contained-tonal" compact icon="plus" onPress={() => setEventsVisible(true)}>
                  Registrar evento
                </Button>
              </View>
              {events.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptyInline}>
                  Aún no hay eventos reproductivos.
                </Text>
              ) : (
                events.map((event) => {
                  const meta = eventMeta(event.event_type)
                  return (
                    <View key={event.id} style={styles.eventRow}>
                      <Avatar.Icon size={32} icon={meta.icon} color="#fff" style={{ backgroundColor: meta.color }} />
                      <View style={styles.flex}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                          {event.event_type_display || meta.label}
                        </Text>
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
            </Card.Content>
          </Card>
        ) : null}

        {tab === 'offspring' ? (
          <Card mode="outlined" style={styles.tabCard}>
            <Card.Content>
              {offspring.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptyInline}>
                  Sin descendencia registrada.
                </Text>
              ) : (
                offspring.map((child) => (
                  <Pressable key={child.id} onPress={() => navigation.push('AnimalDetail', { id: child.id })} style={styles.childRow}>
                    <Avatar.Icon
                      size={40}
                      icon={child.sex === 'FEMALE' ? 'gender-female' : 'gender-male'}
                      color="#fff"
                      style={{ backgroundColor: child.sex === 'FEMALE' ? theme.colors.primary : theme.colors.tertiary }}
                    />
                    <View style={styles.flex}>
                      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                        {child.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.muted}>
                        {child.sex_display} · {formatDate(child.birth_date)}
                      </Text>
                    </View>
                    <IconButton icon="chevron-right" size={20} />
                  </Pressable>
                ))
              )}
            </Card.Content>
          </Card>
        ) : null}

        {tab === 'peso' ? (
          <Card mode="outlined" style={styles.tabCard}>
            <Card.Content>
              <View style={styles.reproHeader}>
                <Text variant="labelLarge">Control de peso</Text>
                <Button mode="contained-tonal" compact icon="plus" onPress={() => setWeightVisible(true)}>
                  Registrar peso
                </Button>
              </View>
              {weights.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptyInline}>
                  Aún no hay pesajes registrados.
                </Text>
              ) : null}
              {/* Curva de peso: con un solo pesaje no hay tendencia que graficar */}
              {weights.length >= 2 ? <WeightChart records={weights} /> : null}
              {weights.map((record) => {
                  const diff = record.diff_kg
                  const diffColor = diff == null ? undefined : diff > 0 ? theme.colors.primary : diff < 0 ? theme.colors.error : undefined
                  const diffLabel =
                    diff == null
                      ? 'Primer registro'
                      : diff > 0
                        ? `▲ Subió ${diff} kg`
                        : diff < 0
                          ? `▼ Bajó ${Math.abs(diff)} kg`
                          : '= Sin cambio'
                  return (
                    <View key={record.id} style={styles.eventRow}>
                      <Avatar.Icon size={32} icon="scale" color="#fff" style={{ backgroundColor: theme.colors.secondary }} />
                      <View style={styles.flex}>
                        <View style={styles.weightRow}>
                          <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                            {Number(record.weight_kg)} kg
                          </Text>
                          <Text variant="bodySmall" style={diffColor ? { color: diffColor, fontWeight: '600' } : styles.muted}>
                            {diffLabel}
                          </Text>
                        </View>
                        <Text variant="bodySmall" style={styles.muted}>
                          {formatDate(record.date)}
                          {record.recorded_by_name ? ` · Registró: ${record.recorded_by_name}` : ''}
                          {record._pending ? ' · Por subir' : ''}
                        </Text>
                        {record.notes ? <Text variant="bodySmall">{record.notes}</Text> : null}
                      </View>
                      <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => setWeightToDelete(record)} />
                    </View>
                  )
                })}
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>

      {/* Modals (reload dossier after changes) */}
      <AnimalFormModal visible={editVisible} animal={animal} onDismiss={() => setEditVisible(false)} onSaved={() => { toast('Animal actualizado'); load() }} />
      <RegisterBirthModal visible={birthVisible} mother={animal} onDismiss={() => setBirthVisible(false)} onSaved={() => { toast('Parto registrado'); load() }} />
      <WeanModal visible={weanVisible} mother={animal} onDismiss={() => setWeanVisible(false)} onSaved={() => { toast('Destete registrado'); load() }} />
      <ReproductionEventsModal visible={eventsVisible} animalId={animal.id} onDismiss={() => setEventsVisible(false)} onSaved={() => load()} />
      <GenealogyModal visible={genealogyVisible} animal={animal} onDismiss={() => setGenealogyVisible(false)} />
      <WeightFormModal
        visible={weightVisible}
        animal={animal}
        onDismiss={() => setWeightVisible(false)}
        onSaved={({ record }) => {
          toast(`Peso registrado: ${Number(record.weight_kg)} kg`)
          load()
        }}
      />
      <ConfirmDialog
        visible={!!weightToDelete}
        onDismiss={() => setWeightToDelete(null)}
        onConfirm={async () => {
          setDeletingWeight(true)
          try {
            await dispatch(deleteWeight({ animalId: animal.id, weightId: weightToDelete.id }))
            toast('Pesaje eliminado')
            setWeightToDelete(null)
            load()
          } catch (e) {
            toast(getErrorMessage(e, 'No se pudo eliminar el pesaje'), 'error')
          } finally {
            setDeletingWeight(false)
          }
        }}
        loading={deletingWeight}
        title="¿Eliminar pesaje?"
        confirmLabel="Eliminar"
        message={`Se eliminará el registro de ${weightToDelete ? Number(weightToDelete.weight_kg) : ''} kg del ${weightToDelete ? formatDate(weightToDelete.date) : ''}. La comparativa se recalculará.`}
      />
    </View>
  )
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.dlRow, last && { borderBottomWidth: 0 }]}>
      <Text variant="labelSmall" style={styles.dlLabel}>
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyMedium" style={styles.dlValue}>
        {value}
      </Text>
    </View>
  )
}

function ReproCell({ label, value, sub, color }) {
  return (
    <View style={styles.reproCell}>
      <Text variant="labelSmall" style={styles.miniLabel}>
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyMedium" style={color ? { color, fontWeight: '600' } : undefined}>
        {value}
      </Text>
      {sub ? (
        <Text variant="bodySmall" style={styles.muted}>
          {sub}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  content: { padding: 16, paddingBottom: 40 },
  identity: { marginTop: 16 },
  overline: { letterSpacing: 1.2, opacity: 0.6, color: '#2E7D32' },
  name: { fontWeight: '700', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  parents: { flexDirection: 'row', gap: 32, marginTop: 16 },
  parentCol: {},
  miniLabel: { letterSpacing: 1, opacity: 0.6, color: '#2E7D32', marginBottom: 2 },
  link: { fontWeight: '600' },
  muted: { opacity: 0.7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  statCard: { flexGrow: 1, minWidth: '46%' },
  statLabel: { letterSpacing: 1, opacity: 0.5 },
  statValue: { fontWeight: '700', marginTop: 2 },
  segmented: { marginTop: 20 },
  tabCard: { marginTop: 12 },
  dlRow: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,82,51,0.1)' },
  dlLabel: { letterSpacing: 0.5, opacity: 0.5, marginBottom: 2 },
  dlValue: {},
  reproGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  reproCell: { width: '50%', marginBottom: 14 },
  divider: { marginVertical: 8 },
  reproHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  emptyInline: { textAlign: 'center', opacity: 0.6, paddingVertical: 20 },
  eventRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
})
