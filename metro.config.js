// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Modelos de visión computacional embebidos en el APK (inferencia on-device):
// Metro debe tratar .onnx como asset para poder hacer require() del archivo.
config.resolver.assetExts.push('onnx')

// TRANSFORM sin optimizaciones de requires (PERMANENTE junto al dedupe de
// abajo): con las opciones stock (experimentalImportSupport/inlineRequires) el
// release rompía el registro de componentes nativos (p. ej. "view config getter
// callback for RNSVGCircle must be a function") — el orden de evaluación
// perezoso deja registros a medias. Verificado en emulador 2026-07-19.
config.transformer.getTransformOptions = async () => ({
  transform: { experimentalImportSupport: false, inlineRequires: false },
})

// DEDUPE de react (PERMANENTE — no quitar): en release el bundle terminaba con
// DOS instancias de react → el renderer instalaba el dispatcher de hooks en una
// y react-native-paper leía la otra → crash al arrancar: "Cannot read property
// 'useContext' of null" en ToastProvider/useTheme (bug real 2026-07-19,
// diagnosticado con emulador + logcat). Forzar que TODA resolución de 'react'
// y sus subpaths caiga en la única copia real.
const REACT_FORCED = {
  react: require.resolve('react'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
}
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (REACT_FORCED[moduleName]) {
    return { type: 'sourceFile', filePath: REACT_FORCED[moduleName] }
  }
  if (defaultResolveRequest) return defaultResolveRequest(context, moduleName, platform)
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
