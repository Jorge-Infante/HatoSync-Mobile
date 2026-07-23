import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TextInput, HelperText, Text } from 'react-native-paper'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import DateField from '@/modules/shared/components/DateField'
import { fetchState, createItem } from '@/modules/shared/store/sharedThunks'
import { isOnline } from '@/sync/connectivity'
import { getErrorMessage } from '@/api/errors'
import { useToast } from '@/modules/shared/components/Toast'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Meter/mover un lote a un potrero (espejo de AssignLotDialog.vue). Si el lote
 * está en otro potrero, el backend cierra esa estadía con la fecha de entrada.
 */
export default function AssignLotModal({ visible, paddock, onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const lots = useSelector((s) => s.configuration.lots.filter((l) => l.is_active))

  const [lot, setLot] = useState(null)
  const [enteredOn, setEnteredOn] = useState(today())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLot(null)
    setEnteredOn(today())
    setNotes('')
    // Refresca los lotes para que current_paddock (el hint de mover) esté al día.
    ;(async () => {
      if (await isOnline()) {
        dispatch(fetchState({ module: 'configuration', nameState: 'lots', url: '/configuration/lots/' })).catch(() => {})
      }
    })()
  }, [visible, dispatch])

  const currentLotIds = ((paddock && paddock.rotation && paddock.rotation.current_lots) || []).map((l) => l.id)
  const options = lots
    .filter((l) => !currentLotIds.includes(l.id))
    .map((l) => ({ label: l.name, value: l.id }))
  const selectedLot = lots.find((l) => l.id === lot)
  const moveHint =
    selectedLot && selectedLot.current_paddock
      ? `${selectedLot.name} está en ${selectedLot.current_paddock.name}: se moverá a este potrero.`
      : ''

  async function save() {
    setSaving(true)
    try {
      await dispatch(
        createItem({
          module: 'paddocks',
          nameState: 'stays',
          url: '/farms/paddock-stays/',
          data: { paddock: paddock.id, lot, entered_on: enteredOn || today(), notes: notes || '' },
        }),
      )
      onDismiss()
      onSaved && onSaved()
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo registrar la entrada al potrero'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={`Meter lote a ${paddock ? paddock.name : ''}`}
      icon="cow"
      onSubmit={save}
      submitLabel="Registrar entrada"
      loading={saving}
      submitDisabled={!lot}
    >
      <Text variant="bodySmall" style={{ opacity: 0.7, marginBottom: 12 }}>
        Si el lote está en otro potrero, su estadía se cierra automáticamente con la fecha de entrada.
      </Text>
      <PickerField label="Lote" value={lot} options={options} onChange={setLot} searchable />
      {moveHint ? (
        <HelperText type="info" visible>
          {moveHint}
        </HelperText>
      ) : null}
      <DateField label="Fecha de entrada" value={enteredOn} onChange={setEnteredOn} max={today()} style={{ marginTop: 8 }} />
      <TextInput
        mode="outlined"
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
        style={{ marginTop: 12 }}
      />
    </FormModal>
  )
}
