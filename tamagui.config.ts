import { defaultConfig } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'

// ── Saffron & Night — HARI CHARNAMM dark-only palette ──
const darkTheme = {
  ...defaultConfig.themes.dark,

  // Surface hierarchy (OLED-first)
  background: '#000000',     // Pitch Black — page bg
  backgroundHover: '#111113',
  backgroundPress: '#1A1A1E',
  backgroundFocus: '#111113',
  backgroundStrong: '#000000',
  backgroundTransparent: 'rgba(0,0,0,0)',

  // Stepped surface tokens
  color1: '#000000',   // absolute page background
  color2: 'rgba(25, 25, 28, 0.65)',   // glass card surface
  color3: 'rgba(38, 38, 43, 0.75)',   // input / hover surface
  color4: 'rgba(232, 162, 48, 0.12)', // subtle gold overlay for active items
  color5: 'rgba(255, 255, 255, 0.08)',// faint glass borders

  // Text hierarchy
  color6: '#52525B',   // disabled
  color7: '#8B8B93',   // placeholder / subtle text
  color: '#FFFFFF',
  color8: '#FFAF20',   // ★ vibrant glowing gold
  color9: '#E29712',   // saffron pressed
  color10: '#A1A1AA',  // secondary text
  color11: '#E4E4E7',  // body text (brighter)
  color12: '#FFFFFF',  // headings / emphasis

  // Borders (Faint Glass)
  borderColor: 'rgba(255, 255, 255, 0.06)',
  borderColorHover: 'rgba(255, 255, 255, 0.12)',
  borderColorFocus: '#FFAF20',
  borderColorPress: '#FFAF20',

  // Misc
  shadowColor: 'rgba(0,0,0,0.8)',
  shadowColorHover: 'rgba(0,0,0,0.9)',
  placeholderColor: '#8B8B93',
}

export const config = createTamagui({
  ...defaultConfig,
  media: {
    ...defaultConfig.media,
    maxXs: { maxWidth: 520 },
    maxSm: { maxWidth: 760 },
    maxMd: { maxWidth: 1024 },
    maxLg: { maxWidth: 1320 },
    touch: { pointer: 'coarse' },
  },
  themes: {
    ...defaultConfig.themes,
    dark: darkTheme,
    // Force dark as light too so theme switching has no effect
    light: darkTheme,
    dark_accent: {
      ...darkTheme,
      background: '#E8A230', // color8 (saffron/gold)
      backgroundHover: '#D4922A', // color9
      backgroundPress: '#B47B23',
      color: '#000000', // darkest text
      colorHover: '#000000',
      colorPress: '#000000',
      borderColor: '#FFAF20',
      borderColorHover: '#D4922A',
      borderColorPress: '#B47B23',
    },
    light_accent: {
      ...darkTheme,
      background: '#E8A230', // color8 (saffron/gold)
      backgroundHover: '#D4922A', // color9
      backgroundPress: '#B47B23',
      color: '#000000', // darkest text
      colorHover: '#000000',
      colorPress: '#000000',
      borderColor: '#FFAF20',
      borderColorHover: '#D4922A',
      borderColorPress: '#B47B23',
    },
  },
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
