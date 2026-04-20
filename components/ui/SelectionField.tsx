import { Check, ChevronDown } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack } from 'tamagui'
import { useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <>
      <FormField label={label} description={description}>
        <Button
          onPress={() => setOpen(true)}
          bg="$color3"
          borderWidth={0}
          hoverStyle={{ bg: '$color4' }}
          pressStyle={{ bg: '$color4' }}
          justify="space-between"
          px="$4"
        >
          <Paragraph color={selected ? '$color12' : '$color7'} flex={1} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Paragraph>
          <ChevronDown size={14} color="$color7" />
        </Button>
      </FormField>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
      >
        <YStack gap="$1.5" py="$1">
          {options.map((option) => {
            const active = option.value === value

            return (
              <Button
                key={option.value ?? '__null__'}
                onPress={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <XStack
                  items="center"
                  justify="space-between"
                  gap="$3"
                  px="$3"
                  py="$2.5"
                  rounded="$4"
                  bg={active ? '$color4' : 'transparent'}
                  hoverStyle={{ bg: '$color3' }}
                  pressStyle={{ bg: '$color4' }}
                >
                  <YStack flex={1} gap="$0.5">
                    <Paragraph color={active ? '$color12' : '$color11'} fontWeight={active ? '700' : '500'}>
                      {option.label}
                    </Paragraph>
                    {option.description ? (
                      <Paragraph color="$color7" fontSize="$2">
                        {option.description}
                      </Paragraph>
                    ) : null}
                  </YStack>
                  {active ? <Check size={16} color="$color8" /> : null}
                </XStack>
              </Button>
            )
          })}
        </YStack>
      </ResponsiveDialog>
    </>
  )
}
