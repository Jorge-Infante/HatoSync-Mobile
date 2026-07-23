import React, { useMemo } from 'react'
import Svg, { Polygon } from 'react-native-svg'

/**
 * Miniatura SVG de la silueta del potrero (anillo exterior del GeoJSON
 * normalizado al viewBox) — espejo de PaddockThumb.vue; no carga mapa por fila.
 */
export default function PaddockThumb({ geometry, color = '', width = 64, height = 44 }) {
  const stroke = color || '#2E7D32'

  const points = useMemo(() => {
    const ring = geometry && geometry.coordinates && geometry.coordinates[0]
    if (!ring || ring.length < 4) return ''
    const lons = ring.map((p) => p[0])
    const lats = ring.map((p) => p[1])
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const pad = 4
    const spanLon = maxLon - minLon || 1e-9
    const spanLat = maxLat - minLat || 1e-9
    // Escala uniforme centrada; la Y del SVG crece hacia abajo → latitud invertida.
    const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat)
    const offsetX = (width - spanLon * scale) / 2
    const offsetY = (height - spanLat * scale) / 2
    return ring
      .map((p) => `${(offsetX + (p[0] - minLon) * scale).toFixed(1)},${(offsetY + (maxLat - p[1]) * scale).toFixed(1)}`)
      .join(' ')
  }, [geometry, width, height])

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {points ? (
        <Polygon points={points} fill={`${stroke}33`} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      ) : null}
    </Svg>
  )
}
