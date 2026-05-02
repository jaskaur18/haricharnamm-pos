import { defaultConfig } from '@tamagui/config/v5'
import { animations } from '@tamagui/config/v5-css'
import { createTamagui } from 'tamagui'

// ─── Brand palette constants (single source of truth) ───────────────────────
const palette = {
  gold:       '#f3b54a',
  goldStrong: '#ffcd73',
  goldDim:    '#e4a63a',
  goldDeep:   '#cd8d25',

  bgDeep:     '#0f0d0b',
  bgBase:     '#141416',
  bgRaised:   '#202127',
  bgMuted:    '#2a2b31',
  bgHover:    '#25262d',

  textWhite:  '#ffffff',
  textLight:  '#e7e8ef',
  textMid:    '#c6c7cf',
  textDim:    '#9799a3',
  textPlaceholder: '#8f9098',

  borderWarm08: 'rgba(255, 241, 220, 0.08)',
  borderWarm16: 'rgba(255, 241, 220, 0.16)',
  borderWhite08: 'rgba(255, 255, 255, 0.08)',
  borderWhite14: 'rgba(255, 255, 255, 0.14)',

  success:     '#61d694',
  successSoft: 'rgba(97, 214, 148, 0.14)',
  warning:     '#f3d46d',
  warningSoft: 'rgba(243, 212, 109, 0.14)',
  danger:      '#ef8c82',
  dangerSoft:  'rgba(239, 140, 130, 0.14)',
  info:        '#7ab7ff',
  infoSoft:    'rgba(122, 183, 255, 0.14)',
  purple:      '#d3b5ff',
  purpleSoft:  'rgba(211, 181, 255, 0.14)',

  overlay:     'rgba(0,0,0,0.6)',
  overlayDark: 'rgba(0,0,0,0.85)',
  overlayNav:  'rgba(5,5,8,0.92)',
  overlayNavLight: 'rgba(5,5,8,0.76)',

  shadow:      'rgba(0,0,0,0.7)',
  shadowHover: 'rgba(0,0,0,0.85)',
  shadowSurface:  '0 12px 28px rgba(0,0,0,0.32)',
  shadowElevated: '0 18px 40px rgba(0,0,0,0.18)',
  shadowDropdown: '0 18px 50px rgba(0,0,0,0.72)',
} as const

// ─── Unified dark theme ─────────────────────────────────────────────────────
// Single theme used everywhere — no desktop vs mobile branching needed.
// Standard Tamagui semantic keys + custom brand tokens.
const darkTheme = {
  ...defaultConfig.themes.dark,

  // ── Standard Tamagui semantic keys (used by all built-in components) ──
  background:            palette.bgDeep,
  backgroundHover:       '#181614',
  backgroundPress:       '#201d19',
  backgroundFocus:       '#181614',
  backgroundStrong:      '#0d0b09',
  backgroundTransparent: 'rgba(0,0,0,0)',

  // ── CRITICAL: In our custom dark theme, the color scale is:
  //   color1  = darkest bg  (#0f0d0b)
  //   color12 = lightest fg (#ffffff)
  // Tamagui's default dark theme uses the OPPOSITE direction
  // (color1=white, color12=black) which is why component sub-themes
  // resolve to wrong colors. We must explicitly set all 12 steps. ──
  color:   palette.textWhite,
  color1:  palette.bgDeep,
  color2:  palette.bgBase,
  color3:  palette.bgRaised,
  color4:  'rgba(232, 162, 48, 0.14)',
  color5:  'rgba(255, 255, 255, 0.08)',
  color6:  '#5b5d66',
  color7:  '#a7a8b0',
  color8:  palette.gold,
  color9:  palette.goldDim,
  color10: '#b6b7c0',
  color11: palette.textLight,
  color12: palette.textWhite,

  borderColor:      palette.borderWhite08,
  borderColorHover:  palette.borderWhite14,
  borderColorFocus:  palette.gold,
  borderColorPress:  palette.gold,
  shadowColor:       palette.shadow,
  shadowColorHover:  palette.shadowHover,
  placeholderColor:  palette.textPlaceholder,

  // ── Semantic brand tokens (properly typed via module augmentation below) ──
  accent:        palette.gold,
  accentStrong:  palette.goldStrong,
  accentSoft:    'rgba(243, 181, 74, 0.18)',

  success:       palette.success,
  successSoft:   palette.successSoft,
  warning:       palette.warning,
  warningSoft:   palette.warningSoft,
  danger:        palette.danger,
  dangerSoft:    palette.dangerSoft,
  info:          palette.info,
  infoSoft:      palette.infoSoft,
  purple:        palette.purple,
  purpleSoft:    palette.purpleSoft,

  borderSubtle:  palette.borderWarm08,
  borderStrong:  palette.borderWarm16,
  focus:         palette.gold,

  overlay:       palette.overlay,
  overlayDark:   palette.overlayDark,
  overlayNav:    palette.overlayNav,
}

// ─── Accent sub-theme ───────────────────────────────────────────────────────
const accentTheme = {
  ...darkTheme,
  background:      palette.gold,
  backgroundHover: palette.goldDim,
  backgroundPress: palette.goldDeep,
  color:           '#000000',
  colorHover:      '#000000',
  colorPress:      '#000000',
  borderColor:     palette.gold,
  borderColorHover: palette.goldDim,
  borderColorPress: palette.goldDeep,
}

// ─── Component sub-themes ────────────────────────────────────────────────────
// Tamagui uses component-specific sub-themes (e.g. dark_Input, dark_Button)
// to resolve the `color` and `background` tokens used inside each component.
//
// PROBLEM: When you override `dark` with a custom color scale (color1=dark,
// color12=white), the inherited defaultConfig sub-themes still reference
// the DEFAULT dark scale (color1=white, color12=dark) — the OPPOSITE direction.
//
// This is why Input fields show black text on dark backgrounds on native:
// the `dark_Input` sub-theme resolves `color` → color12 of the DEFAULT dark
// scale → which is near-black (#111), rendered on top of our dark bgRaised.
//
// FIX: Override all component sub-themes with our correct dark token values.
// The key tokens for Input/TextArea on native are:
//   - color         → the typed text color
//   - placeholderColor → the placeholder text color
//   - background    → the field background (transparent in most cases since
//                     the parent XStack sets bg)
//   - borderColor   → field border
const inputSubTheme = {
  ...darkTheme,
  // Typed text: must be white/light
  color:            palette.textWhite,
  // Placeholder: visible mid-gray on dark bg
  placeholderColor: palette.textPlaceholder,
  // Background: transparent so parent bg shows through
  background:       palette.bgRaised,
  backgroundFocus:  palette.bgHover,
  borderColor:      palette.borderWhite08,
  borderColorFocus: palette.gold,
}

const buttonSubTheme = {
  ...darkTheme,
  color:            palette.textWhite,
  background:       palette.bgRaised,
  backgroundHover:  palette.bgHover,
  backgroundPress:  palette.bgMuted,
}

// ─── Config ─────────────────────────────────────────────────────────────────
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
    // Keep ALL default sub-themes first (for things we don't override)
    ...defaultConfig.themes,

    // ── Root themes ──
    dark: darkTheme,
    // Force dark as light too so theme switching has no effect
    light: darkTheme,

    // ── Accent ──
    dark_accent: accentTheme,
    light_accent: accentTheme,

    // ── Component sub-themes: fix inverted color scale on native ──
    // These are the sub-themes Tamagui applies automatically to Input,
    // TextArea, and Button components when the root theme is "dark" or "light".
    dark_Input:       inputSubTheme,
    light_Input:      inputSubTheme,
    dark_TextArea:    inputSubTheme,
    light_TextArea:   inputSubTheme,
    dark_Button:      buttonSubTheme,
    light_Button:     buttonSubTheme,

    // Accent button keeps its own colors
    dark_accent_Button: accentTheme,
    light_accent_Button: accentTheme,
  },
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
