# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**HatoSync-Mobile** — React Native (Expo) mobile client for HatoSync (sistema de gestión ganadera). Sibling of the web client `hatosync-ui` (Vue 3 PWA) and the backend `HatoSync-Api` (Django REST). The backend repo's **PLANNING.md** is the master design doc; `hatosync-ui/CLAUDE.md` documents the **API contract** (auth, active-farm multi-tenancy, animals, configuration, reproduction) — both apply here verbatim, only the client tech differs.

**Stack decisions (mirror the web's architecture where it makes sense):**
- **Expo** (SDK 56) + **React Native** + plain **JavaScript** (no TypeScript, like the web).
- **React Native Paper** (Material 3) for ALL UI — themed via `src/theme`. Prefer Paper components over raw RN views/StyleSheet.
- **Redux Toolkit** + **react-redux** for state (the web uses Vuex; same namespaced-by-domain shape).
- **React Navigation** (native-stack + bottom-tabs) — one stack per module, combined in a root navigator with an auth guard.
- **axios** through `src/api/client.js`. Tokens in **expo-secure-store** (encrypted; async — unlike the web's localStorage).
- Path alias **`@` → `./src`** (babel-plugin-module-resolver).
- **Gráficas: `react-native-gifted-charts` (+ `react-native-svg`)** (decidido 2026-07). El web usa ApexCharts, pero ApexCharts NO corre en RN (necesita DOM) y un WebView rompería el offline-first — gifted-charts es SVG puro y funciona sin red. Espejar el lenguaje visual del web: serie en `theme.colors.primary`, línea 2px curva con puntos de 8px, área degradada sutil, reglas punteadas recesivas, tooltip vía `pointerConfig`. Primera gráfica: `livestock/components/WeightChart.js` (curva de peso en el tab "Peso" del detalle, solo con ≥ 2 pesajes). Las próximas gráficas siguen este patrón.

## Commands

```powershell
npm start          # Expo dev server (scan QR with Expo Go, or press a/i/w)
npm run android    # open on Android emulator/device
npm run ios        # iOS simulator (macOS only)
npx expo export --platform android --output-dir ./.export-check   # bundle-only sanity check (no device)
```

Backend must be running for real data (`HatoSync-Api`: `runserver`, http://localhost:8000).
**⚠ API origin per environment** (`src/config/index.js`, override with env `EXPO_PUBLIC_API_ORIGIN`):
- iOS simulator / web → `http://127.0.0.1:8000`
- Android emulator → `http://10.0.2.2:8000`
- Physical phone (Expo Go) → your computer's LAN IP, e.g. `http://192.168.1.20:8000` (add it to the backend CORS/ALLOWED_HOSTS).

## Architecture

Modular-by-domain, mirroring `hatosync-ui`. Each module owns its screens, navigation and Redux slice:

```
App.js                         # providers (Redux, Paper, SafeArea, Navigation) + session bootstrap + splash
src/
├── config/index.js            # API origin per environment
├── api/
│   ├── client.js              # axios + interceptors (async token, shared-promise refresh w/ rotation, 401→retry→logout)
│   ├── tokenStorage.js        # expo-secure-store (ASYNC) — keys hatosync_access_token / hatosync_refresh_token
│   └── errors.js              # DRF error → Spanish message (ported from web)
├── theme/index.js             # Paper MD3 theme = web design system ("editorial de campo"): pine green / warm paper / ochre
├── store/index.js             # configureStore — combines module slices (keys MUST match the shared-store module names)
├── navigation/
│   ├── index.js               # RootNavigator: auth guard (isAuthenticated ? AppTabs : AuthStack)
│   └── AppTabs.js             # bottom tabs mounting each module stack
└── modules/
    ├── shared/
    │   ├── store/createCrudSlice.js   # slice factory: SET_STATE/ADD_ITEM/UPDATE_ITEM/REMOVE_ITEM + registry
    │   ├── store/sharedThunks.js      # generic CRUD thunks: fetchState/createItem/updateItem/deleteItem/uploadFile
    │   └── components/AppHeader.js    # shared header: brand + active-farm selector + user menu (logout)
    ├── auth/   { store/authSlice.js, screens/LoginScreen.js, navigation/AuthStack.js }
    ├── farms/  { store/farmsSlice.js, screens/FarmListScreen.js, navigation/FarmsStack.js }
    ├── livestock/ { store/livestockSlice.js, screens/AnimalListScreen.js, navigation/LivestockStack.js }
    └── configuration/ { store/configurationSlice.js }   # structure ready; screens TBD
```

### State: the shared CRUD layer (core convention — mirror of the web's `shared` store)

DRF viewsets are uniform, so all standard list/create/update/delete/upload traffic goes through generic thunks in `src/modules/shared/store/sharedThunks.js`. Module slices only hold state + domain-specific logic.

- A slice is built with `createCrudSlice(name, { initialState, reducers })`. It auto-registers its standard reducers (`SET_STATE/ADD_ITEM/UPDATE_ITEM/REMOVE_ITEM`) in `crudRegistry` under `name`.
- The shared thunks resolve a slice by `module` name and dispatch its reducers — call site matches the web 1:1:
  ```js
  dispatch(fetchState({ module: 'farms', nameState: 'farms', url: '/farms/' }))
  dispatch(createItem({ module: 'livestock', nameState: 'animals', url: '/livestock/animals/', data }))
  ```
- Thunks are **plain** (not createAsyncThunk): errors propagate so screens `try/catch` and show `getErrorMessage(e)`.
- `module` name === store reducer key === `createCrudSlice` name (e.g. `livestock`); `nameState` is the array inside that slice (e.g. `animals`).

### Auth & multi-tenancy

- `authSlice`: `login`, `fetchProfile`, `logout`, `switchActiveFarm`, and `bootstrap` (run once in App.js — restores a session if a refresh token exists, gates the splash via `booted`).
- Active farm: the user "stands" on one farm; **no farm_id in URLs/bodies** — the backend filters by it. After `switchActiveFarm`, farm-scoped screens refetch (they depend on `activeFarmId` in `useEffect`). The selector lives in `AppHeader`.

## Conventions

- **Code in English** (modules, components, vars); **UI text in Spanish**.
- Components: function components + hooks (`useSelector`/`useDispatch`).
- Reducer names in SCREAMING_SNAKE (`SET_USER`), thunks are camelCase and return Promises.
- Reference colors via `useTheme()` (`theme.colors.*`, `theme.hs.palette.*`) — never hardcode hex in screens.
- Keep the folder layout when adding modules: `screens/`, `navigation/`, `store/` per module; add the slice to `store/index.js` and a tab/stack where relevant.
- secure-store keys prefixed `hatosync_`.

## Navigation shape

Single authenticated `AppStack` (native-stack) holds every section; the drawer is a **custom slide-in overlay** (`DrawerOverlay`, in a Portal — NOT @react-navigation/drawer, so no reanimated). `AppHeader` is the per-screen custom header: hamburger (opens drawer) or back arrow, title, active-farm selector, user menu. Forms are **Portal modals** (`FormModal`), mirroring the web's dialogs — not navigator screens. Detail screens are pushed normally. Reusable field components: `PickerField` (select + autocomplete), `DateField`, plus `ConfirmDialog` and the `useToast()` snackbar.

## Identidad de marca (2026-07)

- **Logo = "el hierro de HatoSync"**: una **H con cuernos** trazada como varilla de hierro doblada (un solo grosor, puntas redondas, estilo hierro de marcar ganado). Componente canónico: `src/modules/shared/components/BrandMark.js` (react-native-svg; prop `ring` lo encierra en el anillo de sello). Los PNG nativos (`assets/icon.png`, `android-icon-*`, `splash-icon.png`, `favicon.png`) se generaron desde la MISMA geometría con `scripts/generate-brand-assets.mjs` (correr con `@resvg/resvg-js` instalado ad hoc: `npm i --no-save @resvg/resvg-js && node scripts/generate-brand-assets.mjs` y copiar los PNG a `assets/`) — si el mark cambia, actualizar BrandMark.js y regenerar todos. Vista rápida: `brand-preview.png` en la raíz.
- **Ícono**: campo verde con viñeta radial (#33883A→#2E7D32→#256C2A) + hierro en papel #F5F3EB. `adaptiveIcon.backgroundColor` = #2E7D32 (ya no el azul default de Expo).
- **Splash**: dos capas sin salto visual. (1) Nativo vía plugin `expo-splash-screen` en app.json (sello verde 168dp sobre papel #F5F3EB), retenido con `preventAutoHideAsync()` en App.js; (2) `BootSplash.js` (gatea `booted` + un mínimo de 1200 ms): animación de **estampado** — el hierro cae (escala 1.35→1, easing con settle), pulso de anillo ocre como rescoldo, y wordmark "HatoSync" en **Fraunces_600SemiBold** (`@expo-google-fonts/fraunces` + `expo-font`, cargada en App.js) + overline "GESTIÓN GANADERA". Respeta "reducir movimiento" (AccessibilityInfo). `BootSplash` suelta el splash nativo en su `onLayout`.
- El sello "HS" de texto (drawer y login) fue reemplazado por `BrandMark`; el título del login usa Fraunces. Cambios de ícono/splash nativo requieren **rebuild EAS** (no basta OTA).

## Current state (full parity with the web client)

Everything in `hatosync-ui` is implemented:
- **Auth**: login, session restore, logout.
- **Drawer menu** (`menuItems.js`): Animales · Sanidad (Agenda, Protocolos) · Notificaciones · Configuración (Razas, Identificación, Medicamentos) · Mis fincas · Miembros · Datos offline. Active-farm selector + user menu in the header. **Gating por rol (2026-07)**: cada entrada (y cada hijo) admite `roles` y el drawer filtra con `visibleMenuItems(role)` — que ahora desciende a los `children` — Configuración/Miembros y el sub-item Protocolos solo OWNER/ADMIN; Mis fincas oculta para PARTNER (`null` en la lista cubre al usuario sin finca).
- **Roles (2026-07, backend enforced — matriz en PLANNING §3.2.3 del API)**: el user de `/auth/me/`/login trae **`active_farm_role`**; selectores en `modules/auth/roleSelectors.js` (`selectActiveFarmRole`, `selectIsFarmAdmin`, `selectIsPartner`). PARTNER = solo consulta sus animales asignados: sin FAB "Nuevo", sin menú de acciones por fila, y en el detalle solo Genealogía (sin editar/parto/destete/evento/peso). `Animal.assigned_to` (FK a FarmMember, solo admins): PickerField "Asignado a" en AnimalFormModal (visible solo admin; fuente = `s.farms.members` refrescado desde `/farms/members/` al abrir el modal, con los members embebidos de `GET /farms/` como respaldo offline — ⚠ el snapshot embebido queda viejo al crear/editar miembros en la sesión, NO usarlo como fuente primaria) + fila "Asignado a" en la ficha. `/farms/members/` es admin-only (403 para el resto; `pull.js` ya lo tolera con catch).
- **Livestock**: AnimalList (search, herd counters, repro chip, per-row actions menu, FAB); AnimalForm modal (photos via expo-image-picker, name/sex/birth/parents, breed + per-type identification inputs from the catalogs); AnimalDetail (gallery + identity + stat tiles + Ficha/Reproducción/Descendencia tabs); reproduction modals (RegisterBirth, Wean, ReproductionEvents); Genealogy modal (generation columns, navigable); delete. **Genética externa (2026-07)**: check "Genética externa" en AnimalForm (solo al crear; el flag es inmutable) → el animal vive en `livestock.externals` (`GET /animals/?external=true`), nunca en el hato; los pickers de madre/padre/toro los agregan con sufijo "(externo/a)"; ficha y genealogía los marcan con chip/`· Externo`. Offline: comparten la tabla `animals` de SQLite (su JSON lleva `is_external`) — `pull.js` descarga ambas listas y `hydrate.js` las separa al hidratar.
- **Imágenes (2026-07)**: remotas SIEMPRE con **`expo-image`** (`import { Image } from 'expo-image'`, `contentFit` + `transition`; caché en disco por URL y decode al tamaño de la vista) — lista, galería del detalle y tira del formulario ya migradas; NO usar el `Image` de react-native para fotos del backend. Al subir, toda foto pasa por `optimizeForUpload` (expo-image-manipulator: lado máx **2560px, JPEG 0.85** → ~1MB en vez de 3-8MB; `manipulateAsync` está deprecated-pero-funcional en SDK 56, NO lanza como media-library). ⚠ NO bajar de 2560/0.85: la foto del servidor es la que ven compradores en web/monitores/zoom — la calidad visual es requisito de negocio (decisión 2026-07). Los pickers capturan con `quality: 1` (la galería del teléfono recibe la foto a calidad de cámara; solo la copia subida se comprime). Mejora futura correcta: thumbnails del lado del servidor para el listado, conservando la subida como "full".
- **Cámara + álbum de galería (2026-07)**: en la tira de fotos de AnimalFormModal los DOS PRIMEROS tiles son fijos — "Cámara" (`ImagePicker.launchCameraAsync`) y "Galería" (picker múltiple) — y las fotos se acomodan a la derecha. Cada foto tomada desde la app queda adjunta al animal Y guardada en la **carpeta "HatoSync"** de la galería del teléfono vía `expo-media-library/legacy` (`createAssetAsync` + `getAlbumAsync/createAlbumAsync/addAssetsToAlbumAsync`). ⚠ Importar SIEMPRE de `/legacy`: en SDK 56 la API de funciones importada del paquete raíz lanza "deprecated" en runtime (la raíz solo trae la nueva API de clases). ⚠ Permisos: pedir `requestPermissionsAsync(false, ['photo'])` — writeOnly=true se resuelve DENEGADO sin diálogo en Android 13+, y SIN granularPermissions se piden también video y audio y la llamada puede LANZAR si no están en el manifest (era el "No se pudo guardar en la galería"). Cascada de fallbacks: createAssetAsync → saveToLibraryAsync (galería sin carpeta); mover al álbum puede fallar por scoped storage → reintentar con copy=true. Cada resultado avisa con toast y el catch final muestra `e.message` para diagnóstico remoto. Permisos en app.json (`cameraPermission` de expo-image-picker + plugin `expo-media-library` con `photosPermission`/`savePhotosPermission`). El guardado en galería NO bloquea el flujo de captura (sin await).
- **Configuration**: Razas and Identificación catalogs (CRUD via shared store; `is_unique` toggle).
- **Farms**: FarmList (CRUD; create via `/farms/setup/` with optional members); FarmMembers (farm switcher, search, role chips, add/edit/remove; OWNER protected). MemberFormModal (2026-07): crear = formulario de usuario nuevo (nombre, correo, teléfono, contraseña, rol) con un check **"Usuario existente"** al final (antes del botón) que cambia al picker de usuarios de mis otras fincas (`{user_id, role}`); editar = datos completos del usuario vinculado + rol (contraseña opcional para restablecerla). El backend acepta ambos modos en `POST/PATCH /farms/members/` (crea el usuario junto con la membresía, actualiza el user anidado, y reasociar a un retirado reactiva la membresía) — contrato completo en `hatosync-ui/CLAUDE.md` §Farms.
- Livestock-domain thunks live in `livestock/store/livestockThunks.js` (refreshAnimals, refreshExternals, fetchAnimalFull, fetchGenealogy, fetchReproductionEvents, createReproductionEvent, registerBirth, weanCalf, syncAnimalPhotos, fetchWeights, createWeight, deleteWeight).
- **Control de peso (2026-07)**: acción "Registrar peso" en el menú por fila de AnimalList (WeightFormModal: fecha, kg, notas) + tab "Peso" en AnimalDetail con la curva (`WeightChart`, gifted-charts, ≥ 2 pesajes), el histórico y la comparativa vs el pesaje anterior (▲ subió / ▼ bajó / primer registro). El backend deriva `previous_weight_kg`/`diff_kg`, pero la pantalla los **recalcula client-side** (`weightsWithDiffs`) para cubrir los pesajes creados offline que aún no tienen los campos del servidor. Offline: tabla `weight_records` en SQLite (se llena desde el `/full/` en la descarga), `createWeight`/`deleteWeight` son local-first (optimista + outbox, UUID de cliente idempotente), y el dossier local (`getAnimalFullLocal`) incluye `weight_records`.

### Offline (Fases 1, 2 y 3-fotos — implementadas)

Local-first de **lectura** (Fase 1), **escritura** (Fase 2: outbox + UUID de cliente) y **fotos** (Fase 3, 2026-07). Diseño completo en `OFFLINE-PLANNING.md`.
- **`src/db/`**: SQLite (`expo-sqlite`) — `index.js` (schema/open), `meta.js` (KV: perfil cacheado, última descarga), `repositories.js` (saves por entidad + lectores + ensambladores locales: `getAnimalFullLocal`, `getEventsLocal`, `buildGenealogyLocal`, offspring derivado).
- **`src/sync/`**: `pull.js` (descarga en 3 capas — metadata → hato → fichas `/full/` con concurrencia limitada y **reanudable** vía `full_synced`), `hydrate.js` (SQLite → Redux vía `crudRegistry`), `connectivity.js` (`useOnline`/`isOnline` con netinfo **+ modo degradado**, ver abajo).
- **Señal intermitente — MODO DEGRADADO (2026-07)**: en el campo netinfo dice "conectado" pero el servidor no responde y antes la app quedaba "cargando" para siempre. Solución en 3 piezas: (1) `apiClient` con **`timeout: 10000`** (también el refresh de token; un refresh fallido POR RED ya no desloguea — solo un rechazo real del servidor); (2) interceptores de axios reportan a `connectivity.js`: un error sin respuesta → `reportNetworkFailure()` abre una **ventana degradada de 45 s** en la que `isOnline()`/`useOnline()` devuelven false (escrituras van directo al outbox, lecturas usan el cache, chip cloud-off en el header) + toast global "Señal inestable: se trabajará sin conexión…"; cualquier respuesta del servidor (aunque sea 4xx) → `reportNetworkSuccess()`; (3) un **probe** cada 15 s a `GET /api/v1/health/` (sin auth, timeout 4 s, axios crudo) detecta la recuperación → toast "Conexión restablecida" + `SyncProvider` se suscribe vía `onConnectivityChange` y hace flush automático del outbox (netinfo no dispara ese caso porque la antena nunca se fue). `showGlobalToast()` en `Toast.js` permite avisar desde capas sin hooks.
- **Bootstrap offline-aware** (`authSlice.bootstrap`): abre la DB, restaura sesión y **no cierra sesión si falla la red** (solo en 401 real); offline carga el perfil cacheado y rehidrata Redux.
- **Thunks con fallback local**: `fetchAnimalFull`/`fetchReproductionEvents`/`fetchGenealogy` intentan red y caen al cache local. Las pantallas de lista **omiten el fetch si `!online`** (ya vienen hidratadas).
- **UI**: pantalla `modules/sync/SyncScreen` ("Datos offline" en el drawer) con descarga + progreso + última descarga; chip `cloud-off` en el header cuando no hay conexión.
- Flujo: el usuario **descarga la finca activa** (en casa/con señal) → consulta todo offline en campo.
- **Aislamiento por cuenta (2026-07)**: la DB SQLite es del dispositivo, no del usuario. `authSlice.login` compara el perfil cacheado con el que entra y, si es OTRA cuenta, ejecuta `clearLocalData()` (todas las tablas + outbox + sync_meta) y `RESET()` de todos los slices CRUD — sin esto, las fincas del usuario anterior (p. ej. el superusuario) se hidrataban al selector del nuevo. Además `fetchState` re-persiste el snapshot de `/farms/` en cada GET online y `AppHeader` refresca `/farms/` una vez por sesión aunque la caché ya haya hidratado la lista (el check de lista-vacía no basta).

- **Fotos offline (Fase 3, 2026-07)**: `syncAnimalPhotos` es local-first. Offline (o si la señal cae a mitad): la foto se COPIA a `documentDirectory/outbox-photos/` (`src/sync/photoStore.js` — el caché del picker/manipulador es purgable por el SO, por eso la copia) y se encola en la outbox como operación **`UPLOAD`** (body = `{animalId, id, field, file:{uri local, name, type}}`; sin `module`/`nameState` a propósito — su reconcile es propio, no el genérico de CRUD). `flushOutbox` arma el FormData con la copia local, POSTea multipart, reconcilia `animal_photos` (URI local → URL del servidor, mismo UUID) y borra la copia. El **backend acepta `id` de cliente** en `POST /animals/{id}/photos/` (UUID escribible + `IdempotentCreateMixin` — reintentos no duplican). Optimista: la foto aparece al instante con su `file://` (el animal en Redux recibe `photos[]` + `primary_photo` locales; `mediaUrl()` deja pasar `file:` sin prefijar el origin). Borrados de fotos offline = DELETE encolado normal. `clearLocalData()` (cambio de cuenta) también vacía `outbox-photos/`. FIFO garantiza animal-antes-que-su-foto. La UI avisa "N foto(s) quedan por subir" (toast del modal).

### Push notifications (FCM, 2026-07)

`src/notifications/index.js`: `registerPushToken(userId)` — canal Android `default` (HIGH), pide permiso (Android 13+), obtiene el token **nativo** con `getDevicePushTokenAsync()` (NO el Expo push token: el backend envía directo con firebase-admin) y lo sube a `POST /auth/me/push-token/`. Se dispara desde `RootNavigator` cuando hay sesión (idempotente por usuario; best-effort — sin permiso/red/Expo Go no rompe). El `setNotificationHandler` muestra banner+sonido con el app abierto. **Deep link (2026-07)**: el backend manda `data={'screen':'AnimalDetail','animal_id':...}`; `notifications/index.js` expone `navigationRef` (ref del NavigationContainer) + `setupNotificationNavigation()` (tap con app abierta/background vía `addNotificationResponseReceivedListener`, y cold start vía `getLastNotificationResponseAsync`) + `flushPendingNavigation()` (si la push llega antes de que la navegación esté lista, el destino queda pendiente y se despacha en `onReady`); el navigate va en try/catch por si no hay sesión. Todo cableado en `navigation/index.js`. Nativo: plugin `expo-notifications` + `android.googleServicesFile` en app.json (prebuild aplica el plugin de Gradle `com.google.gms.google-services` solo — NUNCA editar los build.gradle a mano para Firebase). Probar: `manage.py send_test_push <email>` en el backend. El backend notifica: animal nuevo (compras), pesaje, parto y "te asignaron un animal" (audiencia por rol; el actor no se auto-notifica).

**Ahead**: sync incremental (delta) + conflictos multi-usuario (resto de Fase 3); register/forgot-password. Verifica el bundle con `npx expo export --platform android --output-dir ./.export-check`.

### Health / Sanitario (tratamientos, 2026-07 — IMPLEMENTADO, paridad 1:1 con el web)

Espejo exacto de `hatosync-ui/CLAUDE.md` §Health — **esa es la spec única de datos/flujo para ambos clientes** (endpoints, shapes, roles). Aquí queda cómo está construido en mobile:

- **Store**:
  - `configuration.medications` (catálogo por finca, mismo slice que razas/identificación) → `MedicationsScreen` + `MedicationFormModal` en el módulo **configuration** (igual que el web pone Medicamentos bajo Configuración). CRUD por los shared thunks.
  - `health` slice (`store/healthSlice.js`, `createCrudSlice`): `{ protocols: [], applications: [] }`. Acciones de dominio en `store/healthThunks.js` (**online-first**, como el web): `fetchProtocols(params)`, `fetchApplications(params)`, `applyApplication`, `skipApplication`, `createTreatment`, `cancelTreatment`. El CRUD de protocolos va por los shared thunks (`module:'health', nameState:'protocols'`).
- **Screens** (`src/modules/health/screens/`): `HealthAgendaScreen` (toggle **Pendientes → calendario** / **Todas → lista**; contadores pendientes/vencidas; botón Protocolos solo admin) · `ProtocolListScreen` (CatalogList de protocolos TREATMENT, admin).
- **Components** (`src/modules/health/components/`): `HealthCalendar` (mes con eventos clickeables estilo Google → modal-burbuja con detalle + Aplicar/Omitir; "+N"/tap del día → modal del día), `ApplicationResolver` (aplicar con fecha/hora u omitir), `ProtocolFormModal` (calendario por **días** relativos al inicio + **generador de pauta repetida** «cada N días/horas, M veces»), `TreatmentFormModal` (desde protocolo o ad-hoc), `HealthTimeline` (tab Sanidad del detalle: tratamientos + línea de aplicaciones + aplicar/omitir/cancelar + "Nuevo tratamiento"), `DateTimeField` (fecha+hora nativa: dos pasos en Android, datetime en iOS).
- **Integration**: `AppStack` monta `HealthAgenda`/`ProtocolList` (+ `MedicationList` → `configuration/MedicationsScreen`); `menuItems` = grupo **Sanidad** (Agenda + Protocolos admin) y **Medicamentos** bajo Configuración; `visibleMenuItems` ahora **filtra también los hijos por rol**. `AnimalDetailScreen` tab "Sanidad" → `HealthTimeline` (`canWrite={!isPartner}`, `onChanged={load}`). `AnimalActionsMenu`/`AnimalListScreen` → "Nuevo tratamiento" abre `TreatmentFormModal`.
- **Roles**: PARTNER ve la agenda pero NO resuelve ni crea; Protocolos y Medicamentos solo OWNER/ADMIN (gating en menú + selectores `roleSelectors`).
- **Diferencias de plataforma vs. web** (mismo fondo, distinta forma nativa): la burbuja del evento es un modal centrado (Paper Portal) en vez de un popover anclado; fecha/hora con `DateTimeField` nativo en vez de `datetime-local`.
- **Pendiente**: offline de sanidad (SQLite + outbox para tratamientos/aplicaciones) — hoy es **online-first** en ambos clientes; es fase posterior (el resto del móvil sí es offline-first). IATF/lotes (`ProtocolBatchDialog`, protocolos REPRODUCTIVE) tampoco están: el backend lo deja listo pero la UI de lotes es fase futura.
