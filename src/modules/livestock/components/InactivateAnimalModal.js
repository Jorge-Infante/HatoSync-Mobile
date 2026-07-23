import React, { useState, useEffect } from 'react'
import { TextInput, Text, HelperText } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import DateField from '@/modules/shared/components/DateField'
import PickerField from '@/modules/shared/components/PickerField'
import { fetchState } from '@/modules/shared/store/sharedThunks'
import { inactivateAnimal } from '@/modules/livestock/store/livestockThunks'
import { selectIsFarmAdmin } from '@/modules/auth/roleSelectors'
import { isOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { todayISO } from '@/utils/format'

// Sacar del hato (espejo de InactivateAnimalDialog.vue): motivo del catálogo +
// fecha + notas. El historial del animal se conserva; deshacer es del web.
export default function InactivateAnimalModal({ visible, animal, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isFarmAdmin = useSelector(selectIsFarmAdmin)
  const reasons = useSelector((s) => s.configuration.inactivationReasons.filter((r) => r.is_active !== false))

  const [reason, setReason] = useState(null)
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setReason(null)
    setDate(todayISO())
    setNotes('')
    setError('')
    // Catálogo fresco al abrir (si hay señal): así se ven los motivos recién
    // creados por un admin. Offline queda lo hidratado del cache.
    isOnline().then((online) => {
      if (!online) return
      dispatch(fetchState({ module: 'configuration', nameState: 'inactivationReasons', url: '/configuration/inactivation-reasons/' })).catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  async function submit() {
    if (!reason) return setError('El motivo es requerido')
    if (!date) return setError('La fecha de salida es requerida')
    setSaving(true)
    setError('')
    try {
      const data = { reason, date }
      if (notes.trim()) data.notes = notes.trim()
      const exit = await dispatch(inactivateAnimal({ animalId: animal.id, data }))
      onSaved && onSaved({ animal, exit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo sacar el animal del hato'))
    } finally {
      setSaving(false)
    }
  }

  const hasReasons = reasons.length > 0

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title="Sacar del hato"
      icon="logout-variant"
      onSubmit={hasReasons ? submit : onDismiss}
      submitLabel={hasReasons ? 'Sacar del hato' : 'Cerrar'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      {!hasReasons ? (
        <Text variant="bodyMedium" style={{ opacity: 0.8, marginBottom: 8 }}>
          No hay motivos de inactivación. Para sacar un animal del hato primero registra los
          motivos de salida (muerte, venta, regalo…) en Configuración.
          {isFarmAdmin ? ' Los creas en Configuración > Inactivación.' : ' Pídele a un administrador que los cree.'}
        </Text>
      ) : (
        <>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginBottom: 12 }}>
            {animal ? animal.name : ''} saldrá del hato activo con su motivo y fecha. Su historial
            (pesajes, reproducción, genealogía) se conserva.
          </Text>
          <PickerField
            label="Motivo *"
            value={reason}
            options={reasons.map((r) => ({ label: r.name, value: r.id }))}
            onChange={setReason}
            style={{ marginBottom: 12 }}
          />
          <DateField label="Fecha de salida *" value={date} onChange={setDate} max={todayISO()} style={{ marginBottom: 12 }} />
          <TextInput
            mode="outlined"
            label="Notas (opcional)"
            placeholder="Comprador, causa de la muerte, destino…"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </>
      )}
    </FormModal>
  )
}
