import React, { useState, useMemo } from 'react'
import { View, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Text, IconButton, Button, Chip, Portal, Modal, Divider, useTheme } from 'react-native-paper'
import { healthStatusMeta, doseLabel, OVERDUE_COLOR } from '@/modules/health/constants'
import { formatTime, formatDateTimeFull } from '@/utils/format'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function dayKeyOf(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
// Formato manual (Hermes/Android ignora las opciones de Intl).
const timeLabel = formatTime // "07:45" (24h)
const fullDT = formatDateTimeFull // "9 jul 2026, 07:45"
const MAX_CHIPS = 2

/**
 * Calendario mensual con eventos clickeables (estilo Google): cada día muestra
 * sus aplicaciones como barras; al tocar una sale un detalle con Aplicar/Omitir;
 * "+N" o tocar el día abre la lista del día. Espejo de HealthCalendar.vue.
 */
export default function HealthCalendar({ applications = [], canResolve = false, onResolve }) {
  const theme = useTheme()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [dayKey, setDayKey] = useState(null)
  const [eventApp, setEventApp] = useState(null)
  const todayKey = dayKeyOf(now)

  const appsByDay = useMemo(() => {
    const map = {}
    applications.forEach((app) => {
      const key = dayKeyOf(new Date(app.scheduled_at))
      if (!map[key]) map[key] = []
      map[key].push(app)
    })
    Object.values(map).forEach((list) => list.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
    return map
  }, [applications])

  // Enfocar el mes de la aplicación más próxima si el mes actual está vacío.
  const focused = useMemo(() => {
    if (!applications.length) return cursor
    const hasThisMonth = applications.some((a) => {
      const d = new Date(a.scheduled_at)
      return d.getFullYear() === cursor.year && d.getMonth() === cursor.month
    })
    if (hasThisMonth) return cursor
    const earliest = applications.reduce((min, a) => (new Date(a.scheduled_at) < new Date(min.scheduled_at) ? a : min))
    const d = new Date(earliest.scheduled_at)
    return { year: d.getFullYear(), month: d.getMonth() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications])

  // Si el usuario ya navegó manualmente respetamos su cursor; si no, mostramos
  // el mes enfocado (el de la aplicación más próxima).
  const [userNavigated, setUserNavigated] = useState(false)
  const shown = userNavigated ? cursor : focused

  const cells = useMemo(() => {
    const first = new Date(shown.year, shown.month, 1)
    const startOffset = (first.getDay() + 6) % 7
    const start = new Date(shown.year, shown.month, 1 - startOffset)
    const out = []
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const key = dayKeyOf(d)
      out.push({ key, day: d.getDate(), inMonth: d.getMonth() === shown.month, isToday: key === todayKey, apps: appsByDay[key] || [] })
    }
    return out
  }, [shown, appsByDay, todayKey])

  // 6 filas de 7 días para renderizar por filas (flex:1 por celda).
  const weeks = useMemo(() => {
    const rows = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [cells])

  function shiftMonth(delta) {
    const base = userNavigated ? cursor : focused
    const d = new Date(base.year, base.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setUserNavigated(true)
  }
  function goToday() {
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
    setUserNavigated(true)
  }

  const dayApps = dayKey ? appsByDay[dayKey] || [] : []
  function dayLabel(key) {
    if (!key) return ''
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function resolve(app, action) {
    setEventApp(null)
    setDayKey(null)
    onResolve && onResolve(app, action)
  }

  return (
    <View>
      <View style={styles.nav}>
        <IconButton icon="chevron-left" size={22} onPress={() => shiftMonth(-1)} />
        <Text variant="titleMedium" style={styles.navTitle}>{MONTHS[shown.month]} {shown.year}</Text>
        <IconButton icon="chevron-right" size={22} onPress={() => shiftMonth(1)} />
        <View style={styles.flex} />
        <Button mode="contained-tonal" compact onPress={goToday}>Hoy</Button>
      </View>

      <View style={styles.wdRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} variant="labelSmall" style={styles.wd}>{w}</Text>
        ))}
      </View>

      {/* Filas explícitas de 7 celdas con flex:1 (NO flexWrap + %: el redondeo
          de RN empujaba la 7ª celda a la fila siguiente y corría el calendario). */}
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((cell) => (
              <Pressable
                key={cell.key}
                style={[styles.cell, { borderColor: cell.isToday ? theme.colors.primary : 'rgba(46,82,51,0.12)' }, !cell.inMonth && styles.cellOut, cell.apps.length ? styles.cellHas : null]}
                onPress={() => cell.apps.length && setDayKey(cell.key)}
              >
                <Text variant="labelSmall" style={[styles.cellNum, cell.isToday && { color: theme.colors.primary, fontWeight: '800' }]}>{cell.day}</Text>
                {cell.apps.slice(0, MAX_CHIPS).map((app) => (
                  <Pressable
                    key={app.id}
                    style={[styles.event, { backgroundColor: (app.is_overdue ? OVERDUE_COLOR : theme.colors.primary) + '22' }]}
                    onPress={() => setEventApp(app)}
                  >
                    <Text numberOfLines={1} style={[styles.eventText, { color: app.is_overdue ? OVERDUE_COLOR : theme.colors.primary }]}>
                      {timeLabel(app.scheduled_at)} {app.medication_name}
                    </Text>
                  </Pressable>
                ))}
                {cell.apps.length > MAX_CHIPS ? (
                  <Text style={[styles.more, { color: theme.colors.primary }]}>+{cell.apps.length - MAX_CHIPS}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Event detail (Google-style bubble) */}
      <Portal>
        <Modal visible={!!eventApp} onDismiss={() => setEventApp(null)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          {eventApp ? (
            <View>
              <View style={[styles.bubbleBar, { backgroundColor: eventApp.is_overdue ? OVERDUE_COLOR : theme.colors.primary }]} />
              <View style={styles.bubbleBody}>
                <View style={styles.bubbleTop}>
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>{eventApp.medication_name}</Text>
                  {eventApp.is_overdue ? <Chip compact style={{ backgroundColor: OVERDUE_COLOR }} textStyle={{ color: '#fff' }}>Vencida</Chip> : null}
                </View>
                <Text variant="bodyMedium" style={styles.muted}>{eventApp.animal_name}</Text>
                <Text variant="bodyMedium" style={styles.muted}>{doseLabel(eventApp)}{eventApp.route_display ? ` · ${eventApp.route_display}` : ''}</Text>
                <Text variant="bodyMedium" style={styles.muted}>{fullDT(eventApp.scheduled_at)}</Text>
                {eventApp.notes ? <Text variant="bodySmall" style={styles.notes}>{eventApp.notes}</Text> : null}
                {canResolve && eventApp.status === 'PENDING' ? (
                  <View style={styles.bubbleActions}>
                    <Button mode="contained" icon="check" onPress={() => resolve(eventApp, 'apply')}>Aplicar</Button>
                    <Button mode="text" icon="close" onPress={() => resolve(eventApp, 'skip')}>Omitir</Button>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </Modal>
      </Portal>

      {/* Day list */}
      <Portal>
        <Modal visible={!!dayKey} onDismiss={() => setDayKey(null)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.dayTitle}>{dayLabel(dayKey)}</Text>
          <Divider />
          <ScrollView style={styles.dayList}>
            {dayApps.map((app, i) => {
              const color = app.is_overdue ? OVERDUE_COLOR : healthStatusMeta(app.status).color
              return (
                <View key={app.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable style={styles.dayRow} onPress={() => { setDayKey(null); setEventApp(app) }}>
                    <View style={styles.flex}>
                      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{app.medication_name}</Text>
                      <Text variant="bodySmall" style={styles.muted}>{app.animal_name} · {doseLabel(app)} · {timeLabel(app.scheduled_at)}</Text>
                    </View>
                    {canResolve && app.status === 'PENDING' ? (
                      <View style={styles.dayActions}>
                        <IconButton icon="check" size={18} mode="contained-tonal" iconColor={theme.colors.primary} onPress={() => resolve(app, 'apply')} />
                        <IconButton icon="close" size={18} onPress={() => resolve(app, 'skip')} />
                      </View>
                    ) : (
                      <Chip compact style={{ backgroundColor: color + '22' }} textStyle={{ color, fontSize: 11 }}>{app.status_display}</Chip>
                    )}
                  </Pressable>
                </View>
              )
            })}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  navTitle: { textTransform: 'capitalize' },
  wdRow: { flexDirection: 'row', gap: 3, marginBottom: 4 },
  wd: { flex: 1, textAlign: 'center', opacity: 0.55, fontWeight: '700' },
  grid: {},
  week: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  cell: { flex: 1, minHeight: 62, borderWidth: 1, borderRadius: 8, paddingHorizontal: 3, paddingTop: 2, paddingBottom: 3 },
  cellOut: { opacity: 0.4 },
  cellHas: { backgroundColor: 'rgba(46,125,50,0.05)' },
  cellNum: { textAlign: 'right', opacity: 0.75, marginBottom: 1 },
  event: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 2, marginBottom: 2 },
  eventText: { fontSize: 10, fontWeight: '600', lineHeight: 12 },
  more: { fontSize: 10, fontWeight: '700', paddingLeft: 2 },
  modal: { marginHorizontal: 24, borderRadius: 16, overflow: 'hidden', maxHeight: '80%' },
  bubbleBar: { height: 5 },
  bubbleBody: { padding: 16, gap: 3 },
  bubbleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  muted: { opacity: 0.75 },
  notes: { marginTop: 6 },
  bubbleActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dayTitle: { padding: 16, textTransform: 'capitalize', fontWeight: '700' },
  dayList: { paddingHorizontal: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8 },
  dayActions: { flexDirection: 'row' },
})
