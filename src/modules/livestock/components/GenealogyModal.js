import React, { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import { Portal, Modal, Text, IconButton, Divider, ActivityIndicator, HelperText, Avatar, useTheme } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { fetchGenealogy } from '@/modules/livestock/store/livestockThunks'
import { mediaSource } from '@/utils/format'
import { getErrorMessage } from '@/api/errors'

const REQUESTED_DEPTH = 3
const GEN_LABELS = ['Animal', 'Padres', 'Abuelos', 'Bisabuelos', 'Tatarabuelos']

// Build generation columns from the ancestor tree (subject at gen 0).
function buildLevels(subject) {
  const levels = [[{ node: subject }]]
  for (let g = 1; g <= REQUESTED_DEPTH; g++) {
    const row = []
    for (const entry of levels[g - 1]) {
      if (entry.node && !entry.node.has_more_ancestors) {
        row.push(entry.node.mother ? { node: entry.node.mother, role: 'Madre' } : { ghost: true, role: 'Madre' })
        row.push(entry.node.father ? { node: entry.node.father, role: 'Padre' } : { ghost: true, role: 'Padre' })
      }
    }
    if (!row.length) break
    levels.push(row)
    if (row.every((e) => e.ghost)) break
  }
  return levels
}

export default function GenealogyModal({ visible, animal, onDismiss }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const [subject, setSubject] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(
    async (animalId) => {
      setLoading(true)
      setError('')
      try {
        const data = await dispatch(fetchGenealogy({ animalId, depth: REQUESTED_DEPTH }))
        setSubject(data)
      } catch (e) {
        setError(getErrorMessage(e, 'No se pudo cargar la genealogía'))
      } finally {
        setLoading(false)
      }
    },
    [dispatch]
  )

  useEffect(() => {
    if (visible && animal) {
      setHistory([])
      setSubject(null)
      load(animal.id)
    }
  }, [visible, animal, load])

  function navigateTo(node) {
    if (subject) setHistory((h) => [...h, subject.id])
    load(node.id)
  }

  function goBack() {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory((h) => h.slice(0, -1))
      load(prev)
    }
  }

  const levels = subject ? buildLevels(subject) : []

  function renderNode(entry, isSubject) {
    if (entry.ghost) {
      return (
        <View style={[styles.card, styles.ghost, { borderColor: theme.colors.outline }]}>
          <Text variant="bodySmall" style={styles.ghostName}>
            Sin registro
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            {entry.role}
          </Text>
        </View>
      )
    }
    const node = entry.node
    const photo = mediaSource(node.photo)
    const Wrapper = isSubject ? View : Pressable
    return (
      <Wrapper
        onPress={isSubject ? undefined : () => navigateTo(node)}
        style={[
          styles.card,
          { borderColor: theme.colors.outline },
          isSubject && { borderColor: theme.colors.primary, backgroundColor: 'rgba(46,125,50,0.06)' },
          !node.is_active && styles.inactive,
        ]}
      >
        {photo ? (
          <Avatar.Image size={30} source={photo} />
        ) : (
          <Avatar.Icon
            size={30}
            icon={node.sex === 'FEMALE' ? 'gender-female' : 'gender-male'}
            color="#fff"
            style={{ backgroundColor: node.sex === 'FEMALE' ? theme.colors.primary : theme.colors.tertiary }}
          />
        )}
        <View style={styles.cardBody}>
          <Text variant="bodySmall" style={styles.cardName} numberOfLines={1}>
            {node.name}
          </Text>
          <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
            {node.sex_display}
            {node.birth_date ? ` · ${node.birth_date.slice(0, 4)}` : ''}
            {node.is_external ? ' · Externo' : ''}
            {!node.is_active ? ' · Inactivo' : ''}
          </Text>
        </View>
      </Wrapper>
    )
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          {history.length ? (
            <IconButton icon="arrow-left" size={20} onPress={goBack} />
          ) : (
            <IconButton icon="family-tree" size={22} iconColor={theme.colors.primary} style={{ margin: 0, marginLeft: 8 }} />
          )}
          <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
            Genealogía{subject ? ` · ${subject.name}` : ''}
          </Text>
          <IconButton icon="close" size={20} onPress={onDismiss} />
        </View>
        <Divider />

        <View style={styles.body}>
          <Text variant="bodySmall" style={[styles.muted, styles.hint]}>
            Ancestros hasta bisabuelos. Toca cualquier animal para ver su genealogía.
          </Text>
          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 40 }} />
          ) : subject ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.columns}>
                {levels.map((row, gen) => (
                  <View key={gen} style={styles.column}>
                    <Text variant="labelSmall" style={styles.genLabel}>
                      {GEN_LABELS[gen] || `Gen ${gen}`}
                    </Text>
                    <ScrollView style={styles.colScroll}>
                      {row.map((entry, i) => (
                        <View key={i} style={styles.slot}>
                          {renderNode(entry, gen === 0)}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </Portal>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 12, borderRadius: 20, maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 4, paddingVertical: 4 },
  title: { flex: 1, fontWeight: '700', marginLeft: 4 },
  body: { padding: 12, minHeight: 200 },
  hint: { marginBottom: 8 },
  muted: { opacity: 0.65 },
  columns: { flexDirection: 'row', gap: 12 },
  column: { width: 168 },
  genLabel: { textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, marginBottom: 8 },
  colScroll: { maxHeight: 420 },
  slot: { marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 8 },
  cardBody: { flex: 1 },
  cardName: { fontWeight: '700', fontStyle: 'italic' },
  ghost: { borderStyle: 'dashed', opacity: 0.6, flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  ghostName: { fontWeight: '600' },
  inactive: { opacity: 0.55 },
})
