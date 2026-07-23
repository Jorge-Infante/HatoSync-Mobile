const { withAppBuildGradle } = require('expo/config-plugins')

/**
 * Build LOCAL en Windows: las rutas de objetos de CMake (staging .cxx + espejo
 * de la ruta absoluta del fuente) superan los 260 chars de MAX_PATH y ninja
 * muere con "Filename longer than 260 characters" (sin admin no se puede
 * activar LongPathsEnabled). Remedio en dos partes:
 *   1. compilar desde el junction corto C:\hsm (cmd /c mklink /J C:\hsm <proyecto>)
 *   2. este plugin: mueve el staging de CMake a C:\hsx (corto).
 * Con ambas, la ruta más larga queda ~252 chars. Solo aplica cuando el prebuild
 * corre EN WINDOWS — en EAS (Linux) no toca nada.
 */
function gradleSnippet(realRoot) {
  // Gradle acepta forward slashes en Windows; evita escapar backslashes.
  const root = realRoot.replace(/\\/g, '/')
  return `
// Windows MAX_PATH: staging corto para el build nativo (ver plugins/withShortCxxPath.js)
android {
    externalNativeBuild {
        cmake {
            buildStagingDirectory "C:/hsx"
        }
    }
}

// Windows MAX_PATH (ver plugins/withShortCxxPath.js): el NATIVO compila desde el
// junction corto C:\\hsm, pero el BUNDLE JS debe generarse desde la ruta REAL —
// con root/entry en el junction, Metro veia el proyecto bajo dos identidades de
// ruta y duplicaba modulos en el bundle (react duplicado -> "useContext of null";
// registro de RNSVG a medias). JS no sufre MAX_PATH; solo CMake.
react {
    root = file("${root}")
    entryFile = file("${root}/index.js")
}
`
}

module.exports = function withShortCxxPath(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (process.platform === 'win32' && !cfg.modResults.contents.includes('buildStagingDirectory')) {
      // process.cwd() durante el prebuild = la ruta REAL del proyecto.
      cfg.modResults.contents += gradleSnippet(process.cwd())
    }
    return cfg
  })
}
