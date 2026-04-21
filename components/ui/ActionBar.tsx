import { XStack } from 'tamagui'

export function ActionBar(props: React.ComponentProps<typeof XStack>) {
  return <XStack gap="$2" items="center" flexWrap="wrap" {...props} />
}
