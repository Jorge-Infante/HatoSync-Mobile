<#
.SYNOPSIS
  Compila el APK de release de HatoSync-Mobile LOCALMENTE en Windows, de forma
  reproducible. Encapsula TODA la receta que costó cerrar el 2026-07-19
  (ver HatoSync-Mobile/CLAUDE.md §Build LOCAL). Correr desde cualquier lado:

    powershell -ExecutionPolicy Bypass -File scripts\build-apk-local.ps1
    ...\build-apk-local.ps1 -ApiOrigin https://mi-tunel.ngrok-free.dev
    ...\build-apk-local.ps1 -Clean            # prebuild --clean + recompila nativo (lento, ~40 min)
    ...\build-apk-local.ps1 -Verify           # tras compilar, instala en el emulador y comprueba que ARRANCA

.DESCRIPTION
  Dos trampas de Windows encadenadas que este script maneja por ti:
   1) MAX_PATH (260): los objetos de CMake se pasan del límite → se compila el
      NATIVO desde el junction corto C:\hsm y el staging va a C:\hsx.
   2) ⚠ Pero el BUNDLE JS debe generarse desde la RUTA REAL: si Metro ve el
      proyecto a través del junction, duplica módulos en el bundle (dos copias
      de react) → crash SOLO en release ("Cannot read property 'useContext' of
      null" / "RNSVGCircle view config undefined"). El plugin
      plugins/withShortCxxPath.js inyecta en app/build.gradle el
      `react { root/entryFile }` apuntando a la ruta real. Nativo corto + JS
      real = build sano.
  El APK de release firma con el debug keystore del template (instalable
  directo). Incluye las 4 ABIs.
#>
[CmdletBinding()]
param(
  # Backend embebido en el APK (EXPO_PUBLIC_* se incrusta al compilar).
  [string]$ApiOrigin = 'http://161.97.74.149',
  # Prebuild --clean + gradle clean (recompila TODO el nativo). Úsalo si cambió
  # una dependencia nativa (expo install, versión, plugin) o el android/ quedó raro.
  [switch]$Clean,
  # Forzar `expo prebuild` (no --clean) aunque android/ ya exista.
  [switch]$Prebuild,
  # Tras compilar, instalar en un emulador/dispositivo conectado y verificar que
  # el proceso queda vivo (smoke test — el redbox de release oculta la causa real).
  [switch]$Verify
)

$ErrorActionPreference = 'Stop'

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# --- Rutas -------------------------------------------------------------------
$RealRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Junction = 'C:\hsm'
$Staging  = 'C:\hsx'

# --- JDK (Android Studio trae el jbr) ---------------------------------------
$Jdk = 'C:\Program Files\Android\Android Studio\jbr'
if (-not (Test-Path (Join-Path $Jdk 'bin\java.exe'))) {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) { $Jdk = $env:JAVA_HOME }
  else { Fail "No encuentro un JDK. Instala Android Studio o define JAVA_HOME." }
}
$Sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $Sdk)) { Fail "No encuentro el Android SDK en $Sdk (define ANDROID_HOME)." }

# --- Junction corto (MAX_PATH) ----------------------------------------------
Step "Junction $Junction -> $RealRoot"
$existing = Get-Item $Junction -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Target -and ($existing.Target -ne $RealRoot)) {
    Fail "$Junction ya existe y apunta a '$($existing.Target)', no a este proyecto. Bórralo (cmd /c rmdir C:\hsm) y reintenta."
  }
} else {
  cmd /c mklink /J $Junction $RealRoot | Out-Null
  if (-not (Test-Path (Join-Path $Junction 'package.json'))) { Fail "No se pudo crear el junction $Junction." }
}
if (-not (Test-Path $Staging)) { New-Item -ItemType Directory -Force $Staging | Out-Null }

# --- Entorno ----------------------------------------------------------------
$env:JAVA_HOME = $Jdk
$env:ANDROID_HOME = $Sdk
$env:Path = "$Jdk\bin;$env:Path"
$env:EXPO_PUBLIC_API_ORIGIN = $ApiOrigin
Step "API origin embebido: $ApiOrigin"

# --- Prebuild (solo si hace falta) ------------------------------------------
# El fix de rutas JS vive en app/build.gradle vía el plugin; si falta, prebuild.
$buildGradle = Join-Path $RealRoot 'android\app\build.gradle'
$needsInjection = -not ((Test-Path $buildGradle) -and (Select-String -Path $buildGradle -Pattern 'buildStagingDirectory' -Quiet) -and (Select-String -Path $buildGradle -Pattern 'entryFile = file\("C' -Quiet))

if ($Clean) {
  Step "Prebuild --clean (regenera android/ y recompila nativo; ~40 min)"
  Get-ChildItem -Path $Staging -Force -EA SilentlyContinue | Remove-Item -Recurse -Force -EA SilentlyContinue
  Push-Location $RealRoot; npx --yes expo prebuild --platform android --clean --no-install; $rc = $LASTEXITCODE; Pop-Location
  if ($rc -ne 0) { Fail "prebuild --clean falló." }
} elseif ($Prebuild -or $needsInjection) {
  if ($needsInjection) { Step "app/build.gradle sin el fix de rutas -> prebuild para inyectarlo" } else { Step "Prebuild (forzado)" }
  # ⚠ Debe correr desde la RUTA REAL: el plugin usa process.cwd() para el root del bundle.
  Push-Location $RealRoot; npx --yes expo prebuild --platform android --no-install; $rc = $LASTEXITCODE; Pop-Location
  if ($rc -ne 0) { Fail "prebuild falló." }
}
if (-not (Select-String -Path $buildGradle -Pattern 'entryFile = file\("C' -Quiet)) {
  Fail "El fix de rutas JS no quedó en app/build.gradle (revisa plugins/withShortCxxPath.js y app.json)."
}

# --- Build (nativo desde el junction corto) ---------------------------------
Push-Location (Join-Path $Junction 'android')
try {
  if ($Clean) { Step "gradlew clean"; & .\gradlew.bat clean --console=plain | Out-Null }
  Step "gradlew assembleRelease (esto tarda; build limpio ~40 min, incremental ~10 min)"
  & .\gradlew.bat assembleRelease --console=plain
  $rc = $LASTEXITCODE
} finally { Pop-Location }
if ($rc -ne 0) { Fail "assembleRelease falló (revisa el log de gradle arriba)." }

# --- Entrega ----------------------------------------------------------------
$apk = Join-Path $RealRoot 'android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) { Fail "El build terminó pero no encuentro el APK en $apk." }
$stamp = Get-Date -Format 'yyyy-MM-dd'
$dest = Join-Path ([Environment]::GetFolderPath('Desktop')) "HatoSync-$stamp.apk"
Copy-Item $apk $dest -Force
$mb = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Step "APK listo: $dest  ($mb MB)"

# --- Verificación opcional en emulador --------------------------------------
if ($Verify) {
  $adb = Join-Path $Sdk 'platform-tools\adb.exe'
  $dev = (& $adb devices) -join "`n"
  if ($dev -notmatch 'emulator-\d+\s+device|\bdevice\b') {
    Write-Host "AVISO: no hay emulador/dispositivo conectado; me salto la verificación." -ForegroundColor Yellow
  } else {
    Step "Verificando arranque en el dispositivo conectado..."
    & $adb uninstall com.hatosync.mobile *> $null
    & $adb install -r $apk | Out-Null
    & $adb logcat -c
    & $adb shell am start -n com.hatosync.mobile/.MainActivity | Out-Null
    Start-Sleep 20
    $pid = (& $adb shell pidof com.hatosync.mobile).Trim()
    $errs = & $adb logcat -d ReactNativeJS:E AndroidRuntime:E *:S
    if ($pid) { Write-Host "OK: la app quedó viva (pid $pid). Sin crash de arranque." -ForegroundColor Green }
    else { Write-Host "FALLO: la app NO quedó viva. Últimos errores:" -ForegroundColor Red; $errs | Select-Object -First 10 }
  }
}

Write-Host ""
Write-Host "Recordatorio: si el APK es para PROBAR de verdad, verifícalo antes de compartir" -ForegroundColor DarkGray
Write-Host "(-Verify con un emulador abierto). El redbox de release oculta la causa real." -ForegroundColor DarkGray
