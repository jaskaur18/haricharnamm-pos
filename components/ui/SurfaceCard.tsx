import { YStack, type YStackProps } from 'tamagui'

export function SurfaceCard(props: YStackProps) {
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$5"
      p="$3.5"
      {...props}
    />
  )
}
