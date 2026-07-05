import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import LoginScreen from '@/modules/auth/screens/LoginScreen'

/**
 * Auth flow (shown by the root navigator when there is no session).
 * Register / forgot-password screens get added here as the module grows —
 * mirrors the web's auth module router with room for those routes.
 */
const Stack = createNativeStackNavigator()

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" component={LoginScreen} />
    </Stack.Navigator>
  )
}
