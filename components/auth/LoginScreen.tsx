import { useState } from 'react'
import { Lock, User } from '@tamagui/lucide-icons-2'
import { useToastController } from '@tamagui/toast'
import { Button, Input, Paragraph, Spinner, XStack, YStack } from 'tamagui'
import { useAuthSession } from 'components/auth/AuthProvider'

export function LoginScreen() {
  const toast = useToastController()
  const { login, hasCredentialsConfigured } = useAuthSession()
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
    <YStack flex={1} bg="$background" items="center" justify="center" px="$4">
      <YStack
        width="100%"
        bg="$color2"
        borderWidth={1}
        borderColor="$borderColor"
        rounded="$8"
        p="$5"
        gap="$4"
        style={{ maxWidth: 420 } as any}
      >
        <YStack gap="$1.5">
          <Paragraph color="$color12" fontSize="$8" fontWeight="900" letterSpacing={-0.8}>
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
              <Input
                value={username}
                onChangeText={setUsername}
                placeholder="Enter login ID"
                autoCapitalize="none"
                autoCorrect={false}
                flex={1}
                bg="transparent"
                borderWidth={0}
                color="$color12"
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
              <Input
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
  )
}
