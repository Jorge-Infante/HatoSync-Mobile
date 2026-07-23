import React, { useState, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Searchbar, Chip, Checkbox, Divider } from 'react-native-paper'

/**
 * Selección múltiple de animales para jornadas (batch de protocolo).
 * Inline (no modal): búsqueda + chips de lote como atajo ("todo el lote X")
 * + checklist. `femalesOnly` filtra para protocolos reproductivos (IATF).
 */
export default function AnimalMultiSelect({ animals, lots = [], selected, onChange, femalesOnly = false }) {
  const [query, setQuery] = useState('')

  const eligible = useMemo(
    () => (femalesOnly ? animals.filter((a) => a.sex === 'FEMALE') : animals),
    [animals, femalesOnly]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return eligible
    return eligible.filter((a) => a.name.toLowerCase().includes(q))
  }, [eligible, query])

  // Solo lotes con animales elegibles.
  const lotChips = useMemo(() => {
    const counts = {}
    eligible.forEach((a) => {
      if (a.lot) counts[a.lot] = (counts[a.lot] || 0) + 1
    })
    return lots.filter((l) => counts[l.id]).map((l) => ({ ...l, count: counts[l.id] }))
  }, [lots, eligible])

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  function toggleLot(lotId) {
    const ids = eligible.filter((a) => String(a.lot) === String(lotId)).map((a) => a.id)
    const allIn = ids.every((id) => selected.includes(id))
    if (allIn) onChange(selected.filter((id) => !ids.includes(id)))
    else onChange([...new Set([...selected, ...ids])])
  }

  const allSelected = eligible.length > 0 && eligible.every((a) => selected.includes(a.id))

  return (
    <View>
      <View style={styles.headerRow}>
        <Text variant="labelLarge">Animales ({selected.length} seleccionados)</Text>
        <Chip
          compact
          mode={allSelected ? 'flat' : 'outlined'}
          onPress={() => onChange(allSelected ? [] : eligible.map((a) => a.id))}
        >
          {allSelected ? 'Quitar todos' : 'Todos'}
        </Chip>
      </View>

      {femalesOnly ? (
        <Text variant="bodySmall" style={styles.muted}>
          Protocolo reproductivo: solo se listan hembras.
        </Text>
      ) : null}

      {lotChips.length ? (
        <View style={styles.lotRow}>
          {lotChips.map((lot) => {
            const ids = eligible.filter((a) => String(a.lot) === String(lot.id)).map((a) => a.id)
            const active = ids.length > 0 && ids.every((id) => selected.includes(id))
            return (
              <Chip key={lot.id} compact icon="select-group" mode={active ? 'flat' : 'outlined'} onPress={() => toggleLot(lot.id)} style={styles.lotChip}>
                {lot.name} ({lot.count})
              </Chip>
            )
          })}
        </View>
      ) : null}

      <Searchbar placeholder="Buscar animal…" value={query} onChangeText={setQuery} style={styles.search} />

      {filtered.length === 0 ? (
        <Text variant="bodySmall" style={[styles.muted, styles.empty]}>
          {eligible.length === 0 ? 'No hay animales elegibles.' : 'Sin coincidencias.'}
        </Text>
      ) : (
        filtered.map((a, i) => (
          <View key={a.id}>
            {i > 0 ? <Divider /> : null}
            <Checkbox.Item
              label={`${a.name}${a.lot_name ? `  ·  ${a.lot_name}` : ''}`}
              status={selected.includes(a.id) ? 'checked' : 'unchecked'}
              onPress={() => toggle(a.id)}
              position="leading"
              labelVariant="bodyMedium"
              style={styles.row}
            />
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  muted: { opacity: 0.7, marginBottom: 6 },
  lotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  lotChip: {},
  search: { marginBottom: 6 },
  row: { paddingHorizontal: 0, paddingVertical: 2 },
  empty: { textAlign: 'center', paddingVertical: 14 },
})
