import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Card, Text, Chip, Avatar, IconButton, Searchbar, ActivityIndicator, Banner, FAB, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { switchActiveFarm } from '@/modules/auth/store/authSlice'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import PickerField from '@/modules/shared/components/PickerField'
import MemberFormModal from '@/modules/farms/components/MemberFormModal'
import { initials, formatDateTime } from '@/utils/format'

const ROLE_COLORS = { OWNER: '#2E7D32', ADMIN: '#38678C', EMPLOYEE: '#3F5847', PARTNER: '#C98A2D' }

export default function FarmMembersScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const farms = useSelector((s) => s.farms.farms)
  const members = useSelector((s) => s.farms.members)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const activeFarmName = useSelector((s) => (s.auth.user ? s.auth.user.active_farm_name : null))

  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ visible: false, member: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadMembers = useCallback(
    () => dispatch(fetchState({ module: 'farms', nameState: 'members', url: '/farms/members/' })),
    [dispatch]
  )

  const initialize = useCallback(async () => {
    setError('')
    if (!online) return // offline: farms + members already hydrated from cache
    try {
      if (!farms.length) await dispatch(fetchState({ module: 'farms', nameState: 'farms', url: '/farms/' }))
      if (activeFarmId) await loadMembers()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los miembros'))
    }
  }, [dispatch, farms.length, activeFarmId, loadMembers, online])

  useEffect(() => {
    setLoading(true)
    initialize().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onFarmChange(farmId) {
    if (!farmId || farmId === activeFarmId) return
    setSwitching(true)
    try {
      await dispatch(switchActiveFarm(farmId))
      await loadMembers()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo cambiar de finca'), 'error')
    } finally {
      setSwitching(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    try {
      if (activeFarmId) await loadMembers()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los miembros'), 'error')
    }
    setRefreshing(false)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(deleteItem({ module: 'farms', nameState: 'members', url: `/farms/members/${toDelete.id}/`, value: toDelete.id }))
      toast('Miembro retirado')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo retirar al miembro'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter((m) => m.user.full_name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q))
  }, [members, search])

  const candidates = useMemo(() => {
    const current = new Set(members.map((m) => m.user.id))
    const byId = new Map()
    farms.forEach((farm) => {
      ;(farm.members || []).forEach((m) => {
        if (!current.has(m.user.id) && !byId.has(m.user.id)) {
          byId.set(m.user.id, { id: m.user.id, label: `${m.user.full_name} (${m.user.email})` })
        }
      })
    })
    return [...byId.values()]
  }, [members, farms])

  if (loading) {
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
        contentContainerStyle={[styles.list, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PickerField
              label="Finca"
              value={activeFarmId}
              options={farms.map((f) => ({ label: f.name, value: f.id }))}
              onChange={onFarmChange}
              disabled={switching}
              style={styles.farmPicker}
            />
            <Searchbar placeholder="Buscar por nombre o correo" value={search} onChangeText={setSearch} style={styles.searchbar} />
            {!activeFarmId ? (
              <Banner visible icon="information-outline">
                No tienes una finca activa. Selecciona una para gestionar sus miembros.
              </Banner>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const isOwner = item.role === 'OWNER'
          return (
            <Card mode="outlined" style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Avatar.Text size={42} label={initials(item.user.full_name)} color="#fff" style={{ backgroundColor: theme.colors.primary }} />
                <View style={styles.cardBody}>
                  <Text variant="bodyLarge" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {item.user.full_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
                    {item.user.email}
                  </Text>
                  <View style={styles.metaRow}>
                    <Chip compact style={{ backgroundColor: (ROLE_COLORS[item.role] || '#3F5847') + '22' }} textStyle={{ color: ROLE_COLORS[item.role] || '#3F5847', fontSize: 11 }}>
                      {item.role_display}
                    </Chip>
                    {item.joined_at ? (
                      <Text variant="bodySmall" style={styles.muted}>
                        desde {formatDateTime(item.joined_at)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <IconButton icon="pencil-outline" size={20} disabled={isOwner} onPress={() => setForm({ visible: true, member: item })} />
                  <IconButton icon="delete-outline" size={20} iconColor={theme.colors.error} disabled={isOwner} onPress={() => setToDelete(item)} />
                </View>
              </Card.Content>
            </Card>
          )
        }}
        ListEmptyComponent={
          activeFarmId && !error ? (
            <View style={styles.center}>
              <Text variant="bodyLarge" style={styles.muted}>
                No hay miembros para mostrar
              </Text>
            </View>
          ) : null
        }
      />

      {activeFarmId ? (
        <FAB icon="account-plus-outline" label="Agregar" style={[styles.fab, { bottom: 16 + insets.bottom }]} onPress={() => setForm({ visible: true, member: null })} />
      ) : null}

      <MemberFormModal
        visible={form.visible}
        member={form.member}
        candidates={candidates}
        onDismiss={() => setForm({ visible: false, member: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Miembro actualizado' : 'Miembro agregado')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Retirar miembro?"
        confirmLabel="Retirar"
        message={`${toDelete?.user?.full_name || ''} dejará de tener acceso a ${activeFarmName || 'la finca'}.`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  list: { padding: 12, paddingBottom: 96, flexGrow: 1 },
  header: { marginBottom: 4 },
  farmPicker: { marginBottom: 4 },
  searchbar: { marginBottom: 8 },
  card: { marginBottom: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  muted: { opacity: 0.7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  rowActions: { flexDirection: 'row' },
  // Sin position absolute el FAB entra al flujo normal y se estira a todo el
  // ancho de la pantalla — mismo estilo que el FAB de AnimalListScreen.
  fab: { position: 'absolute', right: 16, bottom: 16 },
})
