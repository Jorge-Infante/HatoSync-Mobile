import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Pressable, Dimensions, ScrollView } from 'react-native'
import { Text, Drawer, Divider, Portal, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { SafeAreaView } from 'react-native-safe-area-context'
import menuItems from '@/modules/shared/menuItems'
import { logout } from '@/modules/auth/store/authSlice'

const WIDTH = Math.min(300, Dimensions.get('window').width * 0.82)

/**
 * Custom slide-in navigation drawer (the RN mirror of NavigationDrawer.vue).
 * Avoids @react-navigation/drawer (and reanimated) — a plain Animated panel
 * over a backdrop. `currentRoute` highlights the active section.
 */
export default function DrawerOverlay({ visible, onClose, onNavigate, currentRoute }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const userName = useSelector((s) => (s.auth.user ? s.auth.user.full_name : ''))
  const activeFarmName = useSelector((s) => (s.auth.user ? s.auth.user.active_farm_name : ''))

  const slide = useRef(new Animated.Value(-WIDTH)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: visible ? 0 : -WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start()
  }, [visible, slide, fade])

  if (!visible) return null

  function go(route) {
    onClose()
    if (route !== currentRoute) onNavigate(route)
  }

  function renderItem(item) {
    return (
      <Drawer.Item
        key={item.route}
        label={item.title}
        icon={item.icon}
        active={item.route === currentRoute}
        onPress={() => go(item.route)}
      />
    )
  }

  return (
    <Portal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.panel, { width: WIDTH, backgroundColor: theme.colors.surface, transform: [{ translateX: slide }] }]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
          <View style={styles.brand}>
            <View style={[styles.stamp, { borderColor: theme.colors.primary }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                HS
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={{ color: theme.colors.secondary, fontWeight: '700' }}>
                HatoSync
              </Text>
              {activeFarmName ? (
                <Text variant="bodySmall" style={{ color: theme.hs.palette.muted }} numberOfLines={1}>
                  {activeFarmName}
                </Text>
              ) : null}
            </View>
          </View>
          <Divider />

          <ScrollView style={styles.flex}>
            {menuItems.map((item) =>
              item.children ? (
                <Drawer.Section key={item.title} title={item.title} showDivider={false}>
                  {item.children.map(renderItem)}
                </Drawer.Section>
              ) : (
                renderItem(item)
              )
            )}
          </ScrollView>

          <Divider />
          <Drawer.Section showDivider={false} title={userName || 'Mi cuenta'}>
            <Drawer.Item
              label="Cerrar sesión"
              icon="logout"
              onPress={() => {
                onClose()
                dispatch(logout())
              }}
            />
          </Drawer.Section>
        </SafeAreaView>
      </Animated.View>
    </Portal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(27,43,29,0.45)' },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, elevation: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  stamp: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
