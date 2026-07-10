import React from 'react'
import Svg, { Path, Circle, G } from 'react-native-svg'

/**
 * El hierro de HatoSync — "H con cuernos" trazada como varilla de hierro
 * doblada (un solo grosor, puntas redondas), el lenguaje de los hierros de
 * marcar ganado. Misma geometría que los assets nativos (icono/splash),
 * generados desde este mismo path.
 *
 * `ring` lo encierra en el anillo de sello (la estampa de la finca).
 */
export default function BrandMark({ size = 48, color = '#2E7D32', ring = false, strokeWidth }) {
  const mark = (
    <G
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth || (ring ? 46 : 40)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M 186 218 V 366" />
      <Path d="M 326 218 V 366" />
      <Path d="M 186 292 H 326" />
      <Path d="M 186 218 C 186 174 178 158 156 150 C 140 144 128 142 120 122" />
      <Path d="M 326 218 C 326 174 334 158 356 150 C 372 144 384 142 392 122" />
    </G>
  )

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      {ring ? (
        <>
          <Circle cx="256" cy="256" r="220" fill="none" stroke={color} strokeWidth="18" />
          <G transform="translate(256 262) scale(0.72) translate(-256 -256)">{mark}</G>
        </>
      ) : (
        mark
      )}
    </Svg>
  )
}
