import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Card, Text, Chip, Avatar, Searchbar, ActivityIndicator, Banner, FAB, useTheme } from 'react-native-paper'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { isOnline } from '@/sync/connectivity'
import { selectIsPartner } from '@/modules/auth/roleSelectors'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import { reproChips } from '@/modules/livestock/constants'
import { formatAge, animalThumb, MEDIA_HEADERS } from '@/utils/format'
import AnimalActionsMenu from '@/modules/livestock/components/AnimalActionsMenu'
import WeightFormModal from '@/modules/livestock/components/WeightFormModal'
import AnimalFormModal from '@/modules/livestock/components/AnimalFormModal'
import WeanModal from '@/modules/livestock/components/WeanModal'
import ReproductionEventsModal from '@/modules/livestock/components/ReproductionEventsModal'
import GenealogyModal from '@/modules/livestock/components/GenealogyModal'
import InactivateAnimalModal from '@/modules/livestock/components/InactivateAnimalModal'
import TreatmentFormModal from '@/modules/health/components/TreatmentFormModal'

export default function AnimalListScreen({ navigation, route }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const animals = useSelector((s) => s.livestock.animals)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  // Socio: solo consulta sus animales asignados — sin FAB ni menú de acciones.
  const isPartner = useSelector(selectIsPartner)
  // Vista filtrada por lote: la pantalla LotAnimals reusa este componente con
  // route.params.lotId ('none' = sin lote). En la ruta normal es undefined.
  const lotId = route?.params?.lotId || null
  const lotName = route?.params?.lotName || 'Lote'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // dialog state — form maneja crear/editar Y el modo parto (birthMother)
  const [form, setForm] = useState({ visible: false, animal: null, birthMother: null })
  const [wean, setWean] = useState({ visible: false, mother: null })
  const [events, setEvents] = useState({ visible: false, animalId: null })
  const [genealogy, setGenealogy] = useState({ visible: false, animal: null })
  const [weight, setWeight] = useState({ visible: false, animal: null })
  const [treatment, setTreatment] = useState({ visible: false, animal: null })
  const [inactivate, setInactivate] = useState({ visible: false, animal: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setError('')
    // isOnline() IMPERATIVO (no el hook reactivo): con señal intermitente el
    // estado online parpadea y un `online` en las deps re-disparaba este load
    // en cada parpadeo — el spinner de pantalla completa desmontaba el modal
    // del formulario (se perdía lo escrito) y el refetch pisaba la lista.
    // La subida de lo pendiente la maneja SyncProvider al reconectar.
    if (!(await isOnline())) return // offline: data already hydrated from the local cache
    try {
      // Externals (genética externa) feed the parent/sire pickers of the modals
      await Promise.all([
        dispatch(fetchState({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/' })),
        dispatch(fetchState({ module: 'livestock', nameState: 'externals', url: '/livestock/animals/', params: { external: true } })),
      ])
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los animales'))
    }
  }, [dispatch])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, activeFarmId])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  // Título del header = nombre del lote en la vista filtrada.
  useEffect(() => {
    if (lotId) navigation.setOptions({ title: lotName })
  }, [lotId, lotName, navigation])

  // Base del hato según el lote (o todo el hato en la vista normal).
  const byLot = useMemo(() => {
    if (!lotId) return animals
    if (lotId === 'none') return animals.filter((a) => !a.lot)
    return animals.filter((a) => String(a.lot) === String(lotId))
  }, [animals, lotId])

  const females = useMemo(() => byLot.filter((a) => a.sex === 'FEMALE'), [byLot])
  const males = useMemo(() => byLot.filter((a) => a.sex === 'MALE'), [byLot])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return byLot
    return byLot.filter((a) =>
      [a.name, a.mother_name, a.father_name].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    )
  }, [byLot, search])

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(deleteItem({ module: 'livestock', nameState: 'animals', url: `/livestock/animals/${toDelete.id}/`, value: toDelete.id }))
      toast('Animal eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el animal'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  function renderItem({ item }) {
    const thumb = animalThumb(item)
    const repro = item.reproduction
    return (
      <Card style={styles.card} mode="outlined" onPress={() => navigation.navigate('AnimalDetail', { id: item.id })}>
        <Card.Content style={styles.cardContent}>
          {thumb ? (
            // expo-image: caché en disco + decode al tamaño del avatar (no la foto entera)
            <Image
              source={{ uri: thumb, headers: MEDIA_HEADERS }}
              style={styles.thumb}
              contentFit="cover"
              transition={100}
            />
          ) : (
            <Avatar.Icon
              size={48}
              icon={item.sex === 'FEMALE' ? 'gender-female' : 'gender-male'}
              color="#fff"
              style={{ backgroundColor: item.sex === 'FEMALE' ? theme.colors.primary : theme.colors.tertiary }}
            />
          )}
          <View style={styles.cardBody}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {item.sex_display} · {formatAge(item.birth_date)}
            </Text>
            <View style={styles.metaRow}>
              {reproChips(repro).map((chip) => (
                <Chip
                  key={chip.key}
                  compact
                  style={[styles.reproChip, { backgroundColor: chip.color + '22' }]}
                  textStyle={{ color: chip.color, fontSize: 11 }}
                >
                  {chip.label}
                </Chip>
              ))}
              {item.mother_name ? (
                <Text variant="bodySmall" style={styles.muted}>
                  ♀ {item.mother_name}
                </Text>
              ) : null}
            </View>
          </View>
          {isPartner ? null : (
          <AnimalActionsMenu
            animal={item}
            onDetail={(a) => navigation.navigate('AnimalDetail', { id: a.id })}
            onEdit={(a) => setForm({ visible: true, animal: a, birthMother: null })}
            onDelete={(a) => setToDelete(a)}
            onBirth={(a) => setForm({ visible: true, animal: null, birthMother: a })}
            onWean={(a) => setWean({ visible: true, mother: a })}
            onEvents={(a) => setEvents({ visible: true, animalId: a.id })}
            onGenealogy={(a) => setGenealogy({ visible: true, animal: a })}
            onWeight={(a) => setWeight({ visible: true, animal: a })}
            onTreatment={(a) => setTreatment({ visible: true, animal: a })}
            onInactivate={(a) => setInactivate({ visible: true, animal: a })}
          />
          )}
        </Card.Content>
      </Card>
    )
  }

  // Spinner de pantalla completa SOLO sin datos (primer arranque). Si ya hay
  // lista, el refetch es silencioso: este early-return desmontaba los modales
  // (el formulario abierto perdía todo lo escrito al parpadear la señal).
  if (loading && animals.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {error ? (
        <Banner visible icon="alert-circle-outline" actions={[{ label: 'Reintentar', onPress: onRefresh }]}>
          {error}
        </Banner>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Searchbar
              placeholder="Buscar por nombre, madre o padre…"
              value={search}
              onChangeText={setSearch}
              style={styles.searchbar}
            />
            <View style={styles.counters}>
              <Chip compact icon="cow" style={styles.counterChip}>
                {byLot.length} total
              </Chip>
              <Chip compact icon="gender-female" style={styles.counterChip}>
                {females.length} hembras
              </Chip>
              <Chip compact icon="gender-male" style={styles.counterChip}>
                {males.length} machos
              </Chip>
            </View>
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.center}>
              <Avatar.Icon size={64} icon="cow-off" color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {search ? 'Sin coincidencias' : isPartner ? 'Aún no tienes animales asociados' : 'Tu hato está vacío'}
              </Text>
              <Text variant="bodyMedium" style={styles.muted}>
                {search
                  ? `Ningún animal coincide con «${search}».`
                  : isPartner
                    ? 'Cuando un administrador te asigne animales, aparecerán aquí.'
                    : 'Registra tu primer animal con el botón +.'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Identificación por chapeta QR: leer el QR y saltar a la ficha.
          Visible para TODOS los roles (el socio también identifica en campo). */}
      <FAB
        icon="qrcode-scan"
        size="small"
        mode="flat"
        style={[styles.scanFab, { bottom: (isPartner ? 16 : 76) + insets.bottom }]}
        onPress={() => navigation.navigate('ScanTag')}
      />
      {isPartner ? null : (
        <FAB icon="plus" label="Nuevo" style={[styles.fab, { bottom: 16 + insets.bottom }]} onPress={() => setForm({ visible: true, animal: null, birthMother: null })} />
      )}

      {/* Modals — AnimalFormModal cubre crear/editar Y el modo parto */}
      <AnimalFormModal
        visible={form.visible}
        animal={form.animal}
        birthMother={form.birthMother}
        prefill={lotId && lotId !== 'none' ? { lot: lotId } : undefined}
        onDismiss={() => setForm({ visible: false, animal: null, birthMother: null })}
        onSaved={({ isEdit, birth: isBirth, calfName }) => {
          if (isBirth) toast(calfName ? `Parto registrado · ${calfName} añadido al hato` : 'Parto registrado')
          else toast(isEdit ? 'Animal actualizado' : 'Animal registrado')
        }}
      />
      <WeanModal
        visible={wean.visible}
        mother={wean.mother}
        onDismiss={() => setWean({ visible: false, mother: null })}
        onSaved={() => toast('Destete registrado')}
      />
      <ReproductionEventsModal
        visible={events.visible}
        animalId={events.animalId}
        onDismiss={() => setEvents({ visible: false, animalId: null })}
        onSaved={() => toast('Evento reproductivo registrado')}
      />
      <GenealogyModal
        visible={genealogy.visible}
        animal={genealogy.animal}
        onDismiss={() => setGenealogy({ visible: false, animal: null })}
      />
      <WeightFormModal
        visible={weight.visible}
        animal={weight.animal}
        onDismiss={() => setWeight({ visible: false, animal: null })}
        onSaved={({ animal: a, record }) => toast(`Peso de ${a.name} registrado: ${record.weight_kg} kg`)}
      />
      <TreatmentFormModal
        visible={treatment.visible}
        animal={treatment.animal}
        onDismiss={() => setTreatment({ visible: false, animal: null })}
        onSaved={() => toast('Tratamiento creado')}
      />

      <InactivateAnimalModal
        visible={inactivate.visible}
        animal={inactivate.animal}
        onDismiss={() => setInactivate({ visible: false, animal: null })}
        onSaved={({ animal: a }) => toast(`${a.name} salió del hato`)}
      />

      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar animal?"
        message={`Se eliminará ${toDelete?.name || ''} del inventario. Esta acción no se puede deshacer.`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  list: { padding: 12, paddingBottom: 96, flexGrow: 1 },
  header: { marginBottom: 8 },
  searchbar: { marginBottom: 10 },
  counters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  counterChip: {},
  card: { marginBottom: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  name: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  reproChip: { alignSelf: 'flex-start' },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  scanFab: { position: 'absolute', right: 16 },
  thumb: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(46,125,50,0.06)' },
})
