import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Card, Text, Button, Icon, ProgressBar, Divider, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { useFocusEffect } from '@react-navigation/native'
import { useOnline } from '@/sync/connectivity'
import { useSync } from '@/sync/SyncProvider'
import { downloadFarmData, getLastDownload } from '@/sync/pull'
import { hydrateFromDb } from '@/sync/hydrate'
import { countAnimals } from '@/db/repositories'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import { formatDateTime } from '@/utils/format'

const PHASE_LABEL = {
  meta: 'Descargando catálogos…',
  list: 'Descargando hato…',
  full: 'Descargando fichas…',
  done: 'Completado',
}

export default function SyncScreen() {
  const theme = useTheme()
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const { pending, errors, syncing, refresh: refreshSync, sync, retry } = useSync()
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const activeFarmName = useSelector((s) => (s.auth.user ? s.auth.user.active_farm_name : null))

  const [last, setLast] = useState(null)
  const [cached, setCached] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(null)

  const refreshStatus = useCallback(async () => {
    setLast(await getLastDownload())
    if (activeFarmId != null) setCached(await countAnimals(activeFarmId))
  }, [activeFarmId])

  useFocusEffect(
    useCallback(() => {
      refreshStatus()
      refreshSync()
    }, [refreshStatus, refreshSync])
  )

  async function onDownload() {
    if (!activeFarmId) return toast('Selecciona una finca activa primero', 'error')
    setDownloading(true)
    setProgress({ phase: 'meta', done: 0, total: 0 })
    try {
      await downloadFarmData({ farmId: activeFarmId, onProgress: setProgress })
      await hydrateFromDb(dispatch, activeFarmId) // refresca Redux con lo recién bajado
      await refreshStatus()
      toast('Datos descargados para uso offline')
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo completar la descarga'), 'error')
    } finally {
      setDownloading(false)
      setProgress(null)
    }
  }

  const pct = progress && progress.total ? progress.done / progress.total : 0

  return (
    <ScrollView style={[styles.flex, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <View style={styles.statusRow}>
            <Icon source={online ? 'cloud-check-outline' : 'cloud-off-outline'} size={22} color={online ? theme.colors.primary : theme.colors.error} />
            <Text variant="titleMedium" style={styles.statusText}>
              {online ? 'Con conexión' : 'Sin conexión'}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.muted}>
            {online
              ? 'Descarga la finca activa para poder consultarla en el campo sin señal.'
              : 'Estás offline. Puedes consultar lo que ya descargaste.'}
          </Text>
        </Card.Content>
      </Card>

      {/* Cambios pendientes de subir (outbox) */}
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={styles.overline}>
            CAMBIOS POR SUBIR
          </Text>
          <View style={styles.metaRow}>
            <Text variant="bodyMedium" style={styles.muted}>
              Pendientes
            </Text>
            <Text variant="bodyMedium" style={styles.metaValue}>
              {pending}
            </Text>
          </View>
          {errors > 0 ? (
            <View style={styles.metaRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                Con error
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.error, fontWeight: '600' }}>
                {errors}
              </Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            icon="cloud-upload-outline"
            onPress={sync}
            loading={syncing}
            disabled={syncing || !online || pending === 0}
            style={styles.downloadBtn}
            contentStyle={styles.downloadBtnContent}
          >
            {pending > 0 ? `Sincronizar ${pending} cambio(s)` : 'Todo sincronizado'}
          </Button>
          {errors > 0 ? (
            <Button mode="text" icon="refresh" onPress={retry} disabled={syncing || !online} style={styles.retryBtn}>
              Reintentar fallidos
            </Button>
          ) : null}
          {!online && pending > 0 ? (
            <Text variant="bodySmall" style={[styles.muted, styles.center]}>
              Se subirán automáticamente al recuperar conexión.
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="labelSmall" style={styles.overline}>
            FINCA ACTIVA
          </Text>
          <Text variant="titleMedium" style={styles.farmName}>
            {activeFarmName || 'Sin finca activa'}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.metaRow}>
            <Text variant="bodyMedium" style={styles.muted}>
              Animales en caché
            </Text>
            <Text variant="bodyMedium" style={styles.metaValue}>
              {cached}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text variant="bodyMedium" style={styles.muted}>
              Última descarga
            </Text>
            <Text variant="bodyMedium" style={styles.metaValue}>
              {last && last.at ? formatDateTime(last.at) : 'Nunca'}
            </Text>
          </View>

          {progress ? (
            <View style={styles.progressBlock}>
              <Text variant="bodySmall" style={styles.muted}>
                {PHASE_LABEL[progress.phase] || 'Procesando…'}
                {progress.total ? `  ${progress.done}/${progress.total}` : ''}
              </Text>
              <ProgressBar progress={pct} style={styles.progressBar} />
            </View>
          ) : null}

          <Button
            mode="contained"
            icon="cloud-download-outline"
            onPress={onDownload}
            loading={downloading}
            disabled={downloading || !online || !activeFarmId}
            style={styles.downloadBtn}
            contentStyle={styles.downloadBtnContent}
          >
            {last ? 'Actualizar descarga' : 'Descargar para uso offline'}
          </Button>
          {!online ? (
            <Text variant="bodySmall" style={[styles.muted, styles.center]}>
              Conéctate a internet para descargar.
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Text variant="bodySmall" style={[styles.muted, styles.footnote]}>
        Se descarga el hato completo de la finca activa (animales, fichas, reproducción,
        catálogos y las fotos de cada animal) para consultarlo sin señal. Bajar las fotos
        toma más tiempo y espacio; hazlo con buena conexión. Vuelve a tocar para actualizar.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },
  card: { marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusText: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  overline: { letterSpacing: 1.2, opacity: 0.6 },
  farmName: { fontWeight: '700', marginTop: 2 },
  divider: { marginVertical: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaValue: { fontWeight: '600' },
  progressBlock: { marginTop: 16 },
  progressBar: { marginTop: 6, height: 6, borderRadius: 3 },
  downloadBtn: { marginTop: 18, borderRadius: 12 },
  downloadBtnContent: { paddingVertical: 6 },
  retryBtn: { marginTop: 6 },
  center: { textAlign: 'center', marginTop: 8 },
  footnote: { marginTop: 4, paddingHorizontal: 4 },
})
