import React, { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar } from 'react-native-paper'
import { useTheme } from 'react-native-paper'

/**
 * App-wide toast (the RN equivalent of the per-page v-snackbar). Wrap the app in
 * <ToastProvider> and call const toast = useToast(); toast('Guardado') or
 * toast('Error', 'error').
 */
const ToastContext = createContext(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const theme = useTheme()
  const [state, setState] = useState({ visible: false, text: '', color: 'success' })

  const toast = useCallback((text, color = 'success') => {
    setState({ visible: true, text, color })
  }, [])

  const onDismiss = () => setState((s) => ({ ...s, visible: false }))

  const bg = state.color === 'error' ? theme.colors.error : theme.colors.primary

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Snackbar
        visible={state.visible}
        onDismiss={onDismiss}
        duration={3500}
        style={{ backgroundColor: bg }}
      >
        {state.text}
      </Snackbar>
    </ToastContext.Provider>
  )
}
