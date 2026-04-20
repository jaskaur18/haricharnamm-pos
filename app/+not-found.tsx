import { Link, Stack } from 'expo-router'
import { Button, Paragraph, YStack } from 'tamagui'
import { SurfaceCard } from 'components/ui/SurfaceCard'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <YStack flex={1} items="center" justify="center" px="$5" bg="$background">
        <SurfaceCard
          gap="$4"
          items="center"
          style={{ width: '100%', maxWidth: 520 }}
        >
          <Paragraph fontSize="$10" fontWeight="900" color="$color12">
            Page not found
          </Paragraph>
          <Paragraph color="$color11" text="center">
            The route you requested does not exist in the HARI CHARNAMM POS app.
          </Paragraph>
          <Link href="/" asChild>
            <Button theme="accent">Return to dashboard</Button>
          </Link>
        </SurfaceCard>
      </YStack>
    </>
  )
}
