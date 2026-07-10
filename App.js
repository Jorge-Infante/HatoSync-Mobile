import 'react-native-gesture-handler'
import React, { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux'
import store from '@/store'
import theme from '@/theme'
import { bootstrap } from '@/modules/auth/store/authSlice'
import { ToastProvider } from '@/modules/shared/components/Toast'
import BootSplash from '@/modules/shared/components/BootSplash'
import { SyncProvider } from '@/sync/SyncProvider'
import RootNavigator from '@/navigation'

// El splash nativo (mismo sello sobre el mismo papel que BootSplash) se queda
// hasta que el primer frame JS esté montado — BootSplash lo suelta en onLayout.
SplashScreen.preventAutoHideAsync().catch(() => {})

// Runs once inside the providers: restores any existing session, gates a splash.
function Root({ serifReady }) {
  const dispatch = useDispatch()
  const booted = useSelector((s) => s.auth.booted)
  // Exhibición mínima del estampado: si el bootstrap es instantáneo (sesión
  // cacheada), la animación de la marca igual alcanza a completarse.
  const [minHold, setMinHold] = useState(false)

  useEffect(() => {
    dispatch(bootstrap())
    const t = setTimeout(() => setMinHold(true), 1200)
    return () => clearTimeout(t)
  }, [dispatch])

  if (!booted || !minHold) {
    return <BootSplash serif={serifReady} />
  }
  return <RootNavigator />
}

export default function App() {
  // Fraunces = la serif editorial de la marca (mismo display del web).
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold })

  // Sin fuentes aún no hay nada que pintar: el splash nativo sigue en pantalla.
  if (!fontsLoaded && !fontError) return null

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
              <Root serifReady={!!fontsLoaded} />
            </SyncProvider>
          </ToastProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  )
}
