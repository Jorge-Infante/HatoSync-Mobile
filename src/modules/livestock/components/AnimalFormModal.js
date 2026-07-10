import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { TextInput, Text, HelperText, IconButton, ActivityIndicator, Checkbox, Chip, useTheme } from 'react-native-paper'
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
import { syncAnimalPhotos } from '@/modules/livestock/store/livestockThunks'
import { SEX_OPTIONS } from '@/modules/livestock/constants'
import { selectIsFarmAdmin } from '@/modules/auth/roleSelectors'
import { mediaSource, todayISO } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

let photoSeq = 0

// Álbum en la galería del teléfono (como el de WhatsApp): las fotos tomadas
// desde la app quedan también ahí, no solo adjuntas al animal.
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

export default function AnimalFormModal({ visible, animal, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const toast = useToast()
  const isEdit = !!animal

  const animals = useSelector((s) => s.livestock.animals)
  const externalAnimals = useSelector((s) => s.livestock.externals)
  const breeds = useSelector((s) => s.configuration.breeds.filter((b) => b.is_active))
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
  const [assignedTo, setAssignedTo] = useState(null)
  const [idValues, setIdValues] = useState({})
  const [newPhotos, setNewPhotos] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [removedIds, setRemovedIds] = useState([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setName(animal?.name || '')
    setExternal(animal ? !!animal.is_external : false)
    setSex(animal?.sex || null)
    setBirthDate(animal?.birth_date || '')
    setMother(animal?.mother || null)
    setFather(animal?.father || null)
    setBreed(animal?.breed || null)
    setAssignedTo(animal?.assigned_to || null)
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError('Se necesita permiso para acceder a las fotos')
      return
    }
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
  // en el álbum HatoSync de la galería del teléfono.
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setError('Se necesita permiso para usar la cámara')
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

  // Mete el asset a la carpeta HatoSync (moviendo; si el scoped storage de ese
  // Android no deja mover, copiando).
  async function addToAlbum(asset, copy) {
    const album = await MediaLibrary.getAlbumAsync(DEVICE_ALBUM)
    if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, copy)
    else await MediaLibrary.createAlbumAsync(DEVICE_ALBUM, asset, copy)
  }

  async function saveToDeviceAlbum(uri) {
    try {
      // Pedir SOLO el permiso de fotos: sin granularPermissions, en Android 13+
      // se piden también video y audio, y si alguno no está declarado en el
      // manifest la llamada LANZA en vez de mostrar el diálogo.
      let perm
      try {
        perm = await MediaLibrary.requestPermissionsAsync(false, ['photo'])
      } catch {
        perm = await MediaLibrary.requestPermissionsAsync()
      }
      if (!perm.granted) {
        toast('Sin permiso de galería: la foto quedó solo en el animal', 'error')
        return
      }
      let asset
      try {
        asset = await MediaLibrary.createAssetAsync(uri) // ya está en la galería
      } catch {
        // Plan B: a la galería aunque sea sin carpeta propia
        await MediaLibrary.saveToLibraryAsync(uri)
        toast('Foto guardada en la galería (sin carpeta HatoSync)')
        return
      }
      try {
        try {
          await addToAlbum(asset, false)
        } catch {
          await addToAlbum(asset, true)
        }
        toast(`Foto guardada en la carpeta ${DEVICE_ALBUM} de tu galería`)
      } catch {
        toast(`Foto en la galería, pero no se pudo crear la carpeta ${DEVICE_ALBUM}`, 'error')
      }
    } catch (e) {
      // El detalle del error en pantalla: si vuelve a fallar, sabremos exactamente dónde
      toast(`No se pudo guardar en la galería: ${(e && e.message) || e}`, 'error')
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
    } else {
      if (breed != null) payload.breed = breed
      if (payload.mother === null) delete payload.mother
      if (payload.father === null) delete payload.father
      if (external) payload.is_external = true
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

  async function submit() {
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
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el animal'))
    } finally {
      setSaving(false)
    }
  }

  const allPhotos = [...existingPhotos, ...newPhotos]

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar animal' : 'Nuevo animal'}
      icon={isEdit ? 'pencil-outline' : 'plus'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Registrar animal'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
      {!isEdit ? (
        <Text variant="bodySmall" style={styles.hint}>
          Entrada de inventario: compras o carga del hato inicial. Los nacimientos se registran desde la madre con el parto.
        </Text>
      ) : external ? (
        <Chip icon="dna" compact style={styles.externalChip}>
          Genética externa (no aparece en el hato)
        </Chip>
      ) : null}

      {/* Photos */}
      <Text variant="labelSmall" style={styles.overline}>
        FOTOS
      </Text>
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

      {/* Fields */}
      <TextInput mode="outlined" label="Nombre *" value={name} onChangeText={setName} left={<TextInput.Icon icon="tag-outline" />} style={styles.field} />
      <PickerField label="Sexo *" value={sex} options={SEX_OPTIONS} onChange={setSex} style={styles.field} />
      <DateField label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} max={todayISO()} helperText="Si se omite, se usa hoy" style={styles.field} />
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
      <PickerField
        label="Padre (opcional)"
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

      {breeds.length ? (
        <PickerField label="Raza (opcional)" value={breed} options={breeds.map((b) => ({ label: b.name, value: b.id }))} onChange={setBreed} clearable style={styles.field} />
      ) : null}

      {isFarmAdmin && memberOptions.length ? (
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

      {idTypes.length ? (
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
      {!isEdit ? (
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
})
