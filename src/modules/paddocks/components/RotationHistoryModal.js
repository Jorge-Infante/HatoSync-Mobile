import React, { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import {
  Portal, Modal, Text, IconButton, Divider, Chip, Avatar, ActivityIndicator, Button, useTheme,
} from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { fetchState, deleteItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'
import { formatDate } from '@/utils/format'
import { useToast } from '@/modules/shared/components/Toast'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import { rotationStatusColor } from '../constants'

/**
 * Historial de rotación de un potrero: métricas derivadas (estado, promedios de
 * ocupación y descanso) + línea de tiempo de estadías. Espejo de
 * RotationHistoryDialog.vue.
 */
export default function RotationHistoryModal({ visible, paddock, canManage, onDismiss, onChanged }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const toast = useToast()
  const stays = useSelector((s) => s.paddocks.stays)

  const [loading, setLoading] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const rotation = paddock && paddock.rotation

  useEffect(() => {
    if (!visible || !paddock) return
    setLoading(true)
    dispatch(
      fetchState({
        module: 'paddocks',
        nameState: 'stays',
        url: '/farms/paddock-stays/',
        params: { paddock: paddock.id },
      }),
    )
      .catch((e) => toast(getErrorMessage(e, 'No se pudo cargar el historial'), 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, paddock && paddock.id])

  async function confirmDelete() {
    setDeleting(true)
    try {
      await dispatch(
        deleteItem({
          module: 'paddocks',
          nameState: 'stays',
          url: `/farms/paddock-stays/${toDelete.id}/`,
          value: toDelete.id,
        }),
      )
      setToDelete(null)
      onChanged && onChanged()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo eliminar el registro'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <IconButton icon="history" size={22} iconColor={theme.colors.primary} style={styles.headerIcon} />
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.secondary }]} numberOfLines={1}>
            Rotación de {paddock ? paddock.name : ''}
          </Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>
        <Divider />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          {rotation ? (
            <View style={styles.chips}>
              <Chip
                compact
                style={{ backgroundColor: rotationStatusColor(rotation.status) + '22' }}
                textStyle={{ color: rotationStatusColor(rotation.status) }}
              >
                {rotation.status_display}
                {rotation.days_in_status !== null ? ` · ${rotation.days_in_status} d` : ''}
              </Chip>
              {rotation.avg_occupation_days !== null ? (
                <Chip compact icon="cow">{`Ocupación prom. ${rotation.avg_occupation_days} d`}</Chip>
              ) : null}
              {rotation.avg_rest_days !== null ? (
                <Chip compact icon="sprout-outline">{`Descanso prom. ${rotation.avg_rest_days} d`}</Chip>
              ) : null}
              <Chip compact icon="swap-horizontal">
                {`${rotation.stays_count} ${rotation.stays_count === 1 ? 'estadía' : 'estadías'}`}
              </Chip>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} />
          ) : !stays.length ? (
            <Text variant="bodyMedium" style={styles.empty}>
              Este potrero aún no tiene movimientos de lotes.
            </Text>
          ) : (
            stays.map((stay, index) => (
              <View key={stay.id}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.row}>
                  <Avatar.Icon
                    size={32}
                    icon={stay.left_on ? 'check' : 'cow'}
                    color="#fff"
                    style={{ backgroundColor: stay.left_on ? theme.colors.secondary : theme.colors.primary }}
                  />
                  <View style={styles.rowBody}>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>{stay.lot_name}</Text>
                    <Text variant="bodySmall" style={styles.muted}>
                      {formatDate(stay.entered_on)} → {stay.left_on ? formatDate(stay.left_on) : 'hoy (dentro)'}
                      {stay.notes ? ` · ${stay.notes}` : ''}
                    </Text>
                  </View>
                  <Chip compact textStyle={{ fontSize: 11 }}>{`${stay.days} d`}</Chip>
                  {canManage ? (
                    <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => setToDelete(stay)} />
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Divider />
        <View style={styles.actions}>
          <Button onPress={onDismiss}>Cerrar</Button>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        onDismiss={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar registro?"
        message={`Se eliminará la estadía de ${toDelete ? toDelete.lot_name : ''} (corrección del historial).`}
      />
    </Portal>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, borderRadius: 20, maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, paddingVertical: 4 },
  headerIcon: { margin: 0, marginRight: 4 },
  title: { flex: 1, fontWeight: '700' },
  scroll: { flexShrink: 1 },
  body: { padding: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBody: { flex: 1 },
  muted: { opacity: 0.7 },
  empty: { textAlign: 'center', opacity: 0.7, marginVertical: 24 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12 },
})
