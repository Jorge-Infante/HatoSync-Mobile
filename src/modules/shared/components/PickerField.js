import React, { useState, useMemo } from 'react'
import { Pressable, View, FlatList, StyleSheet } from 'react-native'
import { TextInput, HelperText, Portal, Modal, Searchbar, List, Text, Divider, useTheme } from 'react-native-paper'

/**
 * Select / autocomplete field. Opens a modal with an optional search box and the
 * list of options. Replaces both v-select and v-autocomplete from the web.
 *
 * options: [{ label, value }]
 */
export default function PickerField({
  label,
  value,
  options = [],
  onChange,
  searchable = false,
  clearable = false,
  disabled = false,
  error,
  helperText,
  icon = 'chevron-down',
  noDataText = 'Sin opciones',
  style,
}) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value])

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  function choose(val) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <View style={style}>
      <Pressable onPress={() => !disabled && setOpen(true)}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={selected ? selected.label : ''}
            editable={false}
            disabled={disabled}
            error={!!error}
            right={<TextInput.Icon icon={icon} />}
          />
        </View>
      </Pressable>
      {error || helperText ? (
        <HelperText type={error ? 'error' : 'info'} visible>
          {error || helperText}
        </HelperText>
      ) : null}

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleSmall" style={styles.modalTitle}>
            {label}
          </Text>
          {searchable ? (
            <Searchbar
              placeholder="Buscar…"
              value={query}
              onChangeText={setQuery}
              style={styles.search}
              autoFocus
            />
          ) : null}
          {clearable && value != null ? (
            <List.Item title="Quitar selección" left={(p) => <List.Icon {...p} icon="close" />} onPress={() => choose(null)} />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            ItemSeparatorComponent={Divider}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <List.Item
                title={item.label}
                onPress={() => choose(item.value)}
                left={item.value === value ? (p) => <List.Icon {...p} icon="check" color={theme.colors.primary} /> : undefined}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty} variant="bodyMedium">
                {noDataText}
              </Text>
            }
          />
        </Modal>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  modal: { marginHorizontal: 16, borderRadius: 20, paddingVertical: 12, maxHeight: '80%' },
  modalTitle: { paddingHorizontal: 16, paddingBottom: 8, fontWeight: '700' },
  search: { marginHorizontal: 12, marginBottom: 8 },
  list: { flexGrow: 0 },
  empty: { textAlign: 'center', opacity: 0.6, padding: 24 },
})
