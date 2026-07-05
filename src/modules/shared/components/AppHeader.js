import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Appbar, Menu, Divider, Text, Avatar, Badge, useTheme } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { logout, switchActiveFarm } from '@/modules/auth/store/authSlice'
import { fetchState } from '@/modules/shared/store/sharedThunks'
import { initials } from '@/utils/format'
import { useOnline } from '@/sync/connectivity'
import { useSync } from '@/sync/SyncProvider'
import { useToast } from '@/modules/shared/components/Toast'
import { getErrorMessage } from '@/api/errors'
import DrawerOverlay from '@/modules/shared/components/DrawerOverlay'

// The offline cache hydrates the farms list before any header mounts, so an
// empty-list check isn't enough: refresh from the server once per app session
// so stale cached farms (e.g. memberships this user no longer has) drop out.
let farmsRefreshedThisSession = false

/**
 * Shared app header — used as the custom `header` for the AppStack. Shows a
 * hamburger (opens the drawer) or a back arrow, the screen title, the active-farm
 * selector and the user menu. Mirrors the web's AppBar + drawer toggle.
 */
export default function AppHeader({ navigation, route, options, back }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const toast = useToast()
  const online = useOnline()
  const { pending, refresh: refreshSync } = useSync()

  const farms = useSelector((s) => s.farms.farms)
  const activeFarmId = useSelector((s) => (s.auth.user ? s.auth.user.active_farm : null))
  const activeFarmName = useSelector((s) => (s.auth.user ? s.auth.user.active_farm_name : null))
  const userName = useSelector((s) => (s.auth.user ? s.auth.user.full_name : ''))
  const userEmail = useSelector((s) => (s.auth.user ? s.auth.user.email : ''))

  const [drawer, setDrawer] = useState(false)
  const [farmMenu, setFarmMenu] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [switching, setSwitching] = useState(false)

  // Header is the always-mounted shell: keep the farms list warm for the selector + drawer
  useEffect(() => {
    if (!farms.length || !farmsRefreshedThisSession) {
      farmsRefreshedThisSession = true
      dispatch(fetchState({ module: 'farms', nameState: 'farms', url: '/farms/' })).catch(() => {
        farmsRefreshedThisSession = false // offline → retry when another screen mounts online
      })
    }
  }, [dispatch, farms.length])

  // Refresh the "por subir" badge whenever a screen mounts this header
  useEffect(() => {
    refreshSync()
  }, [refreshSync])

  async function onSelectFarm(farmId) {
    setFarmMenu(false)
    if (farmId === activeFarmId) return
    setSwitching(true)
    try {
      await dispatch(switchActiveFarm(farmId))
    } catch (e) {
      toast(getErrorMessage(e, 'No se pudo cambiar de finca'), 'error')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
      <Appbar.Header mode="small" elevated={false} style={styles.header}>
        {back ? (
          <Appbar.BackAction onPress={navigation.goBack} />
        ) : (
          <Appbar.Action icon="menu" onPress={() => setDrawer(true)} />
        )}

        <View style={styles.titleBlock}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.secondary }]} numberOfLines={1}>
            {options.title || 'HatoSync'}
          </Text>
        </View>

        {!online ? (
          <Appbar.Action
            icon="cloud-off-outline"
            iconColor={theme.colors.error}
            onPress={() => navigation.navigate('Sync')}
          />
        ) : null}

        {pending > 0 ? (
          <View>
            <Appbar.Action icon="cloud-upload-outline" onPress={() => navigation.navigate('Sync')} />
            <Badge style={styles.badge} size={18}>
              {pending}
            </Badge>
          </View>
        ) : null}

        <Menu
          visible={farmMenu}
          onDismiss={() => setFarmMenu(false)}
          anchor={
            <Appbar.Action icon={switching ? 'loading' : 'barn'} disabled={switching} onPress={() => setFarmMenu(true)} />
          }
        >
          <Text variant="labelSmall" style={styles.menuLabel}>
            Finca activa
          </Text>
          {farms && farms.length ? (
            farms.map((farm) => (
              <Menu.Item
                key={farm.id}
                title={farm.name}
                onPress={() => onSelectFarm(farm.id)}
                leadingIcon={farm.id === activeFarmId ? 'check' : 'barn'}
              />
            ))
          ) : (
            <Menu.Item title="Sin fincas" disabled />
          )}
        </Menu>

        <Menu
          visible={userMenu}
          onDismiss={() => setUserMenu(false)}
          anchor={
            <Appbar.Action
              icon={() => <Avatar.Text size={30} label={initials(userName)} color="#fff" style={{ backgroundColor: theme.colors.primary }} />}
              onPress={() => setUserMenu(true)}
            />
          }
        >
          <View style={styles.userHeader}>
            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
              {userName || 'Mi perfil'}
            </Text>
            {userEmail ? (
              <Text variant="bodySmall" style={{ color: theme.hs.palette.muted }}>
                {userEmail}
              </Text>
            ) : null}
          </View>
          <Divider />
          <Menu.Item
            leadingIcon="logout"
            title="Cerrar sesión"
            onPress={() => {
              setUserMenu(false)
              dispatch(logout())
            }}
          />
        </Menu>
      </Appbar.Header>

      <DrawerOverlay
        visible={drawer}
        onClose={() => setDrawer(false)}
        onNavigate={(r) => navigation.navigate(r)}
        currentRoute={route.name}
      />
    </>
  )
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,82,51,0.14)' },
  titleBlock: { flex: 1, paddingLeft: 4 },
  title: { fontWeight: '700' },
  menuLabel: { paddingHorizontal: 16, paddingVertical: 6, opacity: 0.6 },
  userHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  badge: { position: 'absolute', top: 6, right: 4 },
})
