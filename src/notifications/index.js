import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { createNavigationContainerRef } from '@react-navigation/native'
import apiClient from '@/api/client'

/**
 * Push notifications (FCM directo desde Django con firebase-admin).
 *
 * El app registra el token NATIVO del dispositivo en el backend
 * (POST /auth/me/push-token/, upsert por token: si otra cuenta entra en el
 * mismo teléfono, el token se reasigna a esa cuenta). El backend envía con
 * canal Android "default" (debe existir aquí para Android 8+).
 */

// Con el app ABIERTO las notificaciones también se muestran (banner + sonido).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Ref propio del NavigationContainer: permite navegar desde fuera del árbol
// de React (el tap de una notificación llega por listener, no por props).
export const navigationRef = createNavigationContainerRef()

// Si la push llega antes de que la navegación esté lista (cold start), el
// destino queda pendiente y se despacha en onReady.
let pendingNavigation = null

function openFromNotification(data) {
  if (!data) return
  // Abrir el app desde la push la marca leída en el centro de notificaciones
  // (best-effort: el event_id agrupa las filas del mismo hecho por usuario).
  if (data.event_id) {
    apiClient.post('/notifications/read-by-event/', { event_id: data.event_id }).catch(() => {})
  }
  if (data.screen === 'AnimalDetail' && data.animal_id) {
    if (navigationRef.isReady()) {
      try {
        navigationRef.navigate('AnimalDetail', { id: data.animal_id })
      } catch {
        // sin sesión el stack no tiene esa pantalla: se ignora
      }
    } else {
      pendingNavigation = data
    }
  }
}

// Llamar en el onReady del NavigationContainer.
export function flushPendingNavigation() {
  if (pendingNavigation) {
    const data = pendingNavigation
    pendingNavigation = null
    openFromNotification(data)
  }
}

// Suscribe el tap de notificaciones (app abierta o en background) y resuelve
// la que ABRIÓ el app desde cerrado. Devuelve el unsubscribe.
export function setupNotificationNavigation() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    openFromNotification(response.notification.request.content.data)
  })
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) openFromNotification(response.notification.request.content.data)
    })
    .catch(() => {})
  return () => sub.remove()
}

let registeredForUser = null

// Idempotente por usuario y best-effort: sin permiso, sin red o en Expo Go
// simplemente no registra (se reintenta en el próximo arranque/login).
export async function registerPushToken(userId) {
  if (!userId || registeredForUser === userId) return
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      })
    }
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') {
      ;({ status } = await Notifications.requestPermissionsAsync())
    }
    if (status !== 'granted') return
    const { data: token } = await Notifications.getDevicePushTokenAsync()
    await apiClient.post('/auth/me/push-token/', {
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    })
    registeredForUser = userId
  } catch {
    // best-effort
  }
}
