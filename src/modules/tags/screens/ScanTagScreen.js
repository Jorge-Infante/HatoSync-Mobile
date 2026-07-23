import React, { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, Linking } from 'react-native'
import { Text, Button, Card, Chip, TextInput, IconButton, ActivityIndicator, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { CameraView, useCameraPermissions } from 'expo-camera'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import { useToast } from '@/modules/shared/components/Toast'
import { resolveTag, assignTag } from '@/modules/tags/store/tagsThunks'
import { parseScanned, isValidCode, formatCode } from '@/modules/tags/code'
import { getErrorMessage } from '@/api/errors'

/**
 * Escáner de chapetas QR. Dos modos:
 * - identify (default): leer el QR → si está asignada, DIRECTO a la ficha del
 *   animal; si está disponible, ofrece asociarla a un animal del hato.
 * - assign (route.params: { animalId, animalName, replace }): viene de la ficha
 *   ("Asociar chapeta" / "Reponer") → leer el QR → asociar y volver.
 * Funciona offline con la finca descargada (tabla tags + outbox idempotente).
 */
export default function ScanTagScreen({ route, navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const [permission, requestPermission] = useCameraPermissions()

  const mode = route.params?.animalId ? 'assign' : 'identify'
  const targetAnimalId = route.params?.animalId || null
  const targetAnimalName = route.params?.animalName || ''
  const replace = Boolean(route.params?.replace)

  const herd = useSelector((s) => s.livestock.animals)

  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null) // { kind, code, tag } — tarjeta de resultado
  const [torch, setTorch] = useState(false)
  const [manualVisible, setManualVisible] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [pickAnimalFor, setPickAnimalFor] = useState(null) // code → modal de selección
  const [pickedAnimal, setPickedAnimal] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const lastScanRef = useRef({ value: '', at: 0 })

  // Pedir el permiso UNA vez al entrar (el sistema lo recuerda; si el usuario
  // lo negó permanentemente solo queda abrir Ajustes).
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted])

  function onBarcodeScanned({ data }) {
    const now = Date.now()
    // candado anti-ráfaga: la cámara reporta el mismo QR muchas veces por segundo
    if (processing || result || pickAnimalFor) return
    if (lastScanRef.current.value === data && now - lastScanRef.current.at < 2500) return
    lastScanRef.current = { value: data, at: now }

    const code = parseScanned(data)
    if (!code) {
      toast('Ese QR no es una chapeta HatoSync', 'error')
      return
    }
    handleCode(code)
  }

  async function handleCode(code) {
    setProcessing(true)
    try {
      if (mode === 'assign') {
        await doAssign(code, targetAnimalId, replace)
        return
      }
      const info = await dispatch(resolveTag(code))
      if (info.status === 'ASSIGNED' && info.animal && info.animal.id) {
        // La identificación: leer y pum → la ficha.
        navigation.replace('AnimalDetail', { id: info.animal.id })
        return
      }
      setResult({ code, tag: info })
    } catch (e) {
      setResult({ code, error: getErrorMessage(e, 'No se pudo consultar la chapeta') })
    } finally {
      setProcessing(false)
    }
  }

  async function doAssign(code, animalId, withReplace) {
    setAssigning(true)
    try {
      const tag = await dispatch(assignTag({ code, animalId, replace: withReplace }))
      toast(
        tag && tag._pending
          ? `Chapeta ${formatCode(code)} asociada (se sincroniza al volver la señal)`
          : `Chapeta ${formatCode(code)} asociada`
      )
      navigation.navigate('AnimalDetail', { id: animalId, tagRefresh: Date.now() })
    } catch (e) {
      setResult({ code, error: getErrorMessage(e, 'No se pudo asociar la chapeta') })
    } finally {
      setAssigning(false)
      setProcessing(false)
    }
  }

  function submitManual() {
    const code = parseScanned(manualCode)
    if (!code) {
      toast('Código inválido: verifica los 9 caracteres', 'error')
      return
    }
    setManualVisible(false)
    setManualCode('')
    handleCode(code)
  }

  // Animales elegibles para una chapeta disponible: hato activo sin chapeta.
  const assignableOptions = herd
    .filter((a) => a.is_active !== false && !a.tag_code)
    .map((a) => ({ label: a.name, value: a.id }))

  const scanAgain = () => {
    setResult(null)
    lastScanRef.current = { value: '', at: 0 }
  }

  // --- Permiso de cámara ------------------------------------------------------
  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <IconButton icon="camera-off-outline" size={48} iconColor={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.centerTitle}>Se necesita la cámara</Text>
        <Text variant="bodyMedium" style={styles.centerText}>
          Para leer la chapeta QR de los animales, HatoSync necesita usar la cámara.
        </Text>
        {permission.canAskAgain ? (
          <Button mode="contained" onPress={requestPermission}>Permitir cámara</Button>
        ) : (
          <Button mode="contained" onPress={() => Linking.openSettings()}>Abrir Ajustes</Button>
        )}
        <Button mode="text" onPress={() => setManualVisible(true)}>Digitar el código a mano</Button>
        <ManualEntryModal
          visible={manualVisible}
          code={manualCode}
          onChange={setManualCode}
          onDismiss={() => setManualVisible(false)}
          onSubmit={submitManual}
          loading={processing || assigning}
        />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcodeScanned}
      />

      {/* Marco guía */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={[styles.frame, { borderColor: 'rgba(255,255,255,0.9)' }]} />
      </View>

      {/* Controles */}
      <View style={[styles.controls, { top: 12 + insets.top }]}>
        <IconButton
          icon={torch ? 'flashlight' : 'flashlight-off'}
          mode="contained-tonal"
          onPress={() => setTorch((v) => !v)}
        />
      </View>

      {/* Zona inferior: procesando / resultado / ayuda */}
      <View style={[styles.bottom, { paddingBottom: 16 + insets.bottom }]}>
        {processing || assigning ? (
          <Card style={styles.resultCard}>
            <Card.Content style={styles.processingRow}>
              <ActivityIndicator size={18} />
              <Text variant="bodyMedium">Consultando chapeta…</Text>
            </Card.Content>
          </Card>
        ) : result ? (
          <Card style={styles.resultCard}>
            <Card.Content>
              <View style={styles.resultHeader}>
                <Text variant="titleMedium" style={{ fontFamily: 'monospace' }}>{formatCode(result.code)}</Text>
                {result.tag ? (
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        result.tag.status === 'AVAILABLE' ? 'rgba(46,125,50,0.14)'
                        : result.tag.status === 'VOID' ? 'rgba(179,64,47,0.14)'
                        : 'rgba(140,110,40,0.14)',
                    }}
                  >
                    {result.tag.status_display}
                  </Chip>
                ) : null}
              </View>

              {result.error ? (
                <Text variant="bodyMedium" style={styles.resultText}>{result.error}</Text>
              ) : result.tag.status === 'AVAILABLE' ? (
                <>
                  <Text variant="bodyMedium" style={styles.resultText}>
                    Chapeta disponible: aún no está puesta en ningún animal.
                  </Text>
                  <Button
                    mode="contained"
                    icon="cow"
                    style={styles.resultAction}
                    onPress={() => { setPickedAnimal(null); setPickAnimalFor(result.code) }}
                  >
                    Asociar a un animal
                  </Button>
                </>
              ) : result.tag.status === 'VOID' ? (
                <Text variant="bodyMedium" style={styles.resultText}>
                  Esta chapeta está anulada (perdida o dañada). No identifica a ningún animal.
                </Text>
              ) : (
                <Text variant="bodyMedium" style={styles.resultText}>
                  Asignada a un animal al que no tienes acceso.
                </Text>
              )}

              <Button mode="text" onPress={scanAgain}>Escanear otra</Button>
            </Card.Content>
          </Card>
        ) : mode === 'assign' ? (
          // Modo asociación: el contexto va ABAJO (no un banner sobre el marco,
          // que tapaba el QR). Muestra a qué animal se asociará + digitar código.
          <Card style={styles.resultCard}>
            <Card.Content>
              <View style={styles.assignHeader}>
                <Chip compact icon="qrcode-plus">{replace ? 'Reponer chapeta' : 'Asociar chapeta'}</Chip>
              </View>
              <Text variant="bodyMedium" style={styles.resultText}>
                Escanea la chapeta para <Text style={{ fontWeight: '700' }}>{targetAnimalName}</Text>
                {replace ? '. La chapeta actual quedará anulada como perdida.' : '.'}
              </Text>
              <Button mode="text" compact onPress={() => setManualVisible(true)}>Digitar código</Button>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.resultCard}>
            <Card.Content style={styles.helpRow}>
              <Text variant="bodyMedium" style={styles.helpText}>
                Apunta al QR de la chapeta para abrir la ficha del animal.
              </Text>
              <Button mode="text" compact onPress={() => setManualVisible(true)}>Digitar código</Button>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Entrada manual (QR dañado por completo / sin luz) */}
      <ManualEntryModal
        visible={manualVisible}
        code={manualCode}
        onChange={setManualCode}
        onDismiss={() => setManualVisible(false)}
        onSubmit={submitManual}
        loading={processing || assigning}
      />

      {/* Elegir animal para una chapeta disponible (modo identify) */}
      <FormModal
        visible={!!pickAnimalFor}
        onDismiss={() => setPickAnimalFor(null)}
        title={`Asociar ${formatCode(pickAnimalFor || '')}`}
        icon="qrcode-plus"
        onSubmit={() => {
          if (!pickedAnimal) return toast('Elige el animal', 'error')
          const code = pickAnimalFor
          setPickAnimalFor(null)
          doAssign(code, pickedAnimal, false)
        }}
        submitLabel="Asociar"
        loading={assigning}
      >
        <PickerField
          label="Animal *"
          value={pickedAnimal}
          options={assignableOptions}
          onChange={setPickedAnimal}
          searchable
          noDataText="Todos los animales activos ya tienen chapeta"
          helperText="Solo animales del hato activo sin chapeta"
        />
      </FormModal>
    </View>
  )
}

function ManualEntryModal({ visible, code, onChange, onDismiss, onSubmit, loading }) {
  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title="Digitar código"
      icon="form-textbox"
      onSubmit={onSubmit}
      submitLabel="Buscar"
      loading={loading}
    >
      <TextInput
        mode="outlined"
        label="Código de la chapeta"
        placeholder="7Q4K-M2XN-C"
        value={code}
        onChangeText={(v) => onChange(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        left={<TextInput.Icon icon="qrcode" />}
        error={!!code && !isValidCode(code)}
      />
      <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 6 }}>
        Son los 9 caracteres impresos bajo el QR (con o sin guiones). El último es de verificación.
      </Text>
    </FormModal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  centerTitle: { fontWeight: '700' },
  centerText: { textAlign: 'center', opacity: 0.7, marginBottom: 8 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderRadius: 24, backgroundColor: 'transparent' },
  controls: { position: 'absolute', right: 8 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  resultCard: {},
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  assignHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  resultText: { opacity: 0.85, marginBottom: 4 },
  resultAction: { marginTop: 8, marginBottom: 4 },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  helpText: { flex: 1, opacity: 0.85 },
})
