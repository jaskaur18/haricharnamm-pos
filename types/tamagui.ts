import type { ViewStyle } from 'react-native'

/**
 * Web-aware position values. React Native's FlexStyle only allows
 * 'absolute' | 'relative', but on web we also need 'fixed' | 'sticky'.
 * Use with Platform.OS === 'web' guards.
 */
export type WebPosition = ViewStyle['position'] | 'fixed' | 'sticky'

/**
 * Extends RN ViewStyle with web-only position values.
 * Use for `style` props when sticky/fixed positioning is needed on web.
 */
export type WebAwareViewStyle = Omit<ViewStyle, 'position'> & {
  position?: WebPosition
  /** Web-only: backdrop blur filter */
  backdropFilter?: string
  /** Web-only: webkit backdrop blur filter */
  WebkitBackdropFilter?: string
  /** Web-only: box shadow */
  boxShadow?: string
  /** Web-only: overflow-y */
  overflowY?: string
  /** Web-only: transition */
  transition?: string
  /** Web-only: box-sizing */
  boxSizing?: string
}

/**
 * Lucide icon component type — use instead of `any` for icon props.
 */
export type LucideIconComponent = React.ComponentType<{
  size?: number
  color?: string
  strokeWidth?: number
}>

/**
 * ScrollView contentContainerStyle type for cross-platform usage.
 */
export type ScrollContentStyle = {
  paddingHorizontal?: number
  paddingVertical?: number
  paddingTop?: number
  paddingBottom?: number
  paddingRight?: number
  paddingLeft?: number
  gap?: number
  flexGrow?: number
}
