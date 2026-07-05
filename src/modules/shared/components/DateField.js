import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import { TextInput, HelperText } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { formatDate } from '@/utils/format'

/**
 * Date picker field. Value is a YYYY-MM-DD string (the API shape). Tapping opens
 * the native date picker. `max` is a YYYY-MM-DD upper bound (e.g. today).
 */
export default function DateField({ label, value, onChange, max, error, helperText, style }) {
  const [show, setShow] = useState(false)

  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date()
  const maxDate = max ? new Date(`${max}T00:00:00`) : undefined

  function onPicked(event, selected) {
    setShow(false)
    if (event.type === 'set' && selected) {
      onChange(selected.toISOString().slice(0, 10))
    }
  }

  return (
    <View style={style}>
      <Pressable onPress={() => setShow(true)}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={value ? formatDate(value) : ''}
            editable={false}
            error={!!error}
            left={<TextInput.Icon icon="calendar-outline" />}
            right={value ? <TextInput.Icon icon="chevron-down" /> : undefined}
          />
        </View>
      </Pressable>
      {error || helperText ? (
        <HelperText type={error ? 'error' : 'info'} visible>
          {error || helperText}
        </HelperText>
      ) : null}
      {show ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          maximumDate={maxDate}
          onChange={onPicked}
        />
      ) : null}
    </View>
  )
}
