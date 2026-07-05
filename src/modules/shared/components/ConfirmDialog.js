import React from 'react'
import { Portal, Dialog, Text, Button } from 'react-native-paper'

/**
 * Confirmation dialog (delete / destructive actions). Mirrors the web's small
 * confirm v-dialogs.
 */
export default function ConfirmDialog({
  visible,
  onDismiss,
  onConfirm,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  loading = false,
  destructive = true,
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={loading ? undefined : onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            mode="contained"
            buttonColor={destructive ? undefined : undefined}
            textColor={destructive ? '#fff' : undefined}
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            style={destructive ? { backgroundColor: '#B3402F' } : undefined}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
