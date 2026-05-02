/**
 * AppInput / AppTextArea
 *
 * Thin wrappers around Tamagui's Input and TextArea that guarantee correct
 * colors on React Native regardless of how component sub-themes are resolved.
 *
 * WHY THIS EXISTS:
 * Tamagui resolves `color` and `placeholderTextColor` for native TextInput
 * through the `dark_Input` component sub-theme. In Tamagui v2 RC the sub-theme
 * inherits from defaultConfig which may not match our custom palette. When
 * the `color` prop is omitted, the native TextInput can get wrong text color.
 *
 * The fix: always pass explicit `color` and `placeholderTextColor` so there
 * is zero dependency on sub-theme resolution.
 */
import { Input, TextArea, type InputProps, type TextAreaProps } from 'tamagui'

// Our brand palette — hard-coded for guaranteed correctness on native
const TEXT_COLOR = '#ffffff' as const  // palette.textWhite
const PLACEHOLDER = '$placeholderColor' as const  // resolved from our theme

/**
 * AppInput — drop-in replacement for Tamagui Input with guaranteed dark-mode colors.
 * Explicitly sets `color` and `placeholderTextColor` to prevent the native
 * TextInput from falling back to system defaults (black text on dark backgrounds).
 */
export function AppInput({ color, placeholderTextColor, ...props }: InputProps) {
  return (
    <Input
      color={color ?? TEXT_COLOR}
      placeholderTextColor={placeholderTextColor ?? PLACEHOLDER}
      {...props}
    />
  )
}

/**
 * AppTextArea — drop-in replacement for Tamagui TextArea with guaranteed dark-mode colors.
 */
export function AppTextArea({ color, placeholderTextColor, ...props }: TextAreaProps) {
  return (
    <TextArea
      color={color ?? TEXT_COLOR}
      placeholderTextColor={placeholderTextColor ?? PLACEHOLDER}
      {...props}
    />
  )
}
