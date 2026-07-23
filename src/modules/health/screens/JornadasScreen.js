import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Text, Card, Chip, Avatar, Button, IconButton, Menu, ActivityIndicator, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { deleteItem, fetchState } from '@/modules/shared/store/sharedThunks'
import { fetchSchedules, fetchProtocols } from '@/modules/health/store/healthThunks'
import { isOnline } from '@/sync/connectivity'
import { selectIsPartner } from '@/modules/auth/roleSelectors'
import { useToast } from '@/modules/shared/components/Toast'
import { getErrorMessage } from '@/api/errors'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import ScheduleFormModal from '@/modules/health/components/ScheduleFormModal'
import { formatDate, todayISO } from '@/utils/format'

function ScheduleMenu({ onEdit, onDelete, onExecute }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <Menu
      visible={open}
      onDismiss={close}
      anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setOpen(true)} />}
    >
      <Menu.Item leadingIcon="play" title="Ejecutar ahora" onPress={() => { close(); onExecute() }} />
      <Menu.Item leadingIcon="pencil-outline" title="Editar" onPress={() => { close(); onEdit() }} />
      <Menu.Item leadingIcon="delete-outline" title="Eliminar" titleStyle={{ color: '#B3402F' }} onPress={() => { close(); onDelete() }} />
    </Menu>
  )
}

/**
 * Hub de Jornadas: trabajo masivo del día (pesar en serie, aplicar protocolo a
 * N animales) + Programados recurrentes (avisar-y-ejecutar). Los vencidos se
 * resaltan y "Ejecutar" abre la jornada prellenada.
 */
export default function JornadasScreen({ navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const isPartner = useSelector(selectIsPartner)
  const schedules = useSelector((s) => s.health.schedules.filter((x) => x.is_active !== false))
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({ visible: false, schedule: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    // isOnline() imperativo (regla de oro señal intermitente): los parpadeos
    // no re-disparan; offline se usa lo hidratado del cache.
    if (!(await isOnline())) return
    try {
      await Promise.all([
        dispatch(fetchSchedules()),
        dispatch(fetchProtocols()).catch(() => {}),
        dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' })).catch(() => {}),
      ])
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los programados'), 'error')
    }
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

  // Vencimiento calculado en cliente (el is_due del server puede venir viejo
  // del cache offline).
  const today = todayISO()
  const sorted = useMemo(
    () => [...schedules].sort((a, b) => String(a.next_due).localeCompare(String(b.next_due))),
    [schedules]
  )

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(deleteItem({ module: 'health', nameState: 'schedules', url: `/health/schedules/${toDelete.id}/`, value: toDelete.id }))
      toast('Programado eliminado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Spinner solo sin datos (regla de oro: no desmontar nada con data visible).
  if (loading && schedules.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="labelSmall" style={styles.overline}>TRABAJO MASIVO</Text>
            <Text variant="headlineSmall" style={styles.title}>Jornadas</Text>
            <Text variant="bodySmall" style={styles.muted}>
              Registra en serie lo que haces con muchos animales a la vez.
            </Text>

            {!isPartner ? (
              <View style={styles.actions}>
                <Card mode="outlined" style={styles.actionCard} onPress={() => navigation.navigate('WeighingSession')}>
                  <Card.Content style={styles.actionContent}>
                    <Avatar.Icon size={40} icon="scale" color="#fff" style={{ backgroundColor: theme.colors.primary }} />
                    <View style={styles.flex}>
                      <Text variant="titleSmall" style={{ fontWeight: '700' }}>Jornada de pesaje</Text>
                      <Text variant="bodySmall" style={styles.muted}>Animal + kg, en serie</Text>
                    </View>
                  </Card.Content>
                </Card>
                <Card mode="outlined" style={styles.actionCard} onPress={() => navigation.navigate('BatchForm')}>
                  <Card.Content style={styles.actionContent}>
                    <Avatar.Icon size={40} icon="needle" color="#fff" style={{ backgroundColor: theme.colors.secondary }} />
                    <View style={styles.flex}>
                      <Text variant="titleSmall" style={{ fontWeight: '700' }}>Jornada de protocolo</Text>
                      <Text variant="bodySmall" style={styles.muted}>IATF, desparasitación…</Text>
                    </View>
                  </Card.Content>
                </Card>
              </View>
            ) : null}

            <View style={styles.schedHeader}>
              <Text variant="labelLarge">Programados</Text>
              {!isPartner ? (
                <Button mode="contained-tonal" compact icon="plus" onPress={() => setForm({ visible: true, schedule: null })}>
                  Nuevo
                </Button>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const due = String(item.next_due) <= today
          const daysLate = due ? Math.round((new Date(`${today}T00:00:00`) - new Date(`${item.next_due}T00:00:00`)) / 86400000) : 0
          return (
            <Card mode="outlined" style={[styles.schedCard, due && { borderColor: theme.colors.error }]}>
              <Card.Content style={styles.schedContent}>
                <Avatar.Icon
                  size={40}
                  icon="calendar-sync"
                  color="#fff"
                  style={{ backgroundColor: due ? theme.colors.error : theme.colors.primary }}
                />
                <View style={styles.flex}>
                  <Text variant="bodyLarge" style={{ fontWeight: '600' }}>{item.protocol_name}</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {item.lot_name || `${(item.animals || []).length} animales fijos`} · cada {item.every_days} días
                  </Text>
                  <View style={styles.dueRow}>
                    {due ? (
                      <Chip compact style={{ backgroundColor: theme.colors.error }} textStyle={styles.dueChipText}>
                        {daysLate > 0 ? `Vencido hace ${daysLate} día(s)` : 'Vence HOY'}
                      </Chip>
                    ) : (
                      <Text variant="bodySmall" style={styles.muted}>Próxima: {formatDate(item.next_due)}</Text>
                    )}
                  </View>
                </View>
                {!isPartner ? (
                  due ? (
                    <Button mode="contained" compact icon="play" onPress={() => navigation.navigate('BatchForm', { scheduleId: item.id })}>
                      Ejecutar
                    </Button>
                  ) : (
                    <ScheduleMenu
                      onExecute={() => navigation.navigate('BatchForm', { scheduleId: item.id })}
                      onEdit={() => setForm({ visible: true, schedule: item })}
                      onDelete={() => setToDelete(item)}
                    />
                  )
                ) : null}
              </Card.Content>
            </Card>
          )
        }}
        ListEmptyComponent={
          <Text variant="bodySmall" style={[styles.muted, styles.empty]}>
            Sin programados. Crea uno (ej. desparasitación cada 90 días) y la app te avisará cuando toque.
          </Text>
        }
      />

      <ScheduleFormModal
        visible={form.visible}
        schedule={form.schedule}
        onDismiss={() => setForm({ visible: false, schedule: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Programado actualizado' : 'Programado creado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar programado?"
        message={`Se eliminará ${toDelete?.protocol_name || ''}. Las jornadas ya ejecutadas no se modifican.`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, flexGrow: 1 },
  header: { marginBottom: 4 },
  overline: { letterSpacing: 1.2, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  actions: { gap: 10, marginTop: 14 },
  actionCard: {},
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  schedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  schedCard: { marginBottom: 10 },
  schedContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dueRow: { marginTop: 4, flexDirection: 'row' },
  dueChipText: { color: '#fff', fontSize: 11 },
  empty: { textAlign: 'center', paddingVertical: 18 },
})
