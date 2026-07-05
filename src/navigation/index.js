import React from 'react'
import { NavigationContainer, DefaultTheme as NavDefaultTheme } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'
import { useSelector } from 'react-redux'
import AuthStack from '@/modules/auth/navigation/AuthStack'
import AppStack from '@/navigation/AppStack'

/**
 * Root navigator — the auth guard. Swaps the whole tree based on the session:
 * no session → AuthStack (login); session → AppStack (drawer shell).
 */
export default function RootNavigator() {
  const paperTheme = useTheme()
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)

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
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
