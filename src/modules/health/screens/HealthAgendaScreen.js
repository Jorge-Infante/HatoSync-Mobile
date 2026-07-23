import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, ScrollView, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Text, Card, Chip, SegmentedButtons, Avatar, IconButton, ActivityIndicator, Divider, Button, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { fetchApplications } from '@/modules/health/store/healthThunks'
import { useOnline } from '@/sync/connectivity'
import { selectIsFarmAdmin, selectIsPartner } from '@/modules/auth/roleSelectors'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import { healthStatusMeta, doseLabel, OVERDUE_COLOR } from '@/modules/health/constants'
import { formatDateTimeFull } from '@/utils/format'
import HealthCalendar from '@/modules/health/components/HealthCalendar'
import ApplicationResolver from '@/modules/health/components/ApplicationResolver'

const fullDT = formatDateTimeFull

export default function HealthAgendaScreen({ navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const applications = useSelector((s) => s.health.applications)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const isFarmAdmin = useSelector(selectIsFarmAdmin)
  const isPartner = useSelector(selectIsPartner)
  const canResolve = !isPartner

  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resolver, setResolver] = useState({ visible: false, app: null, action: 'apply' })

  const load = useCallback(async () => {
    if (!online) return
    try {
      const params = statusFilter === 'PENDING' ? { status: 'PENDING' } : {}
      await dispatch(fetchApplications(params))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo cargar la agenda'), 'error')
    }
  }, [dispatch, toast, online, statusFilter])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, activeFarmId])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const sorted = useMemo(
    () => [...applications].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [applications]
  )
  const pendingCount = useMemo(() => applications.filter((a) => a.status === 'PENDING').length, [applications])
  const overdueCount = useMemo(() => applications.filter((a) => a.is_overdue).length, [applications])

  function openResolver(app, action) {
    setResolver({ visible: true, app, action })
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text variant="labelSmall" style={styles.overline}>SANIDAD DE LA FINCA</Text>
          <Text variant="headlineSmall" style={styles.title}>Agenda</Text>
        </View>
        {isFarmAdmin ? (
          <Button mode="contained-tonal" compact icon="clipboard-list-outline" onPress={() => navigation.navigate('ProtocolList')}>
            Protocolos
          </Button>
        ) : null}
      </View>
      <Text variant="bodySmall" style={styles.muted}>
        Los tratamientos se crean desde la ficha de cada animal.
      </Text>
      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={[
          { value: 'PENDING', label: 'Pendientes' },
          { value: 'ALL', label: 'Todas' },
        ]}
        style={styles.segmented}
      />
      <View style={styles.counters}>
        <Chip compact icon="clock-outline">{pendingCount} pendientes</Chip>
        {overdueCount ? (
          <Chip compact icon="alert-outline" style={{ backgroundColor: OVERDUE_COLOR + '22' }} textStyle={{ color: OVERDUE_COLOR }}>
            {overdueCount} vencidas
          </Chip>
        ) : null}
      </View>
    </View>
  )

  const empty = (
    <View style={styles.center}>
      <Avatar.Icon size={64} icon="calendar-check-outline" color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        {statusFilter === 'PENDING' ? 'Nada pendiente por aplicar' : 'Sin aplicaciones registradas'}
      </Text>
      <Text variant="bodyMedium" style={styles.muted}>
        Abre un animal y usa «Nuevo tratamiento» en la pestaña Sanidad para programar sus aplicaciones.
      </Text>
    </View>
  )

  const resolverModal = (
    <ApplicationResolver
      visible={resolver.visible}
      app={resolver.app}
      action={resolver.action}
      onDismiss={() => setResolver({ visible: false, app: null, action: 'apply' })}
      onResolved={({ action }) => { toast(action === 'apply' ? 'Aplicación registrada' : 'Aplicación omitida'); load() }}
    />
  )

  // Spinner solo sin datos: el early-return desmontaba el ApplicationResolver
  // abierto cuando la señal parpadeaba (misma lección que AnimalListScreen).
  if (loading && applications.length === 0) {
    return (
      <View style={[styles.flexCenter, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }

  // Pendientes → calendario (scroll simple); Todas → lista (FlatList).
  if (statusFilter === 'PENDING') {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 24 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {header}
          {sorted.length === 0 ? empty : (
            <HealthCalendar applications={sorted} canResolve={canResolve} onResolve={openResolver} />
          )}
        </ScrollView>
        {resolverModal}
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
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Divider}
        renderItem={({ item }) => {
          const meta = healthStatusMeta(item.status)
          const color = item.is_overdue ? OVERDUE_COLOR : meta.color
          return (
            <Card mode="contained" style={styles.row}>
              <Card.Content style={styles.rowContent}>
                <Avatar.Icon size={40} icon={meta.icon} color="#fff" style={{ backgroundColor: color }} />
                <View style={styles.flex}>
                  <View style={styles.rowTitle}>
                    <Text variant="bodyLarge" style={{ fontWeight: '600' }}>{item.medication_name}</Text>
                    {item.is_overdue ? (
                      <Chip compact style={{ backgroundColor: OVERDUE_COLOR }} textStyle={{ color: '#fff', fontSize: 11 }}>Vencida</Chip>
                    ) : (
                      <Chip compact style={{ backgroundColor: color + '22' }} textStyle={{ color, fontSize: 11 }}>{item.status_display}</Chip>
                    )}
                  </View>
                  <Text variant="bodySmall" style={styles.muted}>
                    {item.animal_name} · {doseLabel(item)}{item.route_display ? ` · ${item.route_display}` : ''}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>{fullDT(item.scheduled_at)}</Text>
                </View>
                {canResolve && item.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <IconButton icon="check" size={18} mode="contained-tonal" iconColor={theme.colors.primary} onPress={() => openResolver(item, 'apply')} />
                    <IconButton icon="close" size={18} onPress={() => openResolver(item, 'skip')} />
                  </View>
                ) : null}
              </Card.Content>
            </Card>
          )
        }}
      />
      {resolverModal}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 12 },
  list: { padding: 12, flexGrow: 1 },
  header: { marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  overline: { letterSpacing: 1, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  segmented: { marginTop: 12 },
  counters: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  row: { marginBottom: 8 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  actions: { flexDirection: 'row' },
})
