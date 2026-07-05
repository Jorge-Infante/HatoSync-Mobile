# Cómo correr HatoSync móvil con el backend

Guía rápida para levantar la app conectada al backend (`HatoSync-Api`), tanto en
desarrollo local como para compartir un **APK** a testers vía túnel **ngrok**.

---

## 0. Resumen de la configuración actual

- El backend al que apunta la app se define con la variable `EXPO_PUBLIC_API_ORIGIN`.
  - En **dev local**: archivo `.env` (en la raíz de `HatoSync-Mobile`).
  - En **builds de EAS**: campo `env` de cada perfil en `eas.json` (porque `.env` está
    en `.gitignore` y EAS no sube archivos ignorados).
- Hoy ambos apuntan al **túnel ngrok** (URL pública HTTPS estable):
  `https://delegate-swarm-pushing.ngrok-free.dev`
- La app le agrega `/api/v1` automáticamente (ver `src/config/index.js`).
- Las imágenes (`<Image>`) llevan el header `ngrok-skip-browser-warning` para que
  ngrok no devuelva su página de aviso (ver `src/utils/format.js`).

> ⚠️ El cambio de URL **se incrusta al compilar**. Si cambias el origen del backend,
> hay que **reiniciar Expo con `--clear`** (dev) o **recompilar el APK** (EAS).

---

## 1. Probar EN VIVO (sin generar APK) — recomendado antes de cada build

### a) Levantar el backend (carpeta `HatoSync-Api`)
```powershell
venv\Scripts\python.exe manage.py runserver
```
Corre en `http://127.0.0.1:8000`. **No** necesitas `0.0.0.0` ni tocar el firewall:
ngrok sale hacia afuera desde tu PC y reenvía a ese puerto local.

### b) Levantar el túnel ngrok

**Instalar ngrok (una sola vez)** — si `ngrok` "no se reconoce como comando":
```powershell
winget install ngrok.ngrok      # o: choco install ngrok
```
Luego **abre una ventana NUEVA de PowerShell** (para que tome el PATH) y verifica:
```powershell
ngrok version
```
(Alternativa: descargar el .exe desde https://ngrok.com/download y correrlo desde su carpeta.)

Registra tu authtoken la primera vez (lo obtienes en el dashboard de ngrok →
*Your Authtoken*; **no lo guardes en el repo**):
```powershell
ngrok config add-authtoken <TU_AUTHTOKEN>
```
Luego, cada vez que vayas a probar (¡ojo: puerto **8000**, no 80!):
```powershell
  ngrok http --url=delegate-swarm-pushing.ngrok-free.dev 8000
```

### c) Levantar la app (carpeta `HatoSync-Mobile`)
```powershell
npx expo start --clear
```
- Tecla **a** → emulador/dispositivo Android.
- O escanea el QR con **Expo Go** en tu celular (no necesita estar en la misma red,
  porque va por ngrok).

### Verificar que el backend es alcanzable
Abre en cualquier navegador: `https://delegate-swarm-pushing.ngrok-free.dev/swagger/`
Si carga el Swagger, la app conectará.

---

## 2. Generar el APK para compartir (EAS Build, en la nube)

```powershell
npx eas-cli@latest login          # con tu cuenta Expo
npx eas-cli@latest build -p android --profile preview
```
- La primera vez crea el proyecto en tu cuenta (`eas init`) → acepta.
- Si pregunta por el **keystore**, di **sí** (Expo lo genera y custodia).
- Al terminar te da un **link de descarga**: ese `.apk` se lo pasas al tester.

Mientras alguien prueba el APK, en tu PC deben estar arriba **Django + ngrok**
(el APK habla con tu PC a través del túnel).

El perfil de build está en `eas.json` → `preview` (genera `.apk`, no `.aab`) y ahí
también está la `EXPO_PUBLIC_API_ORIGIN` que se incrusta en el APK.

---

## 3. Alternativas SIN túnel (solo desarrollo local)

Si no quieres usar ngrok, edita `EXPO_PUBLIC_API_ORIGIN` en `.env` y reinicia con
`--clear`:

| Dónde corres la app                | Valor del `.env`                 | Requisitos extra |
|------------------------------------|----------------------------------|------------------|
| Emulador Android                   | `http://10.0.2.2:8000`           | —                |
| Celular físico (misma Wi-Fi)       | `http://192.168.0.7:8000`        | `runserver 0.0.0.0:8000` + permitir el puerto 8000 en el firewall + misma red |
| Navegador web / simulador iOS      | `http://127.0.0.1:8000`          | —                |

> `192.168.0.7` es la IP LAN de este PC; puede cambiar si el router reasigna IP.

---

## 4. Cosas para tener presente

- **Tu PC debe estar encendida** con Django (+ ngrok si usas túnel) mientras alguien usa la app.
- El backend está con `DEBUG=True`; eso es lo que hace que Django sirva las imágenes
  de `/media/`. Es correcto para pruebas. En producción (VPS) habrá que servir media
  con Nginx o S3/MinIO.
- `ALLOWED_HOSTS` del backend está en `['*'] if DEBUG`, por eso acepta el host de ngrok.
- **Seguridad ngrok:** el authtoken es secreto. Si se filtró, rótalo en el dashboard de
  ngrok y vuelve a correr `ngrok config add-authtoken`.

---

## 5. Cuando pases a VPS + dominio (futuro)

Solo cambias la URL del backend en **dos lugares** y recompilas:
1. `.env` → `EXPO_PUBLIC_API_ORIGIN=https://api.tudominio.com`
2. `eas.json` → `env.EXPO_PUBLIC_API_ORIGIN` en los perfiles `preview`/`production`

Con dominio + HTTPS real ya no haría falta el header de ngrok (es inofensivo dejarlo),
y el backend debe quedar con `DEBUG=False`, `ALLOWED_HOSTS` específico y media servida
por el servidor web.
