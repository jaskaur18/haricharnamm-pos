import { GetProps, YStack, useMedia } from 'tamagui'
import type { WebAwareViewStyle } from 'types/tamagui'

export type SurfaceCardProps = GetProps<typeof YStack>

export function SurfaceCard(props: SurfaceCardProps) {
  const media = useMedia()
  const desktop = !media.maxMd
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
      hoverStyle={{ borderColor: '$borderColorHover', bg: '$color3' }}
      rounded="$6"
      p="$4"
      style={{
        boxSizing: 'border-box',
        backdropFilter: desktop ? 'blur(18px)' : 'blur(28px)',
        WebkitBackdropFilter: desktop ? 'blur(18px)' : 'blur(28px)',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        overflow: 'visible',
      } as WebAwareViewStyle}
      {...props}
    />
  )
}
