import { MD3LightTheme } from 'react-native-paper'

/**
 * HatoSync design system — "editorial de campo" (warm, organic, minimalist).
 * Single source of truth for colors. Mirrors the web's vuetify.js theme:
 * warm paper background, deep pine greens, clay/ochre accents.
 *
 * Reference colors via the theme (useTheme()) — never hardcode hex in screens.
 */
const palette = {
  primary: '#2E7D32', // brand green
  primaryDark: '#1B5E20',
  secondary: '#3F5847', // eucalyptus ink
  accent: '#C98A2D', // hay/ochre — highlights, chips, counters
  background: '#F5F3EB', // warm paper
  surface: '#FDFCF8', // warm white
  ink: '#222B23', // text on light surfaces
  error: '#B3402F', // terracotta
  success: '#3E8E48',
  info: '#38678C',
  border: 'rgba(46, 82, 51, 0.14)', // green-tinted hairline
  muted: '#6B7A6E',
}

export const theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#CDE7CE',
    onPrimaryContainer: palette.primaryDark,
    secondary: palette.secondary,
    onSecondary: '#FFFFFF',
    tertiary: palette.accent,
    onTertiary: '#FFFFFF',
    background: palette.background,
    onBackground: palette.ink,
    surface: palette.surface,
    onSurface: palette.ink,
    surfaceVariant: '#ECEAE0',
    onSurfaceVariant: palette.muted,
    outline: palette.border,
    outlineVariant: palette.border,
    error: palette.error,
    onError: '#FFFFFF',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: 'transparent',
      level1: palette.surface,
      level2: palette.surface,
      level3: palette.surface,
    },
  },
  // Custom tokens consumed across the app (not part of Paper's contract)
  hs: {
    palette,
    spacing: (n) => n * 4,
    radius: { sm: 8, md: 12, lg: 16, xl: 24 },
  },
}

export default theme
