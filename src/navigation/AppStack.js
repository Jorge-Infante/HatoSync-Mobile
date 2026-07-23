import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AppHeader from '@/modules/shared/components/AppHeader'
import AnimalListScreen from '@/modules/livestock/screens/AnimalListScreen'
import AnimalDetailScreen from '@/modules/livestock/screens/AnimalDetailScreen'
import LotsScreen from '@/modules/livestock/screens/LotsScreen'
import LotCountScreen from '@/vision/LotCountScreen'
import BreedsScreen from '@/modules/configuration/screens/BreedsScreen'
import LotsCatalogScreen from '@/modules/configuration/screens/LotsCatalogScreen'
import IdentificationTypesScreen from '@/modules/configuration/screens/IdentificationTypesScreen'
import InactivationReasonsScreen from '@/modules/configuration/screens/InactivationReasonsScreen'
// Carga PEREZOSA: expo-camera no debe evaluarse en el arranque (rompe el init
// del runtime en release; ver ScanTagScreenLazy.js).
import ScanTagScreen from '@/modules/tags/screens/ScanTagScreenLazy'
import FarmListScreen from '@/modules/farms/screens/FarmListScreen'
import FarmMembersScreen from '@/modules/farms/screens/FarmMembersScreen'
import SyncScreen from '@/modules/sync/screens/SyncScreen'
import NotificationsScreen from '@/modules/notifications/screens/NotificationsScreen'
import HealthAgendaScreen from '@/modules/health/screens/HealthAgendaScreen'
import ProtocolListScreen from '@/modules/health/screens/ProtocolListScreen'
import JornadasScreen from '@/modules/health/screens/JornadasScreen'
import WeighingSessionScreen from '@/modules/health/screens/WeighingSessionScreen'
import BatchFormScreen from '@/modules/health/screens/BatchFormScreen'
import MedicationsScreen from '@/modules/configuration/screens/MedicationsScreen'
import PaddockListScreen from '@/modules/paddocks/screens/PaddockListScreen'
import PaddockEditorScreen from '@/modules/paddocks/screens/PaddockEditorScreen'

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
      <Stack.Screen name="Lots" component={LotsScreen} options={{ title: 'Lotes' }} />
      {/* Reusa AnimalListScreen filtrada por route.params.lotId (mismo patrón que el web) */}
      <Stack.Screen name="LotAnimals" component={AnimalListScreen} options={{ title: 'Lote' }} />
      <Stack.Screen name="LotCount" component={LotCountScreen} options={{ title: 'Contar lote' }} />
      <Stack.Screen name="ScanTag" component={ScanTagScreen} options={{ title: 'Escanear chapeta' }} />
      <Stack.Screen name="PaddockList" component={PaddockListScreen} options={{ title: 'Potreros' }} />
      <Stack.Screen name="PaddockEditor" component={PaddockEditorScreen} options={{ title: 'Potrero en el mapa' }} />
      <Stack.Screen name="HealthAgenda" component={HealthAgendaScreen} options={{ title: 'Agenda de sanidad' }} />
      <Stack.Screen name="Jornadas" component={JornadasScreen} options={{ title: 'Jornadas' }} />
      <Stack.Screen name="WeighingSession" component={WeighingSessionScreen} options={{ title: 'Jornada de pesaje' }} />
      <Stack.Screen name="BatchForm" component={BatchFormScreen} options={{ title: 'Jornada de protocolo' }} />
      <Stack.Screen name="ProtocolList" component={ProtocolListScreen} options={{ title: 'Protocolos' }} />
      <Stack.Screen name="MedicationList" component={MedicationsScreen} options={{ title: 'Medicamentos' }} />
      <Stack.Screen name="Breeds" component={BreedsScreen} options={{ title: 'Razas' }} />
      <Stack.Screen name="IdentificationTypes" component={IdentificationTypesScreen} options={{ title: 'Identificación' }} />
      <Stack.Screen name="LotsCatalog" component={LotsCatalogScreen} options={{ title: 'Lotes (catálogo)' }} />
      <Stack.Screen name="InactivationReasons" component={InactivationReasonsScreen} options={{ title: 'Inactivación' }} />
      <Stack.Screen name="FarmList" component={FarmListScreen} options={{ title: 'Mis fincas' }} />
      <Stack.Screen name="FarmMembers" component={FarmMembersScreen} options={{ title: 'Miembros' }} />
      <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Datos offline' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificaciones' }} />
    </Stack.Navigator>
  )
}
