import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Animated, Easing, AccessibilityInfo } from 'react-native'
import { Text } from 'react-native-paper'
import * as SplashScreen from 'expo-splash-screen'
import theme from '@/theme'
import BrandMark from './BrandMark'

const STAMP_SIZE = 148

/**
 * Pantalla de carga (gatea el bootstrap en App.js). El momento firma es el
 * ESTAMPADO: el hierro cae sobre el papel (escala 1.35 → 1 con asentamiento),
 * un anillo ocre pulsa como rescoldo y el wordmark aparece debajo. Continúa
 * exactamente el frame del splash nativo (mismo sello, mismo papel), así el
 * paso nativo → JS no se nota. Con "reducir movimiento" activo se muestra
 * todo quieto de una vez.
 */
export default function BootSplash({ serif = true }) {
  const stampScale = useRef(new Animated.Value(1.35)).current
  const stampOpacity = useRef(new Animated.Value(0)).current
  const emberScale = useRef(new Animated.Value(0.7)).current
  const emberOpacity = useRef(new Animated.Value(0)).current
  const wordRise = useRef(new Animated.Value(10)).current
  const wordOpacity = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(!!enabled))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      stampScale.setValue(1)
      stampOpacity.setValue(1)
      wordRise.setValue(0)
      wordOpacity.setValue(1)
      return
    }
    Animated.sequence([
      // el hierro cae y se estampa
      Animated.parallel([
        Animated.timing(stampOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(stampScale, {
          toValue: 1,
          duration: 420,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1.15),
          useNativeDriver: true,
        }),
      ]),
      // rescoldo: un pulso ocre que se disipa + el nombre sube
      Animated.parallel([
        Animated.timing(emberOpacity, { toValue: 0.35, duration: 120, useNativeDriver: true }),
        Animated.timing(emberScale, {
          toValue: 1.25,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wordOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(wordRise, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(emberOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [reduceMotion, stampScale, stampOpacity, emberScale, emberOpacity, wordRise, wordOpacity])

  return (
    <View
      style={styles.root}
      // El splash nativo (mismo sello sobre el mismo papel) se suelta cuando
      // este frame ya está montado: transición sin salto.
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    >
      <View style={styles.stampArea}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ember,
            { opacity: emberOpacity, transform: [{ scale: emberScale }] },
          ]}
        />
        <Animated.View style={{ opacity: stampOpacity, transform: [{ scale: stampScale }] }}>
          <BrandMark size={STAMP_SIZE} color={theme.hs.palette.primary} ring />
        </Animated.View>
      </View>

      <Animated.View style={[styles.wordmark, { opacity: wordOpacity, transform: [{ translateY: wordRise }] }]}>
        {/* Si Fraunces no cargó (fontError), cae al sistema en negrita */}
        <Text style={[styles.name, !serif && styles.nameFallback]}>HatoSync</Text>
        <Text style={styles.tagline}>GESTIÓN GANADERA</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.hs.palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampArea: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ember: {
    position: 'absolute',
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    borderRadius: STAMP_SIZE / 2,
    borderWidth: 3,
    borderColor: theme.hs.palette.accent,
  },
  wordmark: { alignItems: 'center', marginTop: 26 },
  name: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 42,
    color: theme.hs.palette.ink,
  },
  nameFallback: { fontFamily: undefined, fontWeight: '700' },
  tagline: {
    marginTop: 6,
    fontSize: 11,
    letterSpacing: 3.5,
    fontWeight: '600',
    color: theme.hs.palette.muted,
  },
})
