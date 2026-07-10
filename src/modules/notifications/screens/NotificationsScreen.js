import React, { useState, useEffect, useCallback } from 'react'
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { Text, Banner, Button, ActivityIndicator, IconButton, useTheme } from 'react-native-paper'
import apiClient from '@/api/client'
import { getErrorMessage } from '@/api/errors'
import { useOnline } from '@/sync/connectivity'

// "hace 5 min / hace 3 h / ayer / 12/07/2026"
function relativeDate(iso) {
  const date = new Date(iso)
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return date.toLocaleDateString()
}

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme()
  const online = useOnline()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const { data } = await apiClient.get('/notifications/')
      setItems(data)
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar las notificaciones'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const unreadCount = items.filter((n) => !n.is_read).length

  function markReadLocal(predicate) {
    setItems((prev) => prev.map((n) => (predicate(n) ? { ...n, is_read: true } : n)))
  }

  async function onPressItem(item) {
    if (!item.is_read) {
      markReadLocal((n) => n.id === item.id) // optimista
      apiClient.post(`/notifications/${item.id}/read/`).catch(() => {})
    }
    if (item.data && item.data.animal_id) {
      navigation.navigate('AnimalDetail', { id: item.data.animal_id })
    }
  }

  async function markAll() {
    markReadLocal(() => true)
    apiClient.post('/notifications/read-all/').catch(() => {})
  }

  function renderItem({ item }) {
    return (
      <Pressable
        onPress={() => onPressItem(item)}
        style={[styles.row, { borderColor: theme.colors.outline }, !item.is_read && styles.rowUnread]}
      >
        <View style={[styles.dot, { backgroundColor: item.is_read ? 'transparent' : theme.colors.primary }]} />
        <View style={styles.rowBody}>
          <Text variant="titleSmall" style={!item.is_read && styles.unreadText}>
            {item.title}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.hs.palette.ink }}>
            {item.body}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.hs.palette.muted }}>
            {relativeDate(item.created_at)}
            {item.farm_name ? ` · ${item.farm_name}` : ''}
          </Text>
        </View>
        {item.data && item.data.animal_id ? (
          <IconButton icon="chevron-right" size={20} iconColor={theme.hs.palette.muted} style={styles.chevron} />
        ) : null}
      </Pressable>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      {error ? (
        <Banner visible icon="alert-circle-outline" actions={[{ label: 'Reintentar', onPress: load }]}>
          {error}
        </Banner>
      ) : null}
      {!online && !items.length ? (
        <Banner visible icon="cloud-off-outline">
          Sin conexión: el historial de notificaciones se consulta en línea.
        </Banner>
      ) : null}

      {unreadCount > 0 ? (
        <View style={styles.toolbar}>
          <Text variant="labelLarge" style={{ color: theme.hs.palette.muted }}>
            {unreadCount} sin leer
          </Text>
          <Button compact onPress={markAll}>
            Marcar todas como leídas
          </Button>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={
          !error ? (
            <View style={styles.center}>
              <IconButton icon="bell-outline" size={40} iconColor={theme.hs.palette.muted} />
              <Text variant="bodyMedium" style={{ color: theme.hs.palette.muted }}>
                Sin notificaciones todavía
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  list: { padding: 12, paddingBottom: 32, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FDFCF8',
  },
  rowUnread: { backgroundColor: 'rgba(46,125,50,0.05)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  rowBody: { flex: 1, gap: 2 },
  unreadText: { fontWeight: '700' },
  chevron: { margin: 0 },
})
