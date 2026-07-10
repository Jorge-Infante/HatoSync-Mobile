// Genera los assets finales de HatoSync (icono, adaptive, splash, favicon).
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'

const GREEN = '#2E7D32'
const GREEN_EDGE = '#256C2A'
const GREEN_LIGHT = '#33883A'
const PAPER = '#F5F3EB'

const markPaths = (stroke = 38) => `
  <g fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 218 V 366" />
    <path d="M 326 218 V 366" />
    <path d="M 186 292 H 326" />
    <path d="M 186 218 C 186 174 178 158 156 150 C 140 144 128 142 120 122" />
    <path d="M 326 218 C 326 174 334 158 356 150 C 372 144 384 142 392 122" />
  </g>`

// Sello (anillo + hierro reducido, como estampa)
const stampGroup = (color) => `
  <g stroke="${color}">
    <circle cx="256" cy="256" r="220" fill="none" stroke-width="18"/>
    <g transform="translate(256 262) scale(0.72) translate(-256 -256)">
      ${markPaths(46)}
    </g>
  </g>`

const radial = `
  <defs>
    <radialGradient id="field" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${GREEN_LIGHT}"/>
      <stop offset="62%" stop-color="${GREEN}"/>
      <stop offset="100%" stop-color="${GREEN_EDGE}"/>
    </radialGradient>
  </defs>`

const svgDoc = (inner, size = 512) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${inner}</svg>`

function render(name, svg, px) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: px } }).render().asPng()
  writeFileSync(name, png)
  console.log('ok', name, px)
}

// 1) Icono principal (iOS + genérico): campo verde con vignette + hierro papel al 80%
render(
  'icon.png',
  svgDoc(`${radial}
    <rect width="512" height="512" fill="url(#field)"/>
    <g transform="translate(256 260) scale(0.8) translate(-256 -256)" stroke="${PAPER}">${markPaths(40)}</g>`),
  1024
)

// 2) Android adaptive: foreground = hierro papel (zona segura ~52%), fondo aparte
render(
  'android-icon-foreground.png',
  svgDoc(`<g transform="translate(256 258) scale(0.56) translate(-256 -256)" stroke="${PAPER}">${markPaths(42)}</g>`),
  1024
)
render('android-icon-background.png', svgDoc(`${radial}<rect width="512" height="512" fill="url(#field)"/>`), 1024)
render(
  'android-icon-monochrome.png',
  svgDoc(`<g transform="translate(256 258) scale(0.56) translate(-256 -256)" stroke="#FFFFFF">${markPaths(42)}</g>`),
  1024
)

// 3) Splash nativo: el sello en verde (va sobre fondo papel definido en app.json)
render('splash-icon.png', svgDoc(stampGroup(GREEN)), 512)

// 4) Favicon (web)
render(
  'favicon.png',
  svgDoc(`${radial}
    <rect width="512" height="512" rx="96" fill="url(#field)"/>
    <g transform="translate(256 260) scale(0.8) translate(-256 -256)" stroke="${PAPER}">${markPaths(44)}</g>`),
  48
)

// hoja de revisión final
const review = `<svg xmlns="http://www.w3.org/2000/svg" width="1560" height="540" viewBox="0 0 1560 540">
  <rect width="1560" height="540" fill="#999"/>
  <g transform="translate(14,14)">${svgDoc(`${radial}<rect width="512" height="512" rx="110" fill="url(#field)"/><g transform="translate(256 260) scale(0.8) translate(-256 -256)" stroke="${PAPER}">${markPaths(40)}</g>`)}</g>
  <g transform="translate(540,14)"><rect width="512" height="512" rx="24" fill="${PAPER}"/>${stampGroup(GREEN).replace('<g stroke', `<g transform="translate(540,14)" stroke`).replace(`transform="translate(540,14)" `, '')}</g>
  <g transform="translate(1066,14) scale(0.25)"><rect width="512" height="512" rx="110" fill="url(#field)"/><g transform="translate(256 260) scale(0.8) translate(-256 -256)" stroke="${PAPER}">${markPaths(40)}</g></g>
  <g transform="translate(1066,160) scale(0.125)"><rect width="512" height="512" rx="110" fill="url(#field)"/><g transform="translate(256 260) scale(0.8) translate(-256 -256)" stroke="${PAPER}">${markPaths(40)}</g></g>
  ${radial}
</svg>`
render('review.png', review, 1560)
