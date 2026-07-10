import React, { useState } from 'react'
import { Pressable, View, Platform } from 'react-native'
import { TextInput, HelperText } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { formatDateTimeFull } from '@/utils/format'

/**
 * Campo de fecha + hora. `value` es un ISO string (o vacío). En Android abre el
 * picker de fecha y, tras elegir, el de hora (dos pasos); en iOS un solo picker
 * datetime. Devuelve el ISO combinado por onChange.
 */
export default function DateTimeField({ label, value, onChange, error, helperText, style }) {
  const [mode, setMode] = useState(null) // 'date' | 'time' | null
  const [temp, setTemp] = useState(null)

  const current = value ? new Date(value) : new Date()

  function display() {
    // Formato manual: Hermes (Android) ignora las opciones de toLocaleString.
    return value ? formatDateTimeFull(value) : ''
  }

  function open() {
    setTemp(current)
    setMode(Platform.OS === 'ios' ? 'datetime' : 'date')
  }

  function onPicked(event, selected) {
    if (event.type !== 'set' || !selected) {
      setMode(null)
      return
    }
    if (Platform.OS === 'ios') {
      // iOS datetime picker: un solo paso
      setMode(null)
      onChange(selected.toISOString())
      return
    }
    // Android: fecha → hora
    if (mode === 'date') {
      setTemp(selected)
      setMode('time')
      return
    }
    // mode === 'time': combinar la fecha elegida con la hora
    const base = temp || current
    const combined = new Date(base)
    combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    setMode(null)
    onChange(combined.toISOString())
  }

  return (
    <View style={style}>
      <Pressable onPress={open}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={display()}
            editable={false}
            error={!!error}
            left={<TextInput.Icon icon="calendar-clock" />}
            right={value ? <TextInput.Icon icon="chevron-down" /> : undefined}
          />
        </View>
      </Pressable>
      {error || helperText ? (
        <HelperText type={error ? 'error' : 'info'} visible>
          {error || helperText}
        </HelperText>
      ) : null}
      {mode ? (
        <DateTimePicker
          value={temp || current}
          mode={mode}
          is24Hour
          onChange={onPicked}
        />
      ) : null}
    </View>
  )
}
