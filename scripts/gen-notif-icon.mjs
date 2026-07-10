// Genera SOLO el ícono de notificación de Android: silueta blanca del hierro de
// HatoSync sobre fondo transparente. Android usa el canal alfa (los píxeles
// opacos se pintan blancos y se tiñen con el `color` del plugin), por eso NO
// lleva fondo ni color. Trazo más grueso y menos padding que el monochrome del
// adaptive icon para que se lea bien a 24dp en la barra de estado.
//
// Correr:  npm i --no-save @resvg/resvg-js && node scripts/gen-notif-icon.mjs
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'

// Misma geometría del hierro que scripts/generate-brand-assets.mjs (BrandMark).
const markPaths = (stroke = 56) => `
  <g fill="none" stroke="#FFFFFF" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 218 V 366" />
    <path d="M 326 218 V 366" />
    <path d="M 186 292 H 326" />
    <path d="M 186 218 C 186 174 178 158 156 150 C 140 144 128 142 120 122" />
    <path d="M 326 218 C 326 174 334 158 356 150 C 372 144 384 142 392 122" />
  </g>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 512 512">
  <g transform="translate(256 262) scale(0.72) translate(-256 -256)">${markPaths(56)}</g>
</svg>`

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng()
writeFileSync('assets/notification-icon.png', png)
console.log('ok assets/notification-icon.png 256')
