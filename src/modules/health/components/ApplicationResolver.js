import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, HelperText, Text, Chip, useTheme } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import DateTimeField from '@/modules/health/components/DateTimeField'
import { applyApplication, skipApplication } from '@/modules/health/store/healthThunks'
import { getErrorMessage } from '@/api/errors'
import { doseLabel } from '@/modules/health/constants'
import { formatDateTimeFull } from '@/utils/format'

/**
 * Resolver una aplicación: aplicarla (con fecha/hora opcional) u omitirla.
 * `action` = 'apply' | 'skip'. Espejo de ApplicationResolver.vue.
 */
export default function ApplicationResolver({ visible, app, action = 'apply', onDismiss, onResolved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const isApply = action === 'apply'

  const [appliedAt, setAppliedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setAppliedAt(new Date().toISOString())
      setNotes('')
      setError('')
    }
  }, [visible])

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const n = notes.trim() || undefined
      if (isApply) {
        await dispatch(applyApplication({ id: app.id, applied_at: appliedAt || undefined, notes: n }))
      } else {
        await dispatch(skipApplication({ id: app.id, notes: n }))
      }
      onResolved && onResolved({ action, app })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo resolver la aplicación'))
    } finally {
      setSaving(false)
    }
  }

  if (!app) return null

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isApply ? 'Registrar aplicación' : 'Omitir aplicación'}
      icon={isApply ? 'check-circle-outline' : 'close-circle-outline'}
      onSubmit={submit}
      submitLabel={isApply ? 'Aplicar' : 'Omitir'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <View style={[styles.summary, { borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.summaryTop}>
          <Text variant="bodyLarge" style={{ fontWeight: '600' }}>{app.medication_name}</Text>
          {app.is_overdue ? <Chip compact style={{ backgroundColor: theme.colors.error }} textStyle={{ color: '#fff' }}>Vencida</Chip> : null}
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {app.animal_name} · {doseLabel(app)}{app.route_display ? ` · ${app.route_display}` : ''}
        </Text>
        <Text variant="bodySmall" style={styles.muted}>Programada: {formatDateTimeFull(app.scheduled_at)}</Text>
      </View>

      <Text variant="bodyMedium" style={styles.q}>
        {isApply ? '¿Confirmas que esta aplicación se realizó?' : 'Se marcará como omitida (no se realizó). Quedará en el historial.'}
      </Text>

      {isApply ? (
        <DateTimeField label="Fecha y hora de aplicación" value={appliedAt} onChange={setAppliedAt} style={styles.field} />
      ) : null}
      <TextInput mode="outlined" label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} style={styles.field} />
    </FormModal>
  )
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: 'rgba(46,125,50,0.05)', marginBottom: 12 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  muted: { opacity: 0.7 },
  q: { marginBottom: 12 },
  field: { marginBottom: 12 },
})
