import React from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { Portal, Modal, Text, Button, IconButton, Divider, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Reusable form modal — the RN equivalent of the web's v-dialog form cards.
 * Layout: fixed header + SCROLLABLE body (the only part that shrinks) + fixed
 * action bar. The body must use flexShrink so the footer (buttons) always stays
 * visible within the modal's maxHeight.
 */
export default function FormModal({
  visible,
  onDismiss,
  title,
  icon,
  children,
  onSubmit,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  loading = false,
  submitDisabled = false,
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={loading ? undefined : onDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface, marginBottom: 16 + insets.bottom }]}
      >
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            {icon ? <IconButton icon={icon} size={22} iconColor={theme.colors.primary} style={styles.headerIcon} /> : null}
            <Text variant="titleMedium" style={[styles.title, { color: theme.colors.secondary }]} numberOfLines={1}>
              {title}
            </Text>
            <IconButton icon="close" size={20} onPress={onDismiss} disabled={loading} />
          </View>
          <Divider />

          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          <Divider />
          <View style={styles.actions}>
            <Button onPress={onDismiss} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading || submitDisabled}>
              {submitLabel}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 20,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  kav: { flexShrink: 1 }, // lets the modal content stay within maxHeight
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, paddingVertical: 4, flexShrink: 0 },
  headerIcon: { margin: 0, marginRight: 4 },
  title: { flex: 1, fontWeight: '700' },
  scroll: { flexShrink: 1 }, // ONLY this region scrolls/shrinks; header + actions stay fixed
  body: { padding: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, flexShrink: 0 },
})
