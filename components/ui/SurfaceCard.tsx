import { YStack, type YStackProps } from 'tamagui'

export function SurfaceCard(props: YStackProps) {
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$6"
      p="$4"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)'
      }}
      {...props}
    />
  )
}
