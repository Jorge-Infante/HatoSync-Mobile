import React, { useState, useEffect, useCallback } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import {
  Card, Text, Chip, Menu, IconButton, Avatar, Button, FAB, ActivityIndicator, useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import apiClient from '@/api/client'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { isOnline } from '@/sync/connectivity'
import { selectIsFarmAdmin, selectIsPartner } from '@/modules/auth/roleSelectors'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import PaddockThumb from '../components/PaddockThumb'
import AssignLotModal from '../components/AssignLotModal'
import RotationHistoryModal from '../components/RotationHistoryModal'
import { rotationStatusColor, ROTATION_STATUS_ICONS, formatArea } from '../constants'

function PaddockActionsMenu({ paddock, isPartner, isFarmAdmin, onAssign, onClose, onHistory, onEdit, onDelete }) {
  const [visible, setVisible] = useState(false)
  const close = () => setVisible(false)
  const run = (fn, arg) => () => {
    close()
    fn && fn(arg !== undefined ? arg : paddock)
  }
  if (isPartner) return null
  const currentLots = (paddock.rotation && paddock.rotation.current_lots) || []
  return (
    <Menu
      visible={visible}
      onDismiss={close}
      anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setVisible(true)} />}
    >
      <Menu.Item leadingIcon="cow" title="Meter / mover lote aquí" onPress={run(onAssign)} />
      {currentLots.map((lot) => (
        <Menu.Item key={lot.stay_id} leadingIcon="exit-run" title={`Sacar ${lot.name}`} onPress={run(onClose, lot)} />
      ))}
      <Menu.Item leadingIcon="history" title="Historial de rotación" onPress={run(onHistory)} />
      {isFarmAdmin ? (
        <>
          <Menu.Item leadingIcon="pencil-outline" title="Editar en el mapa" onPress={run(onEdit)} />
          <Menu.Item leadingIcon="delete-outline" title="Eliminar" onPress={run(onDelete)} titleStyle={{ color: '#B3402F' }} />
        </>
      ) : null}
    </Menu>
  )
}

/**
 * Listado de potreros con su rotación (estado, lotes dentro, promedios de
 * ocupación y descanso). Espejo de PaddockListPage.vue. Online-first (los
 * potreros aún no van a SQLite — fase posterior).
 */
export default function PaddockListScreen({ navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const paddocks = useSelector((s) => s.paddocks.paddocks)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const isFarmAdmin = useSelector(selectIsFarmAdmin)
  const isPartner = useSelector(selectIsPartner)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [assign, setAssign] = useState(null) // paddock
  const [history, setHistory] = useState(null) // paddock
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    // isOnline() imperativo dentro del load (regla de oro de señal intermitente).
    if (!(await isOnline())) {
      toast('Los potreros necesitan conexión (offline llega luego)', 'error')
      return
    }
    try {
      await dispatch(fetchState({ module: 'paddocks', nameState: 'paddocks', url: '/farms/paddocks/' }))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los potreros'), 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, toast])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, activeFarmId])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function rotationLine(paddock) {
    const rotation = paddock.rotation
    if (!rotation) return ''
    if (rotation.status === 'OCCUPIED') {
      return `Dentro: ${rotation.current_lots.map((l) => `${l.name} (${l.days} d)`).join(', ')}`
    }
    if (rotation.status === 'RESTING') {
      return `Último lote: ${rotation.last_lot_name} · ${rotation.stays_count} estadías`
    }
    return 'Sin movimientos de lotes todavía'
  }

  async function closeStay(paddock, lot) {
    try {
      await apiClient.post(`/farms/paddock-stays/${lot.stay_id}/close/`, {})
      toast(`${lot.name} salió de ${paddock.name}`)
      load()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo sacar el lote'), 'error')
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(
        deleteItem({
          module: 'paddocks',
          nameState: 'paddocks',
          url: `/farms/paddocks/${toDelete.id}/`,
          value: toDelete.id,
        }),
      )
      toast('Potrero eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el potrero'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Spinner de pantalla completa SOLO sin datos (no desmonta modales montados abajo).
  if (loading && !paddocks.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={paddocks}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 90 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="labelSmall" style={styles.overline}>EL MAPA DE TU FINCA</Text>
            <Text variant="headlineSmall" style={styles.title}>Potreros</Text>
            <Text variant="bodySmall" style={styles.muted}>
              Mueve los lotes entre potreros y controla ocupación y descanso.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const rotation = item.rotation || {}
          return (
            <Card mode="outlined" style={styles.card} onPress={() => setHistory(item)}>
              <Card.Content style={styles.cardContent}>
                <View style={[styles.thumb, { borderColor: theme.colors.outline }]}>
                  <PaddockThumb geometry={item.geometry} color={item.color} />
                </View>
                <View style={styles.flex}>
                  <Text variant="titleMedium" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
                    {rotationLine(item)}
                  </Text>
                  <View style={styles.chipsRow}>
                    <Chip
                      compact
                      icon={ROTATION_STATUS_ICONS[rotation.status]}
                      style={{ backgroundColor: rotationStatusColor(rotation.status) + '22' }}
                      textStyle={{ color: rotationStatusColor(rotation.status), fontSize: 11 }}
                    >
                      {rotation.status_display}
                      {rotation.days_in_status !== null && rotation.days_in_status !== undefined
                        ? ` · ${rotation.days_in_status} d`
                        : ''}
                    </Chip>
                    <Chip compact textStyle={{ fontSize: 11 }}>{formatArea(item)}</Chip>
                    {rotation.avg_occupation_days !== null && rotation.avg_occupation_days !== undefined ? (
                      <Chip compact icon="cow" textStyle={{ fontSize: 11 }}>{`⌀ ${rotation.avg_occupation_days} d`}</Chip>
                    ) : null}
                    {rotation.avg_rest_days !== null && rotation.avg_rest_days !== undefined ? (
                      <Chip compact icon="sprout-outline" textStyle={{ fontSize: 11 }}>{`⌀ ${rotation.avg_rest_days} d`}</Chip>
                    ) : null}
                  </View>
                </View>
                <PaddockActionsMenu
                  paddock={item}
                  isPartner={isPartner}
                  isFarmAdmin={isFarmAdmin}
                  onAssign={setAssign}
                  onClose={(lot) => closeStay(item, lot)}
                  onHistory={setHistory}
                  onEdit={(p) => navigation.navigate('PaddockEditor', { id: p.id })}
                  onDelete={setToDelete}
                />
              </Card.Content>
            </Card>
          )
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Avatar.Icon size={64} icon="map-outline" color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
            <Text variant="titleMedium" style={styles.emptyTitle}>Aún no hay potreros</Text>
            <Text variant="bodyMedium" style={[styles.muted, { textAlign: 'center' }]}>
              {isFarmAdmin
                ? 'Dibuja el primer potrero de tu finca sobre el mapa satelital.'
                : 'Cuando un administrador dibuje los potreros, los verás aquí.'}
            </Text>
            {isFarmAdmin ? (
              <Button mode="contained" icon="shape-polygon-plus" style={styles.emptyBtn} onPress={() => navigation.navigate('PaddockEditor')}>
                Nuevo potrero
              </Button>
            ) : null}
          </View>
        }
      />

      {isFarmAdmin && paddocks.length ? (
        <FAB
          icon="shape-polygon-plus"
          style={[styles.fab, { bottom: 16 + insets.bottom, backgroundColor: theme.colors.primary }]}
          color="#fff"
          onPress={() => navigation.navigate('PaddockEditor')}
        />
      ) : null}

      <AssignLotModal
        visible={!!assign}
        paddock={assign}
        onDismiss={() => setAssign(null)}
        onSaved={() => {
          toast('Entrada registrada')
          load()
        }}
      />
      <RotationHistoryModal
        visible={!!history}
        paddock={history}
        canManage={!isPartner}
        onDismiss={() => setHistory(null)}
        onChanged={() => {
          toast('Registro eliminado')
          load()
        }}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar potrero?"
        message={`Se eliminará ${toDelete ? toDelete.name : ''} del mapa de la finca.`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  list: { padding: 12, flexGrow: 1 },
  header: { marginBottom: 12 },
  overline: { letterSpacing: 1, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  card: { marginBottom: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  thumb: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 3, backgroundColor: '#FDFCF8' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  emptyBtn: { marginTop: 10 },
  fab: { position: 'absolute', right: 16 },
})
