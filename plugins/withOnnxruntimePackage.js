const { withMainApplication } = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')

/**
 * Registra OnnxruntimePackage manualmente en MainApplication.
 *
 * Por qué: el autolinking de RN 0.82/Expo 56 solo registra librerías new-arch
 * (con `codegenConfig`); onnxruntime-react-native es un módulo legacy (sin
 * codegen) → su proyecto gradle compila (el plugin de ORT lo agrega como
 * dependencia) pero su ReactPackage nunca entra al PackageList y
 * `NativeModules.Onnxruntime` queda null en runtime (crash al abrir el
 * contador). El interop de legacy modules sí lo ejecuta una vez registrado.
 */
module.exports = function withOnnxruntimePackage(config) {
  return withMainApplication(config, (cfg) => {
    cfg.modResults.contents = mergeContents({
      src: cfg.modResults.contents,
      newSrc: '          add(ai.onnxruntime.reactnative.OnnxruntimePackage())',
      tag: 'onnxruntime-register',
      anchor: /PackageList\(this\)\.packages\.apply \{/,
      offset: 1,
      comment: '          //',
    }).contents
    return cfg
  })
}
