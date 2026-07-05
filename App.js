import 'react-native-gesture-handler'
import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux'
import store from '@/store'
import theme from '@/theme'
import { bootstrap } from '@/modules/auth/store/authSlice'
import { ToastProvider } from '@/modules/shared/components/Toast'
import { SyncProvider } from '@/sync/SyncProvider'
import RootNavigator from '@/navigation'

// Runs once inside the providers: restores any existing session, gates a splash.
function Root() {
  const dispatch = useDispatch()
  const booted = useSelector((s) => s.auth.booted)

  useEffect(() => {
    dispatch(bootstrap())
  }, [dispatch])

  if (!booted) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    )
  }
  return <RootNavigator />
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <PaperProvider
          theme={theme}
          settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}
        >
          <StatusBar style="dark" />
          <ToastProvider>
            <SyncProvider>
              <Root />
            </SyncProvider>
          </ToastProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  )
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
