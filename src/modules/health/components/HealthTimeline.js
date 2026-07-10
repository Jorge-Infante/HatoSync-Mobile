import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, Card, Chip, IconButton, List, Divider, useTheme } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { cancelTreatment } from '@/modules/health/store/healthThunks'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'
import ConfirmDialog from '@/modules/shared/components/ConfirmDialog'
import TreatmentFormModal from '@/modules/health/components/TreatmentFormModal'
import ApplicationResolver from '@/modules/health/components/ApplicationResolver'
import { treatmentStatusMeta, healthStatusMeta, doseLabel, OVERDUE_COLOR } from '@/modules/health/constants'
import { formatDateTimeFull } from '@/utils/format'

const fullDT = formatDateTimeFull

/**
 * Historial clínico del animal (tab Sanidad). Muestra los tratamientos embebidos
 * en `animal.treatments` con su línea de aplicaciones; permite crear, aplicar,
 * omitir y cancelar. Espejo de AnimalHealthTab.vue.
 */
export default function HealthTimeline({ animal, canWrite = true, onChanged }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const toast = useToast()
  const treatments = animal.treatments || []

  const [treatmentVisible, setTreatmentVisible] = useState(false)
  const [resolver, setResolver] = useState({ visible: false, app: null, action: 'apply' })
  const [toCancel, setToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  function sortedApps(t) {
    return [...(t.applications || [])].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  }
  function overdueIn(t) {
    return (t.applications || []).filter((a) => a.is_overdue).length
  }

  async function confirmCancel() {
    setCancelling(true)
    try {
      await dispatch(cancelTreatment({ animalId: animal.id, id: toCancel.id }))
      setToCancel(null)
      onChanged && onChanged()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo cancelar el tratamiento'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <View>
      <View style={styles.header}>
        <Text variant="labelLarge">Historial clínico</Text>
        {canWrite ? (
          <Button mode="contained-tonal" compact icon="plus" onPress={() => setTreatmentVisible(true)}>
            Nuevo tratamiento
          </Button>
        ) : null}
      </View>

      {treatments.length === 0 ? (
        <Text variant="bodyMedium" style={styles.emptyInline}>Sin tratamientos registrados.</Text>
      ) : (
        treatments.map((t) => {
          const meta = treatmentStatusMeta(t.status)
          const overdue = overdueIn(t)
          return (
            <Card key={t.id} mode="outlined" style={styles.tCard}>
              <List.Accordion
                title={t.name || t.protocol_name}
                titleStyle={{ fontWeight: '600' }}
                description={fullDT(t.start_at)}
                left={(p) => <List.Icon {...p} icon="medical-bag" color={meta.color} />}
              >
                <View style={styles.accBody}>
                  <View style={styles.chipRow}>
                    <Chip compact style={{ backgroundColor: meta.color + '22' }} textStyle={{ color: meta.color }}>
                      {t.status_display || meta.label}
                    </Chip>
                    {overdue ? (
                      <Chip compact style={{ backgroundColor: OVERDUE_COLOR }} textStyle={{ color: '#fff' }}>
                        {overdue} vencida(s)
                      </Chip>
                    ) : null}
                  </View>
                  {t.diagnosis ? <Text variant="bodySmall" style={styles.diag}>Diagnóstico: {t.diagnosis}</Text> : null}
                  {t.notes ? <Text variant="bodySmall" style={styles.muted}>{t.notes}</Text> : null}

                  <Divider style={styles.divider} />

                  {sortedApps(t).map((app) => {
                    const am = healthStatusMeta(app.status)
                    const color = app.is_overdue ? OVERDUE_COLOR : am.color
                    return (
                      <View key={app.id} style={styles.appRow}>
                        <View style={styles.flex}>
                          <View style={styles.appTitle}>
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{app.medication_name}</Text>
                            <Chip compact style={{ backgroundColor: color + '22' }} textStyle={{ color, fontSize: 11 }}>
                              {app.is_overdue ? 'Vencida' : (app.status_display || am.label)}
                            </Chip>
                          </View>
                          <Text variant="bodySmall" style={styles.muted}>
                            {doseLabel(app)}{app.route_display ? ` · ${app.route_display}` : ''} · {fullDT(app.scheduled_at)}
                          </Text>
                          {app.applied_by_name ? <Text variant="bodySmall" style={styles.muted}>Registró: {app.applied_by_name}</Text> : null}
                          {app.notes ? <Text variant="bodySmall">{app.notes}</Text> : null}
                        </View>
                        {canWrite && app.status === 'PENDING' ? (
                          <View style={styles.appActions}>
                            <IconButton icon="check" size={18} mode="contained-tonal" iconColor={theme.colors.primary} onPress={() => setResolver({ visible: true, app, action: 'apply' })} />
                            <IconButton icon="close" size={18} onPress={() => setResolver({ visible: true, app, action: 'skip' })} />
                          </View>
                        ) : null}
                      </View>
                    )
                  })}

                  {canWrite && t.status === 'ACTIVE' ? (
                    <Button mode="text" textColor={theme.colors.error} icon="cancel" onPress={() => setToCancel(t)} style={styles.cancelBtn}>
                      Cancelar tratamiento
                    </Button>
                  ) : null}
                </View>
              </List.Accordion>
            </Card>
          )
        })
      )}

      <TreatmentFormModal
        visible={treatmentVisible}
        animal={animal}
        onDismiss={() => setTreatmentVisible(false)}
        onSaved={() => { toast('Tratamiento creado'); onChanged && onChanged() }}
      />
      <ApplicationResolver
        visible={resolver.visible}
        app={resolver.app}
        action={resolver.action}
        onDismiss={() => setResolver({ visible: false, app: null, action: 'apply' })}
        onResolved={({ action }) => { toast(action === 'apply' ? 'Aplicación registrada' : 'Aplicación omitida'); onChanged && onChanged() }}
      />
      <ConfirmDialog
        visible={!!toCancel}
        onDismiss={() => setToCancel(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title="¿Cancelar tratamiento?"
        confirmLabel="Cancelar tratamiento"
        message={`Las aplicaciones pendientes de ${toCancel ? (toCancel.name || toCancel.protocol_name) : ''} se marcarán como omitidas.`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  emptyInline: { textAlign: 'center', opacity: 0.6, paddingVertical: 20 },
  tCard: { marginBottom: 10 },
  accBody: { paddingHorizontal: 12, paddingBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  diag: { marginBottom: 2 },
  muted: { opacity: 0.7 },
  divider: { marginVertical: 8 },
  appRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  appTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  appActions: { flexDirection: 'row' },
  cancelBtn: { alignSelf: 'flex-end', marginTop: 4 },
})
