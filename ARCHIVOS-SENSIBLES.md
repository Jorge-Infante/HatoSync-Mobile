# Archivos sensibles

Estos archivos contienen **credenciales, claves o configuración privada** y por eso
están en `.gitignore`: **nunca deben subirse al repositorio**. Se guardan solo en la
máquina de cada desarrollador / en los servicios de CI (EAS Secrets).

Si acabas de clonar el repo, tienes que crear/obtener estos archivos manualmente antes
de compilar o correr la app. Pídelos a un miembro del equipo o genéralos desde la
consola correspondiente.

---

## 1. `.env` — Variables de entorno de Expo

- **Qué es**: define `EXPO_PUBLIC_API_ORIGIN`, el origen del backend `HatoSync-Api`.
  Expo **incrusta** las variables `EXPO_PUBLIC_*` dentro del APK al compilar (no se leen
  en runtime); si cambias la URL hay que recompilar o reiniciar Expo con `--clear`.
- **Por qué es sensible**: expone URLs de infraestructura (túneles ngrok, IPs de
  servidores) que no queremos públicas.
- **Cómo obtenerlo**: copia `.env.example` a `.env` y ajusta la URL según tu entorno
  (emulador `http://10.0.2.2:8000`, celular en Wi-Fi `http://<IP-LAN>:8000`, simulador
  iOS/web `http://127.0.0.1:8000`, o el túnel ngrok compartido).

## 2. `google-services.json` — Configuración de Firebase (Android / FCM)

- **Qué es**: archivo de configuración de Firebase para Android. Lo referencia
  `app.json` en `android.googleServicesFile` y habilita las **push notifications (FCM)**.
- **Por qué es sensible**: contiene el `api_key`, `project_id`, `project_number` y el
  `mobilesdk_app_id` del proyecto Firebase.
- **Cómo obtenerlo**: Firebase Console → proyecto **hatosync** → Configuración del
  proyecto → app Android `com.hatosync.mobile` → *Descargar google-services.json*.
  Colócalo en la raíz del repo. Sin este archivo, `expo prebuild` / el build EAS no
  configuran FCM y las notificaciones no llegan.

## 3. `GoogleService-Info.plist` — Configuración de Firebase (iOS)

- **Qué es**: equivalente de `google-services.json` para iOS (aún no usado, pero
  ignorado por si se agrega soporte iOS de push).
- **Cómo obtenerlo**: Firebase Console → app iOS → *Descargar GoogleService-Info.plist*.

## 4. Cuentas de servicio de Firebase Admin — `*-firebase-adminsdk-*.json`, `serviceAccountKey.json`, `firebase-service-account*.json`

- **Qué es**: clave privada de una cuenta de servicio de Firebase (usada por el backend
  con `firebase-admin` para **enviar** las push). Normalmente vive en `HatoSync-Api`,
  pero se ignora aquí por seguridad si aparece.
- **Por qué es sensible**: da acceso administrativo total al proyecto Firebase. **Nunca
  se comparte.**
- **Cómo obtenerlo**: Firebase Console → Configuración → Cuentas de servicio →
  *Generar nueva clave privada*.

## 5. Firmas / keystores de Android — `*.jks`, `*.keystore`

- **Qué es**: el keystore con el que se firma el APK/AAB de release.
- **Por qué es sensible**: quien lo tenga puede publicar apps firmadas como si fueran
  nuestras. EAS lo gestiona en la nube (`eas credentials`); solo aparece localmente si
  se hace *build* manual.

## 6. Claves de iOS — `*.p8`, `*.p12`, `*.mobileprovision`, `*.pem`, `*.key`

- **Qué es**: certificados y perfiles de aprovisionamiento de Apple / claves privadas.
- **Por qué es sensible**: credenciales de firma y APNs. Igual que los keystores, EAS
  los administra.

---

## Nota sobre `eas.json`

`eas.json` **sí está versionado** (define los perfiles de build de EAS). Contiene URLs
de backend por perfil (desarrollo/preview/producción). No trae secretos de firma —
esos los guarda EAS— pero **no pongas tokens ni claves ahí**: usa
[EAS Secrets](https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables)
(`eas secret:create`) para cualquier valor privado que necesite el build.

## Regla general

Antes de hacer commit, verifica que no estás subiendo secretos:

```powershell
git status            # ningún archivo de la lista de arriba debe aparecer como tracked
git check-ignore google-services.json .env   # deben salir listados (= ignorados)
```
