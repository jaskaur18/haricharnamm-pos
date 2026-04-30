import { Check, ChevronDown } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack, useMedia, Popover, Adapt } from 'tamagui'
import { useState } from 'react'
import { Platform } from 'react-native'
import { ResponsiveDialog } from './ResponsiveDialog'
import { FormField } from './FormField'

type SelectionOption = {
  label: string
  value: string | null
  description?: string
}

export function SelectionField({
  label,
  value,
  placeholder,
  options,
  onChange,
  description,
}: {
  label: string
  value: string | null
  placeholder: string
  options: SelectionOption[]
  onChange: (value: string | null) => void
  description?: string
}) {
  const mediaQuery = useMedia()
  const desktop = !mediaQuery.maxMd
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  const trigger = (
    <Button
      bg="$color3"
      borderWidth={1}
      borderColor="$borderColor"
      hoverStyle={{ bg: '$color4', borderColor: '$borderColorHover' }}
      pressStyle={{ bg: '$color4' }}
      justify="space-between"
      rounded="$4"
      px="$3"
      height={42}
      onPress={() => !desktop && setOpen(true)}
    >
      <Paragraph color={selected ? '$color12' : '$color10'} flex={1} numberOfLines={1} fontSize={12} fontWeight={selected ? '600' : '400'}>
        {selected?.label ?? placeholder}
      </Paragraph>
      <ChevronDown size={14} color="$color7" />
    </Button>
  )

  // ── Desktop: Popover ──
  if (desktop) {
    return (
      <FormField label={label} description={description}>
        <Popover size="$5" allowFlip placement="bottom-start" open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            {trigger}
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColorHover"
            bg="$color2"
            p="$0"
            rounded="$4"
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
          >
            <Popover.ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <YStack py="$1" minW={200}>
                {options.map((option) => {
                  const active = option.value === value
                  return (
                    <Button
                      key={option.value ?? '__null__'}
                      onPress={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                      bg={active ? '$color4' : 'transparent'}
                      borderWidth={0}
                      rounded="$0"
                      px="$3"
                      py="$2.5"
                      hoverStyle={{ bg: '$color3' }}
                      pressStyle={{ bg: '$color4' }}
                      justify="space-between"
                    >
                      <YStack flex={1} gap="$0.5">
                        <Paragraph color={active ? '$color12' : '$color11'} fontSize={12} fontWeight={active ? '700' : '500'} numberOfLines={1}>
                          {option.label}
                        </Paragraph>
                        {option.description ? (
                          <Paragraph color="$color7" fontSize={10}>{option.description}</Paragraph>
                        ) : null}
                      </YStack>
                      {active ? <Check size={14} color="$accentBackground" /> : null}
                    </Button>
                  )
                })}
              </YStack>
            </Popover.ScrollView>
          </Popover.Content>
        </Popover>
      </FormField>
    )
  }

  // ── Mobile: bottom sheet dialog ──
  return (
    <>
      <FormField label={label} description={description}>
        {trigger}
      </FormField>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title={label}>
        <YStack gap="$1.5" py="$2">
          {options.map((option) => {
            const active = option.value === value
            return (
              <Button
                key={option.value ?? '__null__'}
                onPress={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                bg={active ? '$accentSoft' : '$color2'}
                borderWidth={1}
                borderColor={active ? '$accentBackground' : '$borderColor'}
                rounded="$5"
                px="$3"
                py="$3"
                hoverStyle={{ bg: '$color3' }}
                pressStyle={{ bg: '$color4' }}
                justify="space-between"
              >
                <YStack flex={1} gap="$0.5">
                  <Paragraph color={active ? '$color12' : '$color11'} fontWeight={active ? '700' : '500'} fontSize={15}>
                    {option.label}
                  </Paragraph>
                  {option.description ? (
                    <Paragraph color="$color7" fontSize={12}>{option.description}</Paragraph>
                  ) : null}
                </YStack>
                {active ? <Check size={16} color="$accentBackground" /> : null}
              </Button>
            )
          })}
        </YStack>
      </ResponsiveDialog>
    </>
  )
}
