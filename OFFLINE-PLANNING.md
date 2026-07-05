# Planning — Offline-first y sincronización

> Documento de diseño del modo offline (núcleo del negocio: usar la app en campo
> sin señal). **No es implementación**, es el plan acordado antes de programar.

---

## 1. Objetivo

Que el usuario pueda, **en el campo y sin internet**:
1. **CARGAR** toda la data de la finca activa antes de salir (descarga previa).
2. **CONSULTAR** el hato (lista, ficha, reproducción, genealogía) offline.
3. **CREAR/EDITAR** animales y eventos localmente.
4. **SINCRONIZAR** todo hacia el backend al recuperar señal, sin perder ni duplicar.

---

## 2. Principio rector: **local-first**

Hoy el flujo es: pantalla → thunk → API → Redux. Cambia a:

```
Pantalla → Redux (memoria) → SQLite (disco, fuente de verdad local)
                                   ↑↓
                            Motor de sync ⇄ API (cuando hay señal)
```

- **Leer**: siempre desde local (SQLite → Redux). La red solo refresca el cache.
- **Escribir**: primero local (optimista, instantáneo) + se encola en el **outbox**.
  El motor de sync sube los cambios cuando hay conexión.

La regla de oro: **la app nunca depende de la red para funcionar**; la red es un
detalle de fondo.

---

## 3. Decisiones de arquitectura (con recomendación)

### 3.1 Motor de almacenamiento local → **expo-sqlite** (recomendado)
| Opción | Veredicto |
|---|---|
| **expo-sqlite** (SQLite) | ✅ **Recomendado.** Relacional, consultas, escala a miles de animales, ideal para outbox y queries por finca. |
| redux-persist + AsyncStorage | Más rápido de montar pero carga todo en memoria; no escala ni consulta bien. Sirve para un MVP mínimo, no para el core. |
| WatermelonDB | Potente para sync, pero pesado y ya se descartó en el plan original. |

### 3.2 **UUID generados en el cliente** (la pieza clave) 🔑
Al crear offline, el celular genera el UUID del animal/evento (con `expo-crypto`).
- El id es estable desde el minuto cero → las relaciones (madre/padre, cría) se
  arman localmente y siguen válidas tras sincronizar.
- En el backend, ese mismo UUID se usa como PK → el `POST` es **idempotente**
  (subir dos veces no duplica). Requiere confirmar que el backend acepta el `id` en el create.

### 3.3 Detección de conectividad → **@react-native-community/netinfo**
Para saber online/offline y disparar auto-sync al recuperar señal.

---

## 4. Modelo de datos local (SQLite)

Tablas espejo del backend, **filtradas por finca**:
`farms`, `farm_members`, `breeds`, `identification_types`, `animals`,
`reproductive_events`, `animal_photos`.

Cada fila lleva **columnas de sincronización**:
- `updated_at` — timestamp del servidor (para deltas).
- `_dirty` (0/1) — tiene cambios locales sin subir.
- `_deleted` (0/1) — tombstone (borrado local pendiente de propagar).
- `_synced_at` — última vez confirmada por el servidor.

Tablas de control:
- **`outbox`** — cola de mutaciones pendientes: `{id, entity, op (create|update|delete),
  payload JSON, created_at, status (pending|sending|error), retries, last_error}`.
- **`sync_meta`** — por entidad: `last_pulled_at`, cursor del servidor.

---

## 5. Flujos

### 5.1 Lectura (offline siempre)
Pantalla lee de Redux; Redux se hidrata desde SQLite al abrir la app y tras cada sync.

### 5.2 Escritura offline (optimista)
1. Genera UUID (si es create).
2. Escribe en SQLite con `_dirty=1` y refleja en Redux (UI instantánea).
3. Inserta entrada en `outbox`.
4. (Si hay señal) el motor empuja; (si no) queda pendiente con badge "por subir".

### 5.3 Sync **pull** (descargar)
Trae el snapshot/delta de la finca activa → upsert en SQLite → rehidrata Redux.

### 5.4 Sync **push** (subir)
Procesa el `outbox` en **orden FIFO**:
- `create` → POST con el UUID; `update` → PATCH; `delete` → DELETE.
- Éxito → limpia `_dirty`/quita del outbox. Error de red → reintenta luego.
  Error 4xx (validación) → marca el item como conflicto para revisión manual.

---

## 6. "CARGAR la data antes de ir a campo" (tu pregunta directa)

Acción **"Descargar para uso offline"** (botón visible, con progreso y fecha de
"última descarga"). Estando online, baja **todo lo de la finca activa**:
- Fincas + miembros + catálogos (razas, tipos de identificación).
- **Animales** (lista completa — hoy el backend devuelve arrays sin paginación).
- **Eventos reproductivos** de cada animal (necesarios para ver reproducción offline).
- **Fotos** (opcional, ver §9) — descarga los archivos al disco del teléfono.

> ⚠️ Punto crítico: descargar los eventos animal por animal serían **N llamadas**
> (lento y frágil). **Recomendación fuerte:** que el backend exponga un endpoint
> **snapshot** que devuelva TODO lo de la finca en una sola respuesta + un timestamp
> de corte. Es el cambio de backend más valioso para el offline.

### 6.1 Orquestación concreta de la descarga (Fase 1)

**Qué NO se descarga — se deriva en el teléfono** (ahorra llamadas y almacenamiento):
- **Genealogía**: el árbol de ancestros se reconstruye recorriendo los `mother`/`father`
  de la tabla local `animals`. No se pega a `/genealogy/`.
- **Descendencia** (`offspring`): se deriva (animales cuya madre/padre == id).
- **Resumen reproductivo** (estado, días abiertos): ya viene en la lista lean.

**Qué SÍ se descarga — pipeline en 3 capas:**

| Capa | Peticiones | Desbloquea |
|---|---|---|
| **1 · Metadata** (~5, rápida) | `/auth/me/`, `/farms/`, `/farms/members/`, `/configuration/breeds/`, `/configuration/identification-types/` | Perfil, fincas, miembros, catálogos |
| **2 · Hato** (1) | `/livestock/animals/` (lista lean) | La **lista ya es navegable offline** + da todos los ids |
| **3 · Fichas** (N) | `/livestock/animals/{id}/full/` ×N | Detalle + **eventos reproductivos** + fotos + identificaciones offline |

**Ejecución de la Capa 3 (la pesada):**
- **Fan-out con concurrencia limitada** (~6 simultáneas), no las N de golpe.
- **Progreso** ("Fichas 45/320") y **reanudable** (se marca en SQLite cuáles ya se bajaron;
  si se corta la descarga, retoma las faltantes).
- Cada `/full/` se **normaliza** al guardar: sus partes van a `reproductive_events`,
  `animal_photos`, etc. (no se guarda el blob crudo).

**N+1 hoy → snapshot mañana:** con los endpoints actuales la Capa 3 son N llamadas
(aceptable porque se descarga en casa antes de salir). Cuando el backend exponga
`/sync/snapshot/` (1 sola respuesta con todo), la Capa 3 colapsa a una request **sin
cambiar el código del cliente** — solo cambia la fuente de datos de esa capa.

**Estado de la descarga** (tabla `sync_meta`): por entidad guardamos `last_pulled_at`,
total/descargados de fichas, y el timestamp de "última descarga" que se muestra en la UI.

---

## 7. Conflictos

- **MVP**: *last-write-wins* por registro (el último PATCH gana). Aceptable para un
  operario por finca.
- **Multi-usuario** (dos personas editan el mismo animal sin señal): se detecta por
  `updated_at` y se **muestra el conflicto** para resolver a mano. (Fase posterior.)

---

## 8. Problemas difíciles / coordinación con el backend (HatoSync-Api)

Esto **no se resuelve solo en el móvil**; hay que tocar el backend:
1. **Aceptar `id` (UUID) en los `POST`** de animales y eventos → idempotencia.
2. **`updated_at` en todos los modelos** + endpoint **delta** (`?updated_since=...`)
   para sync incremental (no bajar todo cada vez).
3. **Tombstones de borrado** (que los `delete` se propaguen al hacer pull).
4. **Endpoint snapshot** de la finca (un solo GET con todo) — ver §6.
5. **Reproducción offline** ⚠️: el endpoint `birth/` crea la cría en el servidor con
   un UUID nuevo. Offline ya creamos la cría localmente con su UUID → para no duplicar,
   el flujo offline debe **descomponerse** en "crear animal (UUID cliente) + crear
   evento BIRTH", o que `birth/` acepte el UUID de la cría de forma idempotente.

---

## 9. Fotos offline (opcional, pesado)
- Para verlas sin señal, descargar los archivos a `expo-file-system` y guardar la ruta local.
- Subir fotos creadas offline = encolar el archivo en el outbox (multipart al recuperar señal).
- **Recomendación:** hacerlo **opt-in** (consume datos/almacenamiento); en campo a veces
  basta con la ficha de texto.

---

## 10. UX / indicadores
- **Chip de estado** en el header: online/offline · "N cambios por subir" · "última sync".
- Botón **"Descargar para campo"** y **"Sincronizar ahora"**.
- Badge "pendiente de subir" en animales/eventos creados offline.
- Aviso al salir si hay cambios sin sincronizar.

---

## 11. Librerías nuevas
- `expo-sqlite` — base de datos local.
- `expo-crypto` — `randomUUID()` para ids cliente.
- `@react-native-community/netinfo` — conectividad.
- `expo-file-system` — (solo si hacemos fotos offline).

---

## 12. Roadmap por fases (entregables)

| Fase | Qué entrega | Valor |
|---|---|---|
| **0. Backend** | UUID-on-create, `updated_at`, tombstones, endpoint snapshot/delta | Habilita todo lo demás |
| **1. Cache + lectura offline** | SQLite + capa `db/`, hidratar Redux desde disco, acción "Descargar datos", consultar offline | 🚀 Ya soluciona "consultar en campo" |
| **2. Escritura offline** | UUID cliente, escritura optimista, `outbox`, "Sincronizar" manual (push), last-write-wins, chip de estado | Crear animales/eventos sin señal |
| **3. Sync avanzado** | Auto-sync con netinfo, delta incremental, reproducción + fotos offline, conflictos multi-usuario | Robustez y eficiencia |

**Sugerencia:** Fase 1 entrega el 80% del valor (consultar todo el hato en campo)
con bajo riesgo. La Fase 2 es la más delicada. Avanzar fase por fase, no todo junto.

---

## 13. Dónde vive en el código (sin romper lo actual)
- `src/db/` — esquema SQLite + repositorios por entidad.
- `src/sync/` — `pull`, `push`, `outbox`, `syncEngine` (orquestación + netinfo).
- Los `sharedThunks` se vuelven **offline-aware**: escriben a SQLite + outbox y
  actualizan Redux; las pantallas casi no cambian (siguen leyendo de Redux).
- Toda la lógica cuelga de la capa api/store, **no** de pantallas sueltas.

---

## 14. Decisiones que necesito de ti antes de codear
1. **Motor**: ¿confirmamos **expo-sqlite** (recomendado) o prefieres el atajo
   redux-persist para un primer MVP?
2. **Backend**: ¿puedes/quieres tocar `HatoSync-Api` (endpoint snapshot, `updated_at`,
   aceptar UUID en create)? Es lo que destraba el sync serio. Si por ahora **no**,
   hacemos Fase 1 (lectura offline) con los endpoints actuales.
3. **Alcance del primer paso**: ¿arrancamos con **Fase 1 (consulta offline)** y luego
   escritura, o vas con todo de una?
4. **Fotos offline**: ¿dentro del alcance ahora o lo dejamos para la Fase 3?
