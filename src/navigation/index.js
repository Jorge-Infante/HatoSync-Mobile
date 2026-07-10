import React, { useEffect } from 'react'
import { NavigationContainer, DefaultTheme as NavDefaultTheme } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import { useSelector } from 'react-redux'
import AuthStack from '@/modules/auth/navigation/AuthStack'
import AppStack from '@/navigation/AppStack'
import {
  registerPushToken,
  setupNotificationNavigation,
  flushPendingNavigation,
  navigationRef,
} from '@/notifications'

/**
 * Root navigator — the auth guard. Swaps the whole tree based on the session:
 * no session → AuthStack (login); session → AppStack (drawer shell).
 */
export default function RootNavigator() {
  const paperTheme = useTheme()
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)
  const userId = useSelector((s) => (s.auth.user ? s.auth.user.id : null))

  // Con sesión activa, registrar el token FCM del dispositivo en el backend
  // (pide el permiso de notificaciones la primera vez; best-effort).
  useEffect(() => {
    if (isAuthenticated && userId) registerPushToken(userId)
  }, [isAuthenticated, userId])

  // Tap en una push → abrir la pantalla que trae su data (deep link).
  useEffect(() => setupNotificationNavigation(), [])

  const navTheme = {
    ...NavDefaultTheme,
    colors: {
      ...NavDefaultTheme.colors,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      primary: paperTheme.colors.primary,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
    },
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={flushPendingNavigation}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
