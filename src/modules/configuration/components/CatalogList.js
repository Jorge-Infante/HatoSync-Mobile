import React, { useState } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Card, Text, Avatar, IconButton, Menu, ActivityIndicator, FAB, Divider, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Reusable catalog list (the RN mirror of CatalogList.vue). Presentational:
 * the screen wires data + actions. `renderMeta(item)` adds a trailing element
 * (e.g. the is_unique chip).
 */
function RowMenu({ item, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setOpen(true)} />}
    >
      <Menu.Item leadingIcon="pencil-outline" title="Editar" onPress={() => { setOpen(false); onEdit(item) }} />
      <Menu.Item leadingIcon="delete-outline" title="Eliminar" titleStyle={{ color: '#B3402F' }} onPress={() => { setOpen(false); onDelete(item) }} />
    </Menu>
  )
}

export default function CatalogList({
  items,
  loading,
  refreshing,
  onRefresh,
  icon = 'shape-outline',
  emptyTitle = 'Catálogo vacío',
  emptyText = '',
  newLabel = 'Nuevo',
  onNew,
  onEdit,
  onDelete,
  renderMeta,
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={Divider}
        renderItem={({ item }) => (
          <Card mode="contained" style={styles.row}>
            <Card.Content style={styles.rowContent}>
              <Avatar.Icon size={40} icon={icon} color="#fff" style={{ backgroundColor: theme.colors.primary }} />
              <Text variant="bodyLarge" style={styles.name}>
                {item.name}
              </Text>
              {renderMeta ? renderMeta(item) : null}
              <RowMenu item={item} onEdit={onEdit} onDelete={onDelete} />
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Avatar.Icon size={64} icon={icon} color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              {emptyTitle}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {emptyText}
            </Text>
          </View>
        }
      />
      <FAB icon="plus" label={newLabel} style={[styles.fab, { bottom: 16 + insets.bottom }]} onPress={onNew} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  list: { padding: 12, paddingBottom: 96, flexGrow: 1 },
  row: { marginBottom: 8 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, fontWeight: '600' },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  muted: { opacity: 0.7, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
})
