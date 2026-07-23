import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { Card, Text, Avatar, IconButton, Button, ActivityIndicator, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector, useDispatch } from 'react-redux'
import { fetchState } from '@/modules/shared/store/sharedThunks'
import { isOnline } from '@/sync/connectivity'
import { selectIsFarmAdmin } from '@/modules/auth/roleSelectors'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'

/**
 * Vista "Lotes": el hato agrupado por lote de manejo, con el total de animales
 * por lote (+ grupo "Sin lote"). Tocar un lote abre la lista de animales
 * filtrada (LotAnimals = AnimalListScreen con route.params.lotId). Espejo de
 * LotsPage.vue.
 */
export default function LotsScreen({ navigation }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const toast = useToast()
  const lots = useSelector((s) => s.configuration.lots.filter((l) => l.is_active))
  const animals = useSelector((s) => s.livestock.animals)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const isFarmAdmin = useSelector(selectIsFarmAdmin)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    // isOnline() imperativo: los parpadeos de señal no deben re-disparar el load
    // (ver AnimalListScreen; misma lección de campo 2026-07).
    if (!(await isOnline())) return // offline: catálogo y hato ya hidratados del cache
    try {
      await Promise.all([
        dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' })),
        animals.length
          ? Promise.resolve()
          : dispatch(fetchState({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/' })),
      ])
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudieron cargar los lotes'), 'error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, toast])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, activeFarmId])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // Conteo por lote calculado del hato ya cargado + grupo "Sin lote".
  const groups = useMemo(() => {
    const counts = {}
    let sinLote = 0
    animals.forEach((a) => {
      if (a.lot) counts[a.lot] = (counts[a.lot] || 0) + 1
      else sinLote += 1
    })
    const out = lots.map((lot) => ({
      id: lot.id,
      name: lot.name,
      count: counts[lot.id] || 0,
      // Potrero donde está el lote hoy (rotación de potreros, derivado en el server).
      paddock: lot.current_paddock || null,
    }))
    if (sinLote > 0) out.push({ id: 'none', name: 'Sin lote', count: sinLote })
    return out
  }, [lots, animals])

  // Spinner solo sin datos: con lista ya visible el refetch es silencioso.
  if (loading && !lots.length && !animals.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={groups}
        keyExtractor={(g) => String(g.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.flex}>
                <Text variant="labelSmall" style={styles.overline}>HATO AGRUPADO</Text>
                <Text variant="headlineSmall" style={styles.title}>Lotes</Text>
              </View>
              {/* Visión computacional Fase A: conteo on-device con la cámara */}
              <Button mode="contained-tonal" compact icon="camera-metering-center" onPress={() => navigation.navigate('LotCount')}>
                Contar
              </Button>
            </View>
            <Text variant="bodySmall" style={styles.muted}>
              Tus animales agrupados por lote de manejo.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            style={styles.card}
            onPress={() => navigation.navigate('LotAnimals', { lotId: item.id, lotName: item.name })}
          >
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={44}
                icon={item.id === 'none' ? 'help-circle-outline' : 'select-group'}
                color="#fff"
                style={{ backgroundColor: item.id === 'none' ? theme.colors.secondary : theme.colors.primary }}
              />
              <View style={styles.flex}>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>{item.name}</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {item.count} {item.count === 1 ? 'animal' : 'animales'}
                </Text>
                {item.paddock ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                    En {item.paddock.name}
                  </Text>
                ) : null}
              </View>
              <IconButton icon="chevron-right" size={20} />
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Avatar.Icon size={64} icon="select-group" color={theme.colors.primary} style={{ backgroundColor: 'rgba(46,125,50,0.1)' }} />
            <Text variant="titleMedium" style={styles.emptyTitle}>Aún no hay lotes</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {isFarmAdmin
                ? 'Crea lotes (Escotero, Paridas…) para agrupar tu hato.'
                : 'Cuando un administrador cree lotes, verás aquí tus animales agrupados.'}
            </Text>
            {isFarmAdmin ? (
              <Button mode="contained" icon="plus" style={styles.emptyBtn} onPress={() => navigation.navigate('LotsCatalog')}>
                Crear lotes
              </Button>
            ) : null}
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 6 },
  list: { padding: 12, flexGrow: 1 },
  header: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overline: { letterSpacing: 1, opacity: 0.6, color: '#2E7D32' },
  title: { fontWeight: '700' },
  muted: { opacity: 0.7 },
  card: { marginBottom: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyTitle: { fontWeight: '700', marginTop: 8 },
  emptyBtn: { marginTop: 10 },
})
