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

## Current state (full parity with the web client)

Everything in `hatosync-ui` is implemented:
- **Auth**: login, session restore, logout.
- **Drawer menu** (`menuItems.js`): Animales · Configuración (Razas, Identificación) · Mis fincas · Miembros. Active-farm selector + user menu in the header.
- **Livestock**: AnimalList (search, herd counters, repro chip, per-row actions menu, FAB); AnimalForm modal (photos via expo-image-picker, name/sex/birth/parents, breed + per-type identification inputs from the catalogs); AnimalDetail (gallery + identity + stat tiles + Ficha/Reproducción/Descendencia tabs); reproduction modals (RegisterBirth, Wean, ReproductionEvents); Genealogy modal (generation columns, navigable); delete. **Genética externa (2026-07)**: check "Genética externa" en AnimalForm (solo al crear; el flag es inmutable) → el animal vive en `livestock.externals` (`GET /animals/?external=true`), nunca en el hato; los pickers de madre/padre/toro los agregan con sufijo "(externo/a)"; ficha y genealogía los marcan con chip/`· Externo`. Offline: comparten la tabla `animals` de SQLite (su JSON lleva `is_external`) — `pull.js` descarga ambas listas y `hydrate.js` las separa al hidratar.
- **Configuration**: Razas and Identificación catalogs (CRUD via shared store; `is_unique` toggle).
- **Farms**: FarmList (CRUD; create via `/farms/setup/` with optional members); FarmMembers (farm switcher, search, role chips, add/edit/remove; OWNER protected). MemberFormModal (2026-07): crear = formulario de usuario nuevo (nombre, correo, teléfono, contraseña, rol) con un check **"Usuario existente"** al final (antes del botón) que cambia al picker de usuarios de mis otras fincas (`{user_id, role}`); editar = datos completos del usuario vinculado + rol (contraseña opcional para restablecerla). El backend acepta ambos modos en `POST/PATCH /farms/members/` (crea el usuario junto con la membresía, actualiza el user anidado, y reasociar a un retirado reactiva la membresía) — contrato completo en `hatosync-ui/CLAUDE.md` §Farms.
- Livestock-domain thunks live in `livestock/store/livestockThunks.js` (refreshAnimals, refreshExternals, fetchAnimalFull, fetchGenealogy, fetchReproductionEvents, createReproductionEvent, registerBirth, weanCalf, syncAnimalPhotos, fetchWeights, createWeight, deleteWeight).
- **Control de peso (2026-07)**: acción "Registrar peso" en el menú por fila de AnimalList (WeightFormModal: fecha, kg, notas) + tab "Peso" en AnimalDetail con la curva (`WeightChart`, gifted-charts, ≥ 2 pesajes), el histórico y la comparativa vs el pesaje anterior (▲ subió / ▼ bajó / primer registro). El backend deriva `previous_weight_kg`/`diff_kg`, pero la pantalla los **recalcula client-side** (`weightsWithDiffs`) para cubrir los pesajes creados offline que aún no tienen los campos del servidor. Offline: tabla `weight_records` en SQLite (se llena desde el `/full/` en la descarga), `createWeight`/`deleteWeight` son local-first (optimista + outbox, UUID de cliente idempotente), y el dossier local (`getAnimalFullLocal`) incluye `weight_records`.

### Offline (Fase 1 — implementada)

Local-first de **lectura**. Diseño completo en `OFFLINE-PLANNING.md`.
- **`src/db/`**: SQLite (`expo-sqlite`) — `index.js` (schema/open), `meta.js` (KV: perfil cacheado, última descarga), `repositories.js` (saves por entidad + lectores + ensambladores locales: `getAnimalFullLocal`, `getEventsLocal`, `buildGenealogyLocal`, offspring derivado).
- **`src/sync/`**: `pull.js` (descarga en 3 capas — metadata → hato → fichas `/full/` con concurrencia limitada y **reanudable** vía `full_synced`), `hydrate.js` (SQLite → Redux vía `crudRegistry`), `connectivity.js` (`useOnline`/`isOnline` con netinfo).
- **Bootstrap offline-aware** (`authSlice.bootstrap`): abre la DB, restaura sesión y **no cierra sesión si falla la red** (solo en 401 real); offline carga el perfil cacheado y rehidrata Redux.
- **Thunks con fallback local**: `fetchAnimalFull`/`fetchReproductionEvents`/`fetchGenealogy` intentan red y caen al cache local. Las pantallas de lista **omiten el fetch si `!online`** (ya vienen hidratadas).
- **UI**: pantalla `modules/sync/SyncScreen` ("Datos offline" en el drawer) con descarga + progreso + última descarga; chip `cloud-off` en el header cuando no hay conexión.
- Flujo: el usuario **descarga la finca activa** (en casa/con señal) → consulta todo offline en campo.
- **Aislamiento por cuenta (2026-07)**: la DB SQLite es del dispositivo, no del usuario. `authSlice.login` compara el perfil cacheado con el que entra y, si es OTRA cuenta, ejecuta `clearLocalData()` (todas las tablas + outbox + sync_meta) y `RESET()` de todos los slices CRUD — sin esto, las fincas del usuario anterior (p. ej. el superusuario) se hidrataban al selector del nuevo. Además `fetchState` re-persiste el snapshot de `/farms/` en cada GET online y `AppHeader` refresca `/farms/` una vez por sesión aunque la caché ya haya hidratado la lista (el check de lista-vacía no basta).

**Ahead**: Fase 2 offline (escritura — outbox + UUID cliente; ⚠ verificar si el id de animal es int o UUID en la API antes, ver `OFFLINE-PLANNING.md §8`); register/forgot-password; production/health cuando el backend los tenga. Verifica el bundle con `npx expo export --platform android --output-dir ./.export-check`.
