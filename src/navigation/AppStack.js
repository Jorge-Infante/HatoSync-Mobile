import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AppHeader from '@/modules/shared/components/AppHeader'
import AnimalListScreen from '@/modules/livestock/screens/AnimalListScreen'
import AnimalDetailScreen from '@/modules/livestock/screens/AnimalDetailScreen'
import BreedsScreen from '@/modules/configuration/screens/BreedsScreen'
import IdentificationTypesScreen from '@/modules/configuration/screens/IdentificationTypesScreen'
import FarmListScreen from '@/modules/farms/screens/FarmListScreen'
import FarmMembersScreen from '@/modules/farms/screens/FarmMembersScreen'
import SyncScreen from '@/modules/sync/screens/SyncScreen'
import NotificationsScreen from '@/modules/notifications/screens/NotificationsScreen'
import HealthAgendaScreen from '@/modules/health/screens/HealthAgendaScreen'
import ProtocolListScreen from '@/modules/health/screens/ProtocolListScreen'
import MedicationsScreen from '@/modules/configuration/screens/MedicationsScreen'

/**
 * Single authenticated stack holding every section. Navigation between sections
 * happens through the drawer (AppHeader → DrawerOverlay); detail screens are
 * pushed normally (AppHeader shows a back arrow). Mirrors the web's module
 * routers combined under one shell.
 */
const Stack = createNativeStackNavigator()

export default function AppStack() {
  return (
    <Stack.Navigator
      initialRouteName="AnimalList"
      screenOptions={{ header: (props) => <AppHeader {...props} /> }}
    >
      <Stack.Screen name="AnimalList" component={AnimalListScreen} options={{ title: 'Animales' }} />
      <Stack.Screen name="AnimalDetail" component={AnimalDetailScreen} options={{ title: 'Ficha del animal' }} />
      <Stack.Screen name="HealthAgenda" component={HealthAgendaScreen} options={{ title: 'Agenda de sanidad' }} />
      <Stack.Screen name="ProtocolList" component={ProtocolListScreen} options={{ title: 'Protocolos' }} />
      <Stack.Screen name="MedicationList" component={MedicationsScreen} options={{ title: 'Medicamentos' }} />
      <Stack.Screen name="Breeds" component={BreedsScreen} options={{ title: 'Razas' }} />
      <Stack.Screen name="IdentificationTypes" component={IdentificationTypesScreen} options={{ title: 'Identificación' }} />
      <Stack.Screen name="FarmList" component={FarmListScreen} options={{ title: 'Mis fincas' }} />
      <Stack.Screen name="FarmMembers" component={FarmMembersScreen} options={{ title: 'Miembros' }} />
      <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Datos offline' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificaciones' }} />
    </Stack.Navigator>
  )
}
