import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui'
import { ToastProvider, ToastViewport } from '@tamagui/toast'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CurrentToast } from './CurrentToast'
import { config } from '../tamagui.config'

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, 'config' | 'defaultTheme'>) {
  return (
    <SafeAreaProvider>
      <TamaguiProvider
        config={config}
        defaultTheme="dark"
        {...rest}
      >
        <ToastProvider
          swipeDirection="horizontal"
          duration={4500}
          native={[]}
        >
          {children}
          <CurrentToast />
          <ToastViewport top="$8" left={0} right={0} />
        </ToastProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
