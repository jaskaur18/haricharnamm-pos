import { YStack, type YStackProps } from 'tamagui'

export function SurfaceCard(props: YStackProps) {
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      hoverStyle={{ borderColor: '$borderColorHover', bg: '$color3' }}
      rounded="$6"
      p="$4"
      style={{
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
      {...props}
    />
  )
}
