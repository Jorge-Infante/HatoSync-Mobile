// Extiende app.json: google-services.json está gitignored, así que EAS Build no
// lo recibe con el código — llega como env var de archivo (GOOGLE_SERVICES_JSON,
// creada con `eas env:create --type file`). En local sigue usándose el archivo
// del repo (app.json). Ver DEPLOY/CORRER para el contexto.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android.googleServicesFile,
  },
})
