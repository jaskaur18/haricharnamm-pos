import { YStack, type YStackProps, useMedia } from 'tamagui'

export function SurfaceCard(props: YStackProps) {
  const media = useMedia()
  const desktop = !media.maxMd
  return (
    <YStack
      bg={desktop ? '$color2' : '$bgSurface'}
      borderWidth={1}
      borderColor={desktop ? '$borderColor' : '$borderSubtle'}
      hoverStyle={{ borderColor: desktop ? '$borderColorHover' : '$borderStrong', bg: desktop ? '$color3' : '$bgCardHover' }}
      rounded="$6"
      p="$4"
      style={{
        backdropFilter: desktop ? 'blur(18px)' : 'blur(28px)',
        WebkitBackdropFilter: desktop ? 'blur(18px)' : 'blur(28px)',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        boxShadow: desktop ? '0 12px 28px rgba(0,0,0,0.32)' : '0 18px 40px rgba(0,0,0,0.18)',
      }}
      {...props}
    />
  )
}
