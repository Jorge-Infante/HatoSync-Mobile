import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import {
  Text, TextInput, Searchbar, List, Chip, FAB, Button, IconButton, Surface, useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { Map as MLMap, Camera, GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native'
import * as Location from 'expo-location'
import turfArea from '@turf/area'
import turfLength from '@turf/length'
import turfBbox from '@turf/bbox'
import apiClient from '@/api/client'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import FormModal from '@/modules/shared/components/FormModal'
import { PADDOCK_COLORS, DRAW_COLOR } from '../constants'

const FALLBACK_CENTER = [-73.2, 4.6]
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const STREET_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// Misma decisión que el web: maxzoom 17 en la fuente satelital (más allá Esri
// devuelve baldosas "Map data not yet available"; el mapa estira la última real).
function buildMapStyle(baseLayer) {
  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: 17,
        attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
      },
      streets: {
        type: 'raster',
        tiles: [STREET_TILES],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: baseLayer === 'satellite' ? 'visible' : 'none' } },
      { id: 'streets', type: 'raster', source: 'streets', layout: { visibility: baseLayer === 'streets' ? 'visible' : 'none' } },
    ],
  }
}

function closedRing(vertices) {
  return [...vertices, vertices[0]]
}

function roundCoord([lon, lat]) {
  return [Number(lon.toFixed(7)), Number(lat.toFixed(7))]
}

/**
 * Editor de potrero sobre mapa satelital (espejo del PaddockEditorPage web).
 * Dibujo por vértices: tocar el mapa agrega un punto; tocar un punto lo
 * selecciona (el siguiente toque del mapa lo reubica, o se elimina con el
 * botón). Área y perímetro en vivo con Turf. route.params.id = editar.
 */
export default function PaddockEditorScreen({ navigation, route }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const cameraRef = useRef(null)
  const paddockId = route.params && route.params.id
  const paddocks = useSelector((s) => s.paddocks.paddocks)

  const [editing, setEditing] = useState(null)
  const [vertices, setVertices] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [baseLayer, setBaseLayer] = useState('satellite')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [saveVisible, setSaveVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#2E7D32', notes: '' })

  // --- carga (modo edición) ---
  useEffect(() => {
    if (!paddockId) return
    const fromStore = paddocks.find((p) => p.id === paddockId)
    const apply = (paddock) => {
      setEditing(paddock)
      setForm({ name: paddock.name, color: paddock.color || '#2E7D32', notes: paddock.notes || '' })
      const ring = paddock.geometry.coordinates[0]
      const opened = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring
      setVertices(opened.map(roundCoord))
      setTimeout(() => {
        const [w, s, e, n] = turfBbox({ type: 'Feature', geometry: paddock.geometry, properties: {} })
        cameraRef.current && cameraRef.current.fitBounds([w, s, e, n], { padding: { top: 80, right: 80, bottom: 160, left: 80 }, duration: 400 })
      }, 400)
    }
    if (fromStore) {
      apply(fromStore)
    } else {
      apiClient
        .get(`/farms/paddocks/${paddockId}/`)
        .then((r) => apply(r.data))
        .catch((e) => {
          toast(getErrorMessage(e, 'No se pudo cargar el potrero'), 'error')
          navigation.goBack()
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddockId])

  // --- vista inicial (crear): encuadrar los potreros existentes ---
  const initialViewState = useMemo(() => {
    if (paddockId) return { center: FALLBACK_CENTER, zoom: 5 }
    const features = paddocks.map((p) => ({ type: 'Feature', geometry: p.geometry, properties: {} }))
    if (!features.length) return { center: FALLBACK_CENTER, zoom: 5 }
    const [w, s, e, n] = turfBbox({ type: 'FeatureCollection', features })
    return { bounds: [w, s, e, n], padding: { top: 80, right: 80, bottom: 160, left: 80 } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- geojson derivados ---
  const referenceCollection = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: paddocks
        .filter((p) => p.id !== paddockId)
        .map((p) => ({ type: 'Feature', geometry: p.geometry, properties: { color: p.color || '#C98A2D' } })),
    }),
    [paddocks, paddockId],
  )

  const draftCollection = useMemo(() => {
    const features = []
    if (vertices.length >= 3) {
      features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [closedRing(vertices)] }, properties: {} })
    } else if (vertices.length === 2) {
      features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: vertices }, properties: {} })
    }
    return { type: 'FeatureCollection', features }
  }, [vertices])

  const measures = useMemo(() => {
    if (vertices.length < 3) return { areaM2: 0, perimeterM: 0 }
    const feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [closedRing(vertices)] }, properties: {} }
    return { areaM2: turfArea(feature), perimeterM: turfLength(feature, { units: 'kilometers' }) * 1000 }
  }, [vertices])

  const areaHa = (measures.areaM2 / 10000).toLocaleString('es-CO', { maximumFractionDigits: 2 })
  const perimeterLabel =
    measures.perimeterM >= 1000
      ? `${(measures.perimeterM / 1000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} km`
      : `${Math.round(measures.perimeterM).toLocaleString('es-CO')} m`

  // --- dibujo ---
  const onMapPress = useCallback(
    (event) => {
      const { lngLat } = event.nativeEvent
      if (!lngLat) return
      const point = roundCoord(lngLat)
      if (selectedIndex !== null) {
        // Reubicar el vértice seleccionado en el punto tocado.
        setVertices((current) => current.map((v, i) => (i === selectedIndex ? point : v)))
        setSelectedIndex(null)
      } else {
        setVertices((current) => [...current, point])
      }
    },
    [selectedIndex],
  )

  function undo() {
    setSelectedIndex(null)
    setVertices((current) => current.slice(0, -1))
  }

  function removeSelected() {
    setVertices((current) => current.filter((_, i) => i !== selectedIndex))
    setSelectedIndex(null)
  }

  // --- búsqueda / GPS / capa ---
  async function searchLocation() {
    const query = (searchQuery || '').trim()
    if (!query) return
    setSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=es&q=${encodeURIComponent(query)}`
      const response = await fetch(url)
      const results = await response.json()
      setSearchResults(results)
      if (!results.length) toast('Sin resultados para esa búsqueda', 'error')
    } catch {
      toast('No se pudo buscar la ubicación (¿sin conexión?)', 'error')
    } finally {
      setSearching(false)
    }
  }

  function goToResult(result) {
    setSearchResults([])
    cameraRef.current && cameraRef.current.flyTo({ center: [Number(result.lon), Number(result.lat)], zoom: 15, duration: 1200 })
  }

  async function locateMe() {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        toast('Sin permiso de ubicación', 'error')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      cameraRef.current &&
        cameraRef.current.flyTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 16, duration: 1200 })
    } catch {
      toast('No se pudo obtener tu ubicación', 'error')
    } finally {
      setLocating(false)
    }
  }

  // --- guardar ---
  async function save() {
    const name = (form.name || '').trim()
    if (!name) {
      toast('El nombre del potrero es obligatorio', 'error')
      return
    }
    const geometry = { type: 'Polygon', coordinates: [closedRing(vertices)] }
    const payload = { name, geometry, color: form.color, notes: form.notes || '' }
    setSaving(true)
    try {
      if (paddockId) {
        await dispatch(
          updateItem({ module: 'paddocks', nameState: 'paddocks', url: `/farms/paddocks/${paddockId}/`, data: payload }),
        )
      } else {
        await dispatch(createItem({ module: 'paddocks', nameState: 'paddocks', url: '/farms/paddocks/', data: payload }))
      }
      setSaveVisible(false)
      toast(paddockId ? 'Potrero actualizado' : 'Potrero creado')
      navigation.goBack()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo guardar el potrero'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.flex}>
      <MLMap style={styles.flex} mapStyle={buildMapStyle(baseLayer)} onPress={onMapPress}>
        <Camera ref={cameraRef} initialViewState={initialViewState} />

        <GeoJSONSource id="paddocks-ref" data={referenceCollection}>
          <Layer id="paddocks-ref-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 }} />
          <Layer
            id="paddocks-ref-line"
            type="line"
            paint={{ 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [2, 1.5] }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="draft" data={draftCollection}>
          <Layer
            id="draft-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{ 'fill-color': DRAW_COLOR, 'fill-opacity': 0.15 }}
          />
          <Layer id="draft-line" type="line" paint={{ 'line-color': DRAW_COLOR, 'line-width': 3 }} />
        </GeoJSONSource>

        {vertices.map((vertex, index) => (
          <Marker key={`v-${index}-${vertex[0]}-${vertex[1]}`} lngLat={vertex}>
            <Pressable onPress={() => setSelectedIndex(selectedIndex === index ? null : index)} hitSlop={10}>
              <View
                style={[
                  styles.vertex,
                  selectedIndex === index && styles.vertexSelected,
                ]}
              />
            </Pressable>
          </Marker>
        ))}
      </MLMap>

      {/* Búsqueda flotante */}
      <View style={[styles.searchWrap, { top: 10 + insets.top * 0 }]}>
        <Searchbar
          placeholder="Buscar ubicación…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchLocation}
          onIconPress={searchLocation}
          loading={searching}
          style={styles.searchbar}
          inputStyle={{ fontSize: 14 }}
        />
        {searchResults.length ? (
          <Surface style={styles.results} elevation={2}>
            {searchResults.map((result) => (
              <List.Item
                key={result.place_id}
                title={result.display_name}
                titleNumberOfLines={2}
                left={(props) => <List.Icon {...props} icon="map-marker-outline" />}
                onPress={() => goToResult(result)}
              />
            ))}
          </Surface>
        ) : null}
      </View>

      {/* Herramientas del mapa */}
      <View style={styles.tools}>
        <FAB size="small" icon="crosshairs-gps" loading={locating} onPress={locateMe} style={styles.toolBtn} />
        <FAB
          size="small"
          icon={baseLayer === 'satellite' ? 'map' : 'satellite-variant'}
          onPress={() => setBaseLayer(baseLayer === 'satellite' ? 'streets' : 'satellite')}
          style={styles.toolBtn}
        />
      </View>

      {/* Panel inferior: medidas + acciones de dibujo */}
      <Surface style={[styles.panel, { paddingBottom: 10 + insets.bottom, backgroundColor: theme.colors.surface }]} elevation={4}>
        <View style={styles.measuresRow}>
          <View style={styles.flex}>
            <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
              {areaHa} <Text variant="bodySmall">ha</Text>
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {vertices.length} puntos · {perimeterLabel} de perímetro
            </Text>
          </View>
          <Chip compact icon="gesture-tap">
            {selectedIndex !== null
              ? 'Toca el mapa para mover el punto'
              : vertices.length < 3
                ? 'Toca el mapa para marcar puntos'
                : 'Toca un punto para ajustarlo'}
          </Chip>
        </View>
        <View style={styles.actionsRow}>
          {selectedIndex !== null ? (
            <Button mode="outlined" compact icon="delete-outline" onPress={removeSelected}>
              Quitar punto
            </Button>
          ) : (
            <Button mode="outlined" compact icon="undo" disabled={!vertices.length} onPress={undo}>
              Deshacer
            </Button>
          )}
          <IconButton icon="restart" mode="outlined" size={18} disabled={!vertices.length} onPress={() => { setVertices([]); setSelectedIndex(null) }} />
          <View style={styles.flex} />
          <Button mode="contained" icon="content-save-outline" disabled={vertices.length < 3} onPress={() => setSaveVisible(true)}>
            {paddockId ? 'Guardar cambios' : 'Guardar potrero'}
          </Button>
        </View>
      </Surface>

      {/* Datos del potrero */}
      <FormModal
        visible={saveVisible}
        onDismiss={() => setSaveVisible(false)}
        title={paddockId ? `Editar ${editing ? editing.name : ''}` : 'Nuevo potrero'}
        icon="map-outline"
        onSubmit={save}
        submitLabel={paddockId ? 'Guardar cambios' : 'Guardar potrero'}
        loading={saving}
        submitDisabled={!(form.name || '').trim()}
      >
        <Text variant="bodySmall" style={[styles.muted, { marginBottom: 10 }]}>
          {areaHa} ha · {perimeterLabel} de perímetro (las medidas las confirma el servidor).
        </Text>
        <TextInput
          mode="outlined"
          label="Nombre del potrero"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <Text variant="bodySmall" style={[styles.muted, { marginTop: 12, marginBottom: 6 }]}>
          Color en el mapa
        </Text>
        <View style={styles.swatches}>
          {PADDOCK_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => setForm({ ...form, color })}
              style={[styles.swatch, { backgroundColor: color }, form.color === color && styles.swatchSelected]}
            />
          ))}
        </View>
        <TextInput
          mode="outlined"
          label="Notas (opcional)"
          value={form.notes}
          onChangeText={(notes) => setForm({ ...form, notes })}
          multiline
          numberOfLines={2}
          style={{ marginTop: 12 }}
        />
      </FormModal>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { opacity: 0.7 },
  searchWrap: { position: 'absolute', top: 10, left: 10, right: 64 },
  searchbar: { borderRadius: 14, height: 46 },
  results: { marginTop: 6, borderRadius: 14, overflow: 'hidden', maxHeight: 260 },
  tools: { position: 'absolute', top: 10, right: 10, gap: 8 },
  toolBtn: { borderRadius: 14 },
  vertex: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#1B1B1B',
  },
  vertexSelected: {
    backgroundColor: '#FFD60A',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.35 }],
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  measuresRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  swatchSelected: { borderWidth: 3, borderColor: 'rgba(46,125,50,0.55)' },
})
