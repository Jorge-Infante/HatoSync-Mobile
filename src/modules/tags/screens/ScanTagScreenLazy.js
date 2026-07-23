import React, { Suspense } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

/**
 * Carga PEREZOSA del escáner. `expo-camera` (CameraX + ML Kit) trae binding
 * nativo que, si se EVALÚA en el arranque (import top-level dentro del grafo de
 * AppStack → App → index), rompe la inicialización del runtime de React en
 * release (mismo patrón documentado con onnxruntime; síntomas: "main has not
 * been registered" / dispatcher de hooks en null). Con React.lazy, el módulo
 * (y expo-camera) solo se evalúa cuando el usuario abre la pantalla.
 */
const ScanTagScreen = React.lazy(() => import('@/modules/tags/screens/ScanTagScreen'))

export default function ScanTagScreenLazy(props) {
  return (
    <Suspense
      fallback={
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      }
    >
      <ScanTagScreen {...props} />
    </Suspense>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
})
