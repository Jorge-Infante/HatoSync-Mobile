import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { TextInput, Text, HelperText, IconButton, ActivityIndicator, Checkbox, Chip, Switch, Divider, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import * as ImagePicker from 'expo-image-picker'
// /legacy: en SDK 56 la API de funciones (createAssetAsync, getAlbumAsync...)
// se movió ahí; importarla del paquete raíz LANZA "deprecated" en runtime.
import * as MediaLibrary from 'expo-media-library/legacy'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import FormModal from '@/modules/shared/components/FormModal'
import { useToast } from '@/modules/shared/components/Toast'
import DateField from '@/modules/shared/components/DateField'
import PickerField from '@/modules/shared/components/PickerField'
import { createItem, updateItem, fetchState } from '@/modules/shared/store/sharedThunks'
import { syncAnimalPhotos, createReproductionEvent } from '@/modules/livestock/store/livestockThunks'
import { SEX_OPTIONS } from '@/modules/livestock/constants'
import { selectIsFarmAdmin } from '@/modules/auth/roleSelectors'
import { mediaSource, todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

let photoSeq = 0

// Carpeta propia en la galería del teléfono para las fotos tomadas desde la app.
const DEVICE_ALBUM = 'HatoSync'

// Lado máximo con el que una foto viaja al servidor. Las fotos de cámara salen
// en 3-8 MB y la lista las descarga enteras para un avatar: comprimirlas antes
// de subir es la mayor mejora de tiempos de carga. A la galería del teléfono
// va la ORIGINAL en alta resolución.
// 2560/0.85 (no menos): la foto del servidor es la que ven compradores en el
// web/monitores grandes y con zoom — calidad visual es parte del negocio.
const UPLOAD_MAX_SIDE = 2560
const UPLOAD_QUALITY = 0.85

async function optimizeForUpload(asset) {
  const original = {
    uri: asset.uri,
    name: asset.fileName || asset.uri.split('/').pop() || `photo_${photoSeq}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  }
  try {
    const landscape = (asset.width || 0) >= (asset.height || 0)
    const needsResize = Math.max(asset.width || 0, asset.height || 0) > UPLOAD_MAX_SIDE
    const result = await manipulateAsync(
      asset.uri,
      needsResize ? [{ resize: landscape ? { width: UPLOAD_MAX_SIDE } : { height: UPLOAD_MAX_SIDE } }] : [],
      { compress: UPLOAD_QUALITY, format: SaveFormat.JPEG },
    )
    return { uri: result.uri, name: original.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg' }
  } catch {
    return original // mejor subirla pesada que no subirla
  }
}

// birthMother: si viene, el modal registra un PARTO de esa madre — el formulario
// completo de la cría (madre fija, padre/fecha editables, toggle "nació viva" al
// final). Crea la cría completa + el evento BIRTH que la referencia (descompuesto,
// igual online y offline). Espejo del modo parto de AnimalFormDialog.vue.
// prefill (solo en create): precarga campos, p. ej. { lot } desde la vista de un lote.
export default function AnimalFormModal({ visible, animal, birthMother, prefill, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const toast = useToast()
  const isEdit = !!animal
  const isBirth = !!birthMother && !animal

  const animals = useSelector((s) => s.livestock.animals)
  const externalAnimals = useSelector((s) => s.livestock.externals)
  const breeds = useSelector((s) => s.configuration.breeds.filter((b) => b.is_active))
  const lots = useSelector((s) => s.configuration.lots.filter((l) => l.is_active))
  const idTypes = useSelector((s) => s.configuration.identificationTypes.filter((t) => t.is_active))
  // Asignación a un miembro (regla del socio): solo la maneja un admin.
  // Fuente = la lista VIVA de /farms/members/ (se refresca al abrir el modal);
  // los members embebidos en GET /farms/ son solo respaldo offline — ese
  // snapshot se queda viejo cuando se crea/edita un miembro en la sesión.
  const isFarmAdmin = useSelector(selectIsFarmAdmin)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const farms = useSelector((s) => s.farms.farms)
  const liveMembers = useSelector((s) => s.farms.members)
  const activeFarm = farms.find((f) => f.id === activeFarmId)
  const memberSource = liveMembers.length ? liveMembers : (activeFarm && activeFarm.members) || []
  const memberOptions = memberSource.map((m) => ({
    label: `${m.user && m.user.full_name ? m.user.full_name : m.full_name} (${m.role_display})`,
    value: m.id,
  }))

  const females = animals.filter((a) => a.sex === 'FEMALE' && (!animal || a.id !== animal.id))
  const males = animals.filter((a) => a.sex === 'MALE' && (!animal || a.id !== animal.id))
  const externalFemales = externalAnimals.filter((a) => a.sex === 'FEMALE' && (!animal || a.id !== animal.id))
  const externalMales = externalAnimals.filter((a) => a.sex === 'MALE' && (!animal || a.id !== animal.id))

  const [name, setName] = useState('')
  const [external, setExternal] = useState(false) // solo al crear; el flag es inmutable en el server
  const [sex, setSex] = useState(null)
  const [birthDate, setBirthDate] = useState('')
  const [mother, setMother] = useState(null)
  const [father, setFather] = useState(null)
  const [breed, setBreed] = useState(null)
  const [lot, setLot] = useState(null)
  const [assignedTo, setAssignedTo] = useState(null)
  // Modo parto: si la cría nació viva (si no, solo se registra el evento BIRTH).
  const [bornAlive, setBornAlive] = useState(true)
  const [birthNotes, setBirthNotes] = useState('')
  const [idValues, setIdValues] = useState({})
  const [newPhotos, setNewPhotos] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [removedIds, setRemovedIds] = useState([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Assets de galería tomados en esta sesión, pendientes de moverse a la carpeta
  // "HatoSync" EN LOTE al guardar (1 solo aviso del sistema, no uno por foto).
  const pendingAlbumAssets = useRef([])

  useEffect(() => {
    if (!visible) return
    pendingAlbumAssets.current = []
    setName(animal?.name || '')
    setExternal(animal ? !!animal.is_external : false)
    setSex(animal?.sex || null)
    // Parto: la fecha por defecto es hoy y la madre queda fija (viene de la acción).
    setBirthDate(animal?.birth_date || (isBirth ? todayISO() : ''))
    setMother(animal?.mother || (isBirth ? birthMother.id : null))
    setFather(animal?.father || null)
    setBreed(animal?.breed || null)
    setLot(animal?.lot || (!animal && prefill?.lot) || null)
    setAssignedTo(animal?.assigned_to || null)
    setBornAlive(true)
    setBirthNotes('')
    const ids = {}
    if (animal && Array.isArray(animal.identifications)) {
      animal.identifications.forEach((id) => {
        ids[id.identification_type] = id.value
      })
    }
    setIdValues(ids)
    setNewPhotos([])
    setRemovedIds([])
    setExistingPhotos(
      animal && Array.isArray(animal.photos)
        ? animal.photos.map((p) => ({ key: `e${p.id}`, id: p.id, source: mediaSource(p.image) }))
        : []
    )
    setError('')
    loadCatalogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  async function loadCatalogs() {
    setCatalogsLoading(true)
    try {
      const requests = [
        dispatch(fetchState({ module: 'configuration', nameState: 'breeds', url: '/configuration/breeds/' })),
        dispatch(fetchState({ module: 'configuration', nameState: 'identificationTypes', url: '/configuration/identification-types/' })),
        dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' })),
      ]
      if (isFarmAdmin) {
        // Miembros frescos para "Asignado a" (endpoint admin-only). Si falla
        // (offline), queda el respaldo: lo hidratado o el snapshot embebido.
        requests.push(dispatch(fetchState({ module: 'farms', nameState: 'members', url: '/farms/members/' })).catch(() => {}))
      }
      await Promise.all(requests)
    } catch {
      // catalogs optional
    } finally {
      setCatalogsLoading(false)
    }
  }

  async function pickImages() {
    // SIN pedir permiso: launchImageLibraryAsync usa el Photo Picker del
    // sistema (Android 11+/iOS PHPicker), que no requiere permiso de galería.
    // Pedirlo aquí era una de las causas del "permitir y permitir": en
    // Android 14 con acceso parcial el sistema re-mostraba el diálogo SIEMPRE.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1, // sin recompresión del picker; optimizeForUpload decide el tamaño final
    })
    if (result.canceled) return
    const picked = await Promise.all(
      result.assets.map(async (a) => ({ key: `n${photoSeq++}`, ...(await optimizeForUpload(a)) })),
    )
    setNewPhotos((prev) => [...prev, ...picked])
  }

  // Tomar la foto sin salir del formulario: queda adjunta al animal Y guardada
  // en la galería del teléfono.
  async function takePhoto() {
    // Consultar primero (sin diálogo) y pedir solo si nunca se ha concedido:
    // el permiso se pide UNA vez, como WhatsApp.
    let perm = await ImagePicker.getCameraPermissionsAsync()
    if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setError('Se necesita permiso para usar la cámara. Actívalo en Ajustes > Aplicaciones > HatoSync.')
      return
    }
    // quality 1: la captura queda intacta — la galería del teléfono recibe la
    // foto a calidad de cámara; la compresión solo aplica a la copia que sube.
    const result = await ImagePicker.launchCameraAsync({ quality: 1 })
    if (result.canceled) return
    const a = result.assets[0]
    saveToDeviceAlbum(a.uri) // la ORIGINAL al teléfono; sin await: no frena la captura
    const optimized = await optimizeForUpload(a)
    setNewPhotos((prev) => [...prev, { key: `n${photoSeq++}`, ...optimized }])
  }

  // Permiso de galería pedido UNA sola vez (estilo WhatsApp). El bug del
  // "permitir y permitir": llamar requestPermissionsAsync en CADA foto — con
  // acceso parcial de Android 14 ("Seleccionar fotos") el sistema re-muestra
  // el selector en cada request aunque ya haya acceso. La regla: consultar
  // primero con getPermissionsAsync (nunca abre diálogo) y pedir solo si
  // realmente falta; 'limited' cuenta como concedido.
  async function ensureGalleryPermission() {
    const usable = (p) => p && (p.granted || p.accessPrivileges === 'limited')
    let perm
    try {
      perm = await MediaLibrary.getPermissionsAsync(false, ['photo'])
    } catch {
      perm = await MediaLibrary.getPermissionsAsync().catch(() => null)
    }
    if (usable(perm)) return true
    if (perm && !perm.canAskAgain) return false // denegado permanente: no insistir
    // Pedir SOLO el permiso de fotos: sin granularPermissions, en Android 13+
    // se piden también video y audio, y si alguno no está declarado en el
    // manifest la llamada LANZA en vez de mostrar el diálogo.
    try {
      perm = await MediaLibrary.requestPermissionsAsync(false, ['photo'])
    } catch {
      perm = await MediaLibrary.requestPermissionsAsync().catch(() => null)
    }
    return usable(perm)
  }

  // Al capturar: crea el asset en la galería (createAssetAsync NO pide permiso de
  // "modificar") y lo ACUMULA. El movimiento a la carpeta "HatoSync" —que SÍ pide
  // el permiso del sistema en Android 11+— se hace EN LOTE al guardar el animal
  // (flushAlbumAssets), así el aviso sale UNA vez por guardado y no una por foto.
  async function saveToDeviceAlbum(uri) {
    try {
      if (!(await ensureGalleryPermission())) {
        toast('Sin permiso de galería: la foto quedó solo en el animal', 'error')
        return
      }
      const asset = await MediaLibrary.createAssetAsync(uri) // guarda en galería, sin prompt
      pendingAlbumAssets.current.push(asset)
    } catch (e) {
      toast(`No se pudo guardar en la galería: ${(e && e.message) || e}`, 'error')
    }
  }

  // Mueve TODAS las fotos de la sesión a la carpeta "HatoSync" en un solo paso
  // (un único aviso del sistema). Debe AWAITearse ANTES de cerrar el formulario:
  // el movimiento en Android 11+ abre un diálogo del sistema (createWriteRequest)
  // que necesita la Activity estable; si se dispara mientras la pantalla navega,
  // falla en silencio y la foto se queda en DCIM. El resultado se avisa por toast
  // (incluye el error real) para no fallar mudo.
  async function flushAlbumAssets() {
    const assets = pendingAlbumAssets.current
    pendingAlbumAssets.current = []
    if (!assets.length) return
    try {
      if (!(await ensureGalleryPermission())) return
      let album = await MediaLibrary.getAlbumAsync(DEVICE_ALBUM)
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync(assets, album, false)
      } else {
        // Primera vez: crear la carpeta con la 1ª foto y agregar el resto.
        await MediaLibrary.createAlbumAsync(DEVICE_ALBUM, assets[0], false)
        if (assets.length > 1) {
          album = await MediaLibrary.getAlbumAsync(DEVICE_ALBUM)
          if (album) await MediaLibrary.addAssetsToAlbumAsync(assets.slice(1), album, false)
        }
      }
      toast(`Foto(s) guardada(s) en la carpeta ${DEVICE_ALBUM}`)
    } catch (e) {
      // Rechazó mover / scoped storage: quedan en la galería general.
      toast(`Fotos en tu galería (no en carpeta ${DEVICE_ALBUM}): ${(e && e.message) || e}`, 'error')
    }
  }

  function removeExisting(photo) {
    setRemovedIds((prev) => [...prev, photo.id])
    setExistingPhotos((prev) => prev.filter((p) => p.key !== photo.key))
  }
  function removeNew(photo) {
    setNewPhotos((prev) => prev.filter((p) => p.key !== photo.key))
  }

  function setId(typeId, value) {
    setIdValues((prev) => ({ ...prev, [typeId]: (value || '').replace(/\D/g, '') }))
  }

  function buildPayload() {
    const payload = { name: name.trim(), sex, mother, father }
    if (birthDate) payload.birth_date = birthDate
    if (isEdit) {
      payload.breed = breed
      payload.lot = lot
    } else {
      if (breed != null) payload.breed = breed
      if (lot != null) payload.lot = lot
      if (payload.mother === null) delete payload.mother
      if (payload.father === null) delete payload.father
      if (external && !isBirth) payload.is_external = true
    }
    if (idTypes.length) {
      const ids = idTypes
        .map((t) => ({ identification_type: t.id, value: (idValues[t.id] || '').trim() }))
        .filter((e) => e.value)
      if (isEdit || ids.length) payload.identifications = ids
    }
    // Solo un admin puede (des)asignar; los demás omiten la clave para que el
    // backend no rechace el guardado.
    if (isFarmAdmin) {
      if (isEdit) payload.assigned_to = assignedTo
      else if (assignedTo != null) payload.assigned_to = assignedTo
    }
    return payload
  }

  // Parto: crea la cría completa (si nació viva) y SIEMPRE el evento BIRTH en la
  // madre. Descompuesto (animal + evento) — funciona igual online y offline.
  async function submitBirth() {
    if (!birthDate) return setError('La fecha del parto es requerida')
    if (bornAlive) {
      if (!name.trim()) return setError('El nombre de la cría es requerido')
      if (!sex) return setError('El sexo de la cría es requerido')
    }
    setSaving(true)
    setError('')
    try {
      const eventData = { event_type: 'BIRTH', date: birthDate }
      if (father) eventData.sire = father
      if (birthNotes.trim()) eventData.notes = birthNotes.trim()

      let calf = null
      if (bornAlive) {
        calf = await dispatch(createItem({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/', data: buildPayload() }))
        if (newPhotos.length) {
          const photoResult = await dispatch(
            syncAnimalPhotos({
              animalId: calf.id,
              newFiles: newPhotos.map((p) => ({ uri: p.uri, name: p.name, type: p.type })),
              removedIds: [],
            })
          )
          if (photoResult && photoResult.queued) {
            toast(`${photoResult.queued} foto(s) quedan por subir; se enviarán al volver la señal`)
          }
        }
        eventData.offspring = calf.id
      }
      await dispatch(createReproductionEvent({ animalId: birthMother.id, data: eventData }))

      await flushAlbumAssets() // mover fotos a la carpeta HatoSync (1 aviso) con la Activity estable
      onSaved && onSaved({ isEdit: false, birth: true, calfName: bornAlive ? name.trim() : null })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo registrar el parto'))
    } finally {
      setSaving(false)
    }
  }

  async function submit() {
    if (isBirth) return submitBirth()
    if (!name.trim()) return setError('El nombre es requerido')
    if (!sex) return setError('El sexo es requerido')
    setSaving(true)
    setError('')
    try {
      const payload = buildPayload()
      // Los externos viven en su propio estado para no colarse en el hato
      const nameState = external ? 'externals' : 'animals'
      const saved = isEdit
        ? await dispatch(updateItem({ module: 'livestock', nameState, url: `/livestock/animals/${animal.id}/`, data: payload }))
        : await dispatch(createItem({ module: 'livestock', nameState, url: '/livestock/animals/', data: payload }))

      if (newPhotos.length || removedIds.length) {
        const photoResult = await dispatch(
          syncAnimalPhotos({
            animalId: saved.id,
            newFiles: newPhotos.map((p) => ({ uri: p.uri, name: p.name, type: p.type })),
            removedIds,
          })
        )
        if (photoResult && photoResult.queued) {
          toast(`${photoResult.queued} foto(s) quedan por subir; se enviarán al volver la señal`)
        }
      }
      await flushAlbumAssets() // mover fotos a la carpeta HatoSync (1 aviso) con la Activity estable
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el animal'))
    } finally {
      setSaving(false)
    }
  }

  const allPhotos = [...existingPhotos, ...newPhotos]
  // En modo parto los campos de la cría solo aplican si nació viva.
  const showAnimalFields = !isBirth || bornAlive

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isBirth ? 'Registrar parto' : isEdit ? 'Editar animal' : 'Nuevo animal'}
      icon={isBirth ? 'baby-bottle-outline' : isEdit ? 'pencil-outline' : 'plus'}
      onSubmit={submit}
      submitLabel={isBirth ? 'Registrar parto' : isEdit ? 'Guardar cambios' : 'Registrar animal'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      {isBirth ? (
        <Chip icon="cow" compact style={styles.externalChip}>
          Madre: {birthMother.name}
        </Chip>
      ) : !isEdit ? (
        <Text variant="bodySmall" style={styles.hint}>
          Entrada de inventario: compras o carga del hato inicial. Los nacimientos se registran desde la madre con el parto.
        </Text>
      ) : external ? (
        <Chip icon="dna" compact style={styles.externalChip}>
          Genética externa (no aparece en el hato)
        </Chip>
      ) : null}

      {/* Photos */}
      {showAnimalFields ? (
      <Text variant="labelSmall" style={styles.overline}>
        FOTOS
      </Text>
      ) : null}
      {showAnimalFields ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
        {/* Acciones SIEMPRE fijas en las dos primeras posiciones; las fotos
            se van acomodando a la derecha */}
        <Pressable style={[styles.addTile, { borderColor: theme.colors.primary }]} onPress={takePhoto}>
          <IconButton icon="camera-outline" size={22} iconColor={theme.colors.primary} style={styles.tileIcon} />
          <Text variant="labelSmall" style={[styles.tileLabel, { color: theme.colors.primary }]}>
            Cámara
          </Text>
        </Pressable>
        <Pressable style={[styles.addTile, { borderColor: theme.colors.primary }]} onPress={pickImages}>
          <IconButton icon="image-multiple-outline" size={22} iconColor={theme.colors.primary} style={styles.tileIcon} />
          <Text variant="labelSmall" style={[styles.tileLabel, { color: theme.colors.primary }]}>
            Galería
          </Text>
        </Pressable>

        {allPhotos.map((photo, i) => (
          <View key={photo.key} style={[styles.photoTile, { borderColor: theme.colors.outline }]}>
            <Image source={photo.source || { uri: photo.uri }} style={styles.photoImg} contentFit="cover" />
            {i === 0 ? (
              <Text style={styles.coverBadge} variant="labelSmall">
                Portada
              </Text>
            ) : null}
            <IconButton
              icon="close"
              size={14}
              iconColor="#fff"
              style={styles.removeBtn}
              onPress={() => (photo.id != null ? removeExisting(photo) : removeNew(photo))}
            />
          </View>
        ))}
      </ScrollView>
      ) : null}

      {/* Fields */}
      {showAnimalFields ? (
        <>
          <TextInput mode="outlined" label={isBirth ? 'Nombre de la cría *' : 'Nombre *'} value={name} onChangeText={setName} left={<TextInput.Icon icon="tag-outline" />} style={styles.field} />
          <PickerField label="Sexo *" value={sex} options={SEX_OPTIONS} onChange={setSex} style={styles.field} />
        </>
      ) : null}
      <DateField
        label={isBirth ? 'Fecha del parto *' : 'Fecha de nacimiento'}
        value={birthDate}
        onChange={setBirthDate}
        max={todayISO()}
        helperText={isBirth ? undefined : 'Si se omite, se usa hoy'}
        style={styles.field}
      />
      {/* Madre: en modo parto es fija (viene de la acción) → se oculta el picker */}
      {!isBirth ? (
      <PickerField
        label="Madre (opcional)"
        value={mother}
        options={[
          ...females.map((a) => ({ label: a.name, value: a.id })),
          ...externalFemales.map((a) => ({ label: `${a.name} (externa)`, value: a.id })),
        ]}
        onChange={setMother}
        searchable
        clearable
        noDataText="No hay hembras registradas"
        style={styles.field}
      />
      ) : null}
      <PickerField
        label={isBirth ? 'Padre / Toro (opcional)' : 'Padre (opcional)'}
        value={father}
        options={[
          ...males.map((a) => ({ label: a.name, value: a.id })),
          ...externalMales.map((a) => ({ label: `${a.name} (externo)`, value: a.id })),
        ]}
        onChange={setFather}
        searchable
        clearable
        noDataText="No hay machos registrados"
        style={styles.field}
      />

      {catalogsLoading ? (
        <View style={styles.catalogLoading}>
          <ActivityIndicator size={16} />
          <Text variant="bodySmall" style={styles.muted}>
            Cargando catálogos de la finca…
          </Text>
        </View>
      ) : null}

      {showAnimalFields && breeds.length ? (
        <PickerField label="Raza (opcional)" value={breed} options={breeds.map((b) => ({ label: b.name, value: b.id }))} onChange={setBreed} clearable style={styles.field} />
      ) : null}

      {showAnimalFields && lots.length ? (
        <PickerField label="Lote (opcional)" value={lot} options={lots.map((l) => ({ label: l.name, value: l.id }))} onChange={setLot} clearable style={styles.field} />
      ) : null}

      {showAnimalFields && isFarmAdmin && memberOptions.length ? (
        <PickerField
          label="Asignado a (opcional)"
          value={assignedTo}
          options={memberOptions}
          onChange={setAssignedTo}
          clearable
          helperText="Un socio solo podrá consultar los animales asignados a él"
          style={styles.field}
        />
      ) : null}

      {showAnimalFields && idTypes.length ? (
        <>
          <Text variant="labelSmall" style={styles.overline}>
            IDENTIFICACIÓN
          </Text>
          {idTypes.map((type) => (
            <TextInput
              key={type.id}
              mode="outlined"
              label={type.name}
              value={idValues[type.id] || ''}
              onChangeText={(v) => setId(type.id, v)}
              keyboardType="numeric"
              left={<TextInput.Icon icon="tag-outline" />}
              style={styles.field}
            />
          ))}
        </>
      ) : null}

      {/* External genetics: at the end of the form, right above the actions */}
      {!isEdit && !isBirth ? (
        <>
          <Checkbox.Item
            label="Genética externa"
            status={external ? 'checked' : 'unchecked'}
            onPress={() => setExternal((v) => !v)}
            position="leading"
            labelVariant="bodyMedium"
            style={styles.checkbox}
          />
          {external ? (
            <Text variant="bodySmall" style={styles.hint}>
              Pajilla de semen o toro/vaca que no es tuyo: se usa como padre o madre en la genealogía, pero no aparecerá en el hato.
            </Text>
          ) : null}
        </>
      ) : null}

      {/* Modo parto: toggle "nació viva" + notas del parto, al final del form */}
      {isBirth ? (
        <>
          <Divider style={styles.birthDivider} />
          <View style={styles.switchRow}>
            <Text variant="bodyMedium">La cría nació viva</Text>
            <Switch value={bornAlive} onValueChange={setBornAlive} />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            {bornAlive
              ? 'Completa los datos de la cría arriba; queda enlazada a la madre y a la fecha del parto (sin volver a editar).'
              : 'Se registrará el parto sin cría (mortinato); no se creará un animal.'}
          </Text>
          <TextInput
            mode="outlined"
            label="Notas del parto (opcional)"
            value={birthNotes}
            onChangeText={setBirthNotes}
            multiline
            numberOfLines={2}
            style={styles.field}
          />
        </>
      ) : null}
    </FormModal>
  )
}

const styles = StyleSheet.create({
  hint: { opacity: 0.7, marginBottom: 12 },
  checkbox: { paddingHorizontal: 0 },
  externalChip: { alignSelf: 'flex-start', marginBottom: 12 },
  overline: { letterSpacing: 1.2, opacity: 0.6, marginBottom: 8, marginTop: 4 },
  field: { marginBottom: 12 },
  muted: { opacity: 0.7 },
  photoStrip: { marginBottom: 12 },
  photoTile: { width: 88, height: 88, borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginRight: 10, position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', left: 4, bottom: 4, color: '#fff', backgroundColor: 'rgba(46,125,50,0.92)', paddingHorizontal: 6, borderRadius: 8, fontSize: 9 },
  removeBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: 'rgba(27,43,29,0.6)', margin: 0 },
  addTile: { width: 88, height: 88, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,125,50,0.03)', marginRight: 10 },
  tileIcon: { margin: 0 },
  tileLabel: { marginTop: -4, fontWeight: '600' },
  catalogLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  birthDivider: { marginVertical: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
})
