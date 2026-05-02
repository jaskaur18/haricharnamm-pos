import { AppInput, AppTextArea } from 'components/ui/AppInput'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { Lock, User } from '@tamagui/lucide-icons-2'
import { useToastController } from '@tamagui/toast'
import { Button, Image,  Paragraph, Spinner, XStack, YStack } from 'tamagui'
import { useAuthSession } from 'components/auth/AuthProvider'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Logo from '../../assets/images/logo.png'

export function LoginScreen() {
  const toast = useToastController()
  const { login, hasCredentialsConfigured } = useAuthSession()
  const insets = useSafeAreaInsets()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin() {
    setIsSubmitting(true)
    try {
      const result = await login(username, password)
      if (!result.ok) {
        toast.show('Login failed', { message: result.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <YStack
        flex={1}
        bg="$background"
        items="center"
        justify="center"
        px="$4"
        pt={insets.top}
        pb={insets.bottom + 16}
      >
        {/* Brand logo block */}
        <YStack items="center" gap="$3" mb="$6">
          <Image
            src={Logo}
            width={88}
            height={88}
            objectFit="contain"
            borderRadius={20}
          />
          <YStack items="center" gap="$1">
            <Paragraph color="$color12" fontSize="$6" fontWeight="900" letterSpacing={1}>
              HARI CHARNAMM
            </Paragraph>
            <Paragraph color="$color7" fontSize="$2">
              Inventory + POS
            </Paragraph>
          </YStack>
        </YStack>

        <YStack
          width="100%"
          bg="$color2"
          borderWidth={1}
          borderColor="$borderColor"
          rounded="$8"
          p="$5"
          gap="$4"
          maxW={420}
        >
          <YStack gap="$1.5">
            <Paragraph color="$color12" fontSize="$7" fontWeight="900" letterSpacing={-0.8}>
              Sign In
            </Paragraph>
            <Paragraph color="$color10" fontSize="$3">
              Enter the store credentials to open the POS.
            </Paragraph>
          </YStack>

          {!hasCredentialsConfigured ? (
            <YStack bg="$color3" rounded="$5" p="$3" gap="$1.5">
              <Paragraph color="$color12" fontSize="$3" fontWeight="700">
                Auth Not Configured
              </Paragraph>
              <Paragraph color="$color10" fontSize="$2">
                Add `EXPO_PUBLIC_BASIC_AUTH_USERNAME` and `EXPO_PUBLIC_BASIC_AUTH_PASSWORD` in `.env.local`, then rebuild or restart Expo.
              </Paragraph>
            </YStack>
          ) : null}

          <YStack gap="$3">
            <YStack gap="$1.5">
              <Paragraph color="$color11" fontSize="$2" fontWeight="700">
                Login ID
              </Paragraph>
              <XStack
                items="center"
                gap="$2"
                bg="$color3"
                borderWidth={1}
                borderColor="$borderColor"
                rounded="$5"
                px="$3"
              >
                <User size={16} color="$color8" />
                <AppInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter login ID"
                  autoCapitalize="none"
                  autoCorrect={false}
                  flex={1}
                  bg="transparent"
                  borderWidth={0}
                  color="$color12"
                  returnKeyType="next"
                />
              </XStack>
            </YStack>

            <YStack gap="$1.5">
              <Paragraph color="$color11" fontSize="$2" fontWeight="700">
                Password
              </Paragraph>
              <XStack
                items="center"
                gap="$2"
                bg="$color3"
                borderWidth={1}
                borderColor="$borderColor"
                rounded="$5"
                px="$3"
              >
                <Lock size={16} color="$color8" />
                <AppInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  flex={1}
                  bg="transparent"
                  borderWidth={0}
                  color="$color12"
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
              </XStack>
            </YStack>
          </YStack>

          <Button
            theme="accent"
            size="$4"
            disabled={isSubmitting || !hasCredentialsConfigured}
            onPress={handleLogin}
          >
            {isSubmitting ? (
              <XStack items="center" gap="$2">
                <Spinner size="small" color="$color1" />
                <Paragraph color="$color1" fontWeight="800">Signing in…</Paragraph>
              </XStack>
            ) : (
              'Sign In'
            )}
          </Button>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  )
}
