import { Platform } from 'react-native'

/**
 * Platform-safe haptic feedback wrappers.
 * On web and SSR these are no-ops.
 */

let Haptics: typeof import('expo-haptics') | null = null

if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics')
  } catch {
    // expo-haptics not available (web build, etc.)
  }
}

/** Light tap — selection changes, tab switches, dropdown picks */
export function hapticLight() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/** Medium tap — successful actions (sale completed, item added to cart) */
export function hapticMedium() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

/** Heavy tap — destructive/important actions (delete, return, clear cart) */
export function hapticHeavy() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
}

/** Success notification — checkout, save */
export function hapticSuccess() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

/** Warning notification — low stock, validation error */
export function hapticWarning() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
}

/** Error notification — failed action */
export function hapticError() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}

/** Selection tick — scrolling through picker options */
export function hapticSelection() {
  Haptics?.selectionAsync().catch(() => {})
}
