import { Toast, useToastState } from '@tamagui/toast'
import { YStack, isWeb } from 'tamagui'

export function CurrentToast() {
  const currentToast = useToastState()

  if (!currentToast || currentToast.isHandledNatively) return null

  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      viewportName={currentToast.viewportName}
      enterStyle={{ opacity: 0, scale: 0.95, y: -10 }}
      exitStyle={{ opacity: 0, scale: 0.95, y: -10 }}
      y={isWeb ? '$12' : 0}
      bg="$color3"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$4"
    >
      <YStack items="center" p="$2" gap="$1">
        <Toast.Title fontWeight="700" color="$color12" fontSize="$3">
          {currentToast.title}
        </Toast.Title>
        {!!currentToast.message && (
          <Toast.Description color="$color10" fontSize="$2">
            {currentToast.message}
          </Toast.Description>
        )}
      </YStack>
    </Toast>
  )
}
