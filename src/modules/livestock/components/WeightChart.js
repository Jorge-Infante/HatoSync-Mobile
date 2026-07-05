import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { LineChart } from 'react-native-gifted-charts'

/**
 * Curva de peso del animal (control de peso). Espejo visual del WeightChart.vue
 * del web: una sola serie en el verde de marca, línea 2px con puntos, área
 * degradada sutil y reglas punteadas recesivas. ApexCharts no corre en RN
 * (necesita DOM), por eso aquí se usa react-native-gifted-charts (SVG puro,
 * funciona offline).
 */
export default function WeightChart({ records = [] }) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)

  const asc = [...records].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
  const labelEvery = Math.max(1, Math.ceil(asc.length / 5)) // etiquetas selectivas, no en cada punto
  const data = asc.map((r, i) => ({
    value: Number(r.weight_kg),
    label:
      i % labelEvery === 0 || i === asc.length - 1
        ? new Date(`${r.date}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
        : '',
    dataPointText: '',
  }))

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(5, Math.round((max - min) * 0.2))
  const yOffset = Math.max(0, Math.floor(min - pad))

  const chartWidth = Math.max(0, width - 46) // descuenta el eje Y
  const spacing = data.length > 1 ? Math.max(40, Math.floor(chartWidth / (data.length - 1)) - 6) : chartWidth

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <LineChart
          data={data}
          width={chartWidth}
          height={180}
          curved
          thickness={2}
          color={theme.colors.primary}
          dataPointsColor={theme.colors.primary}
          dataPointsRadius={4}
          areaChart
          startFillColor={theme.colors.primary}
          endFillColor={theme.colors.primary}
          startOpacity={0.18}
          endOpacity={0.02}
          initialSpacing={10}
          endSpacing={10}
          spacing={spacing}
          yAxisOffset={yOffset}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={0}
          rulesType="dashed"
          rulesColor="rgba(46, 82, 51, 0.15)"
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          yAxisLabelSuffix=" kg"
          yAxisLabelWidth={52}
          pointerConfig={{
            pointerColor: theme.colors.primary,
            radius: 5,
            pointerStripColor: 'rgba(46, 82, 51, 0.25)',
            pointerStripWidth: 1,
            activatePointersOnLongPress: false,
            pointerLabelWidth: 90,
            pointerLabelComponent: (items) => (
              <View style={[styles.tooltip, { backgroundColor: theme.colors.secondary }]}>
                <Text variant="labelSmall" style={styles.tooltipText}>
                  {items[0].value} kg
                </Text>
              </View>
            ),
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  axisText: { color: 'rgba(34, 43, 35, 0.6)', fontSize: 10 },
  tooltip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  tooltipText: { color: '#fff', fontWeight: '600' },
})
