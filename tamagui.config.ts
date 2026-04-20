import { defaultConfig } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'

// ── Saffron & Night — HARI CHARNAMM dark-only palette ──
const darkTheme = {
  ...defaultConfig.themes.dark,

  // Surface hierarchy (OLED-first)
  background: '#09090B',     // zinc-950 — page bg
  backgroundHover: '#18181B', // zinc-900
  backgroundPress: '#27272A', // zinc-800
  backgroundFocus: '#18181B',
  backgroundStrong: '#111113',
  backgroundTransparent: 'rgba(9,9,11,0)',

  // Stepped surface tokens
  color1: '#09090B',   // deepest — page background
  color2: '#111113',   // card surface (raised 1)
  color3: '#1A1A1E',   // nested surface / hover
  color4: '#252529',   // selected / active bg
  color5: '#3F3F46',   // subtle borders / dividers

  // Text hierarchy
  color6: '#52525B',   // disabled
  color7: '#71717A',   // placeholder
  color: '#FAFAFA',
  color8: '#E8A230',   // ★ saffron gold — primary accent
  color9: '#D4922A',   // saffron pressed
  color10: '#A1A1AA',  // secondary text
  color11: '#D4D4D8',  // body text
  color12: '#FAFAFA',  // headings / emphasis

  // Borders
  borderColor: '#27272A',
  borderColorHover: '#3F3F46',
  borderColorFocus: '#E8A230',
  borderColorPress: '#E8A230',

  // Misc
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowColorHover: 'rgba(0,0,0,0.6)',
  placeholderColor: '#71717A',
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
      color: '#09090B', // darkest text
      colorHover: '#09090B',
      colorPress: '#09090B',
      borderColor: '#E8A230',
      borderColorHover: '#D4922A',
      borderColorPress: '#B47B23',
    },
    light_accent: {
      ...darkTheme,
      background: '#E8A230', // color8 (saffron/gold)
      backgroundHover: '#D4922A', // color9
      backgroundPress: '#B47B23',
      color: '#09090B', // darkest text
      colorHover: '#09090B',
      colorPress: '#09090B',
      borderColor: '#E8A230',
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
