import React, { useState, useEffect, useCallback } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Card, Text, Chip, Avatar, IconButton, Menu, ActivityIndicator, Banner, FAB, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { useOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import FarmFormModal from '@/modules/farms/components/FarmFormModal'

function FarmMenu({ farm, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setOpen(true)} />}
    >
      <Menu.Item leadingIcon="pencil-outline" title="Editar" onPress={() => { setOpen(false); onEdit(farm) }} />
      <Menu.Item leadingIcon="delete-outline" title="Eliminar" titleStyle={{ color: '#B3402F' }} onPress={() => { setOpen(false); onDelete(farm) }} />
    </Menu>
  )
}

export default function FarmListScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const farms = useSelector((s) => s.farms.farms)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ visible: false, farm: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setError('')
    if (!online) return // offline: list already hydrated from the local cache
    try {
      await dispatch(fetchState({ module: 'farms', nameState: 'farms', url: '/farms/' }))
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las fincas'))
    }
  }, [dispatch, online])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(deleteItem({ module: 'farms', nameState: 'farms', url: `/farms/${toDelete.id}/`, value: toDelete.id }))
      toast('Finca eliminada')
      setToDelete(null)
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar la finca'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  function location(farm) {
    return [farm.city, farm.department].filter(Boolean).join(', ') || 'Sin ubicación'
  }

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
        data={farms}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <View style={styles.cardTop}>
                <Avatar.Icon size={44} icon="barn" color="#fff" style={{ backgroundColor: theme.colors.primary }} />
                <View style={styles.cardBody}>
                  <Text variant="titleMedium" style={styles.name}>
                    {item.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {location(item)}
                  </Text>
                </View>
                <FarmMenu farm={item} onEdit={(f) => setForm({ visible: true, farm: f })} onDelete={(f) => setToDelete(f)} />
              </View>
              <View style={styles.chips}>
                <Chip compact icon="account-group-outline">
                  {item.members_count || 0} miembros
                </Chip>
                {item.id === activeFarmId ? (
                  <Chip compact icon="check-circle-outline" style={{ backgroundColor: theme.colors.primaryContainer }}>
                    Activa
                  </Chip>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          !error ? (
            <View style={styles.center}>
              <Avatar.Icon size={64} icon="barn" color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Aún no tienes fincas
              </Text>
              <Text variant="bodyMedium" style={styles.muted}>
                Crea tu primera finca con el botón +.
              </Text>
            </View>
          ) : null
        }
      />
      <FAB icon="plus" label="Nueva finca" style={[styles.fab, { bottom: 16 + insets.bottom }]} onPress={() => setForm({ visible: true, farm: null })} />

      <FarmFormModal
        visible={form.visible}
        farm={form.farm}
        onDismiss={() => setForm({ visible: false, farm: null })}
        onSaved={({ isEdit }) => toast(isEdit ? 'Finca actualizada' : 'Finca creada')}
      />
      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar finca?"
        message={`Se eliminará ${toDelete?.name || ''} y dejarás de ver sus datos. Esta acción no se puede deshacer.`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  list: { padding: 12, paddingBottom: 96, flexGrow: 1 },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  name: { fontWeight: '700' },
  muted: { opacity: 0.7, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
})
