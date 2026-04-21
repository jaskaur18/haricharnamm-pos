import { defaultConfig } from '@tamagui/config/v5'
import { createAnimations } from '@tamagui/animations-css'
import { createTamagui } from 'tamagui'

const animations = createAnimations({
  fast: 'ease-in 150ms',
  medium: 'ease-in 300ms',
  slow: 'ease-in 450ms',
  bouncy: 'ease-in 200ms',
  lazy: 'ease-in 600ms',
  quick: 'ease-in 100ms',
  tooltip: 'ease-in 150ms',
})

const darkTheme = {
  ...defaultConfig.themes.dark,

  background: '#111111',
  backgroundHover: '#181614',
  backgroundPress: '#201d19',
  backgroundFocus: '#181614',
  backgroundStrong: '#0d0b09',
  backgroundTransparent: 'rgba(0,0,0,0)',

  color1: '#0f0d0b',
  color2: '#141416',
  color3: '#202127',
  color4: 'rgba(232, 162, 48, 0.14)',
  color5: 'rgba(255, 255, 255, 0.08)',
  color6: '#5b5d66',
  color7: '#a7a8b0',
  color: '#FFFFFF',
  color8: '#f3b54a',
  color9: '#e09a26',
  color10: '#b6b7c0',
  color11: '#e7e8ef',
  color12: '#ffffff',

  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderColorHover: 'rgba(255, 255, 255, 0.14)',
  borderColorFocus: '#f3b54a',
  borderColorPress: '#f3b54a',
  shadowColor: 'rgba(0,0,0,0.7)',
  shadowColorHover: 'rgba(0,0,0,0.85)',
  placeholderColor: '#8f9098',

  bgApp: '#0f0d0b',
  bgSurface: '#141416',
  bgElevated: '#202127',
  bgMuted: '#2a2b31',
  bgSoft: 'rgba(243, 181, 74, 0.12)',
  bgCardHover: '#25262d',
  textPrimary: '#ffffff',
  textSecondary: '#ececf2',
  textMuted: '#c6c7cf',
  textFaint: '#9799a3',
  accent: '#f3b54a',
  accentStrong: '#ffcd73',
  accentSoft: 'rgba(243, 181, 74, 0.18)',
  success: '#61d694',
  successSoft: 'rgba(97, 214, 148, 0.14)',
  warning: '#f3d46d',
  warningSoft: 'rgba(243, 212, 109, 0.14)',
  danger: '#ef8c82',
  dangerSoft: 'rgba(239, 140, 130, 0.14)',
  info: '#7ab7ff',
  infoSoft: 'rgba(122, 183, 255, 0.14)',
  borderSubtle: 'rgba(255, 241, 220, 0.08)',
  borderStrong: 'rgba(255, 241, 220, 0.16)',
  focus: '#f3b54a',
}

export const config = createTamagui({
  ...defaultConfig,
  animations,
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
      background: '#f3b54a',
      backgroundHover: '#e4a63a',
      backgroundPress: '#cd8d25',
      color: '#000000', // darkest text
      colorHover: '#000000',
      colorPress: '#000000',
      borderColor: '#f3b54a',
      borderColorHover: '#e4a63a',
      borderColorPress: '#cd8d25',
    },
    light_accent: {
      ...darkTheme,
      background: '#f3b54a',
      backgroundHover: '#e4a63a',
      backgroundPress: '#cd8d25',
      color: '#000000', // darkest text
      colorHover: '#000000',
      colorPress: '#000000',
      borderColor: '#f3b54a',
      borderColorHover: '#e4a63a',
      borderColorPress: '#cd8d25',
    },
  },
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
