import '../tamagui.generated.css'

import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { ConvexProvider } from 'convex/react'
import { DarkTheme, ThemeProvider } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { Provider } from 'components/Provider'
import { convex } from 'lib/convex'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(app)',
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  useEffect(() => {
    if (interLoaded || interError) {
      SplashScreen.hideAsync()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    return null
  }

  return (
    <Providers>
      <RootLayoutNav />
    </Providers>
  )
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaProvider>
      <Provider>
        <ConvexProvider client={convex}>{children}</ConvexProvider>
      </Provider>
    </SafeAreaProvider>
  )
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen
          name="(app)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  )
}
