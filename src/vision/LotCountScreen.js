import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Text, Button, Avatar, ActivityIndicator, SegmentedButtons, useTheme } from 'react-native-paper'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { analyzePhoto, postprocess, loadSession, SENSITIVITY } from '@/vision/cattleCounter'
import { useToast } from '@/modules/shared/components/Toast'

/**
 * Contar lote con la cámara (visión computacional Fase A, PLANNING §6.5).
 * 100% on-device/offline: foto → YOLOv8n embebido → conteo con cajas.
 * La sensibilidad re-cuenta sobre la salida cruda sin re-inferir.
 */
export default function LotCountScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()

  const [photo, setPhoto] = useState(null) // { uri, width, height }
  const [raw, setRaw] = useState(null) // Float32Array (salida del modelo)
  const [analyzing, setAnalyzing] = useState(false)
  const [sensitivity, setSensitivity] = useState('normal')
  const [imgBox, setImgBox] = useState(null) // tamaño renderizado para el overlay

  // Precalentar el modelo al abrir la pantalla (el runtime ya está listo aquí;
  // ORT se carga perezoso — ver cattleCounter). Errores → toast, nunca crash.
  useEffect(() => {
    loadSession().catch((e) => toast(`No se pudo cargar el modelo: ${(e && e.message) || e}`, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const detections = useMemo(
    () => (raw ? postprocess(raw, SENSITIVITY[sensitivity].conf) : null),
    [raw, sensitivity]
  )
  const cows = detections ? detections.cow : []
  const others = detections ? detections.horse.length + detections.sheep.length : 0

  const analyze = useCallback(
    async (asset) => {
      setPhoto({ uri: asset.uri, width: asset.width || 4, height: asset.height || 3 })
      setRaw(null)
      setAnalyzing(true)
      try {
        const t0 = Date.now()
        const output = await analyzePhoto(asset.uri)
        setRaw(output)
        toast(`Análisis en ${((Date.now() - t0) / 1000).toFixed(1)} s`)
      } catch (e) {
        toast(`No se pudo analizar la foto: ${(e && e.message) || e}`, 'error')
        setPhoto(null)
      } finally {
        setAnalyzing(false)
      }
    },
    [toast]
  )

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return toast('Se necesita permiso de cámara', 'error')
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 })
    if (!result.canceled) analyze(result.assets[0])
  }

  async function fromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return toast('Se necesita permiso de fotos', 'error')
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 })
    if (!result.canceled) analyze(result.assets[0])
  }

  const aspectRatio = photo ? photo.width / photo.height : 4 / 3

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
    >
      <Text variant="labelSmall" style={styles.overline}>VISIÓN COMPUTACIONAL · OFFLINE</Text>
      <Text variant="headlineSmall" style={styles.title}>Contar lote</Text>
      <Text variant="bodySmall" style={styles.muted}>
        Toma una foto del lote y la app cuenta los animales visibles, sin señal. Es un
        estimado: cuenta lo que se ve en la foto.
      </Text>

      <View style={styles.actions}>
        <Button mode="contained" icon="camera" onPress={fromCamera} disabled={analyzing}>
          Tomar foto
        </Button>
        <Button mode="contained-tonal" icon="image-multiple-outline" onPress={fromGallery} disabled={analyzing}>
          Galería
        </Button>
      </View>

      {!photo ? (
        <View style={styles.empty}>
          <Avatar.Icon size={64} icon="cow" color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
          <Text variant="bodyMedium" style={[styles.muted, styles.emptyText]}>
            Encuadra el lote completo; funciona mejor con los animales a la vista (no amontonados
            contra la cámara).
          </Text>
        </View>
      ) : (
        <>
          {/* Foto + cajas superpuestas (coordenadas normalizadas 0-1) */}
          <View
            style={[styles.photoWrap, { aspectRatio, borderColor: theme.colors.outlineVariant }]}
            onLayout={(e) => setImgBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          >
            <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
            {imgBox && cows.map((b, i) => (
              <View
                key={i}
                pointerEvents="none"
                style={[
                  styles.box,
                  {
                    left: b.left * imgBox.w,
                    top: b.top * imgBox.h,
                    width: b.width * imgBox.w,
                    height: b.height * imgBox.h,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text style={[styles.boxScore, { backgroundColor: theme.colors.primary }]}>
                  {Math.round(b.score * 100)}%
                </Text>
              </View>
            ))}
            {analyzing ? (
              <View style={styles.analyzing}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.analyzingText}>Analizando…</Text>
              </View>
            ) : null}
          </View>

          {raw ? (
            <>
              {/* Resultado */}
              <View style={styles.result}>
                <Text variant="displaySmall" style={[styles.count, { color: theme.colors.primary }]}>
                  {cows.length}
                </Text>
                <Text variant="titleMedium" style={styles.countLabel}>
                  {cows.length === 1 ? 'animal detectado' : 'animales detectados'}
                </Text>
                {others > 0 ? (
                  <Text variant="bodySmall" style={styles.muted}>
                    (también se ven {others} equino(s)/ovino(s) no incluidos en el conteo)
                  </Text>
                ) : null}
              </View>

              <Text variant="labelSmall" style={[styles.overline, styles.sensLabel]}>SENSIBILIDAD</Text>
              <SegmentedButtons
                value={sensitivity}
                onValueChange={setSensitivity}
                buttons={Object.entries(SENSITIVITY).map(([value, s]) => ({ value, label: s.label }))}
              />
              <Text variant="bodySmall" style={[styles.muted, styles.sensHint]}>
                Si contó de más, usa Estricto; si le faltaron animales lejanos, usa Sensible.
              </Text>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },
  overline: { letterSpacing: 1.2, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { textAlign: 'center', paddingHorizontal: 24 },
  photoWrap: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  box: { position: 'absolute', borderWidth: 2, borderRadius: 4 },
  boxScore: { position: 'absolute', top: -1, left: -1, color: '#fff', fontSize: 8, fontWeight: '700', paddingHorizontal: 3, borderRadius: 3, overflow: 'hidden' },
  analyzing: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27,43,29,0.55)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  analyzingText: { color: '#fff', fontWeight: '600' },
  result: { alignItems: 'center', marginTop: 16, marginBottom: 8 },
  count: { fontWeight: '800' },
  countLabel: { fontWeight: '600', marginTop: -4 },
  sensLabel: { marginTop: 12, marginBottom: 6 },
  sensHint: { marginTop: 6 },
})
