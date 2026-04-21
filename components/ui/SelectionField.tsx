import { Check, ChevronDown } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack, useMedia } from 'tamagui'
import { useEffect, useRef, useState } from 'react'
import { Platform, ActionSheetIOS } from 'react-native'
import { ResponsiveDialog } from './ResponsiveDialog'
import { FormField } from './FormField'

type SelectionOption = {
  label: string
  value: string | null
  description?: string
}

/**
 * SelectionField — Desktop: inline dropdown menu. Mobile: bottom sheet.
 * Designed for speed and muscle memory on desktop.
 */
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
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  // Close dropdown on outside click (desktop web only)
  useEffect(() => {
    if (!open || !desktop || Platform.OS !== 'web') return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, desktop])

  // Close on Escape (web only)
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const handlePress = () => {
    if (!desktop && Platform.OS === 'ios' && options.length <= 10) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map(o => o.label), 'Cancel'],
          cancelButtonIndex: options.length,
          title: label
        },
        index => {
          if (index < options.length) {
            onChange(options[index].value)
          }
        }
      )
      return
    }
    setOpen(!open)
  }

  const trigger = (
    <Button
      onPress={handlePress}
      bg={desktop ? '$color3' : '$bgElevated'}
      borderWidth={1}
      borderColor={desktop ? '$borderColor' : '$borderSubtle'}
      hoverStyle={{ bg: desktop ? '$color4' : '$bgMuted', borderColor: desktop ? '$borderColorHover' : '$borderStrong' }}
      pressStyle={{ bg: desktop ? '$color4' : '$bgMuted' }}
      justify="space-between"
      rounded="$5"
      px="$3"
      height={42}
    >
      <Paragraph color={selected ? (desktop ? '$color12' : '$textPrimary') : (desktop ? '$color10' : '$textMuted')} flex={1} numberOfLines={1} fontSize={12}>
        {selected?.label ?? placeholder}
      </Paragraph>
      <ChevronDown size={14} color={desktop ? '$color7' : '$textFaint'} />
    </Button>
  )

  // ── Desktop: inline floating dropdown ──
  if (desktop) {
    return (
      <FormField label={label} description={description}>
        <YStack style={{ position: 'relative' } as any} ref={containerRef as any}>
          {trigger}

          {open ? (
            <YStack
              bg={desktop ? '$color2' : '$bgSurface'}
              borderWidth={1}
              borderColor={desktop ? '$borderColor' : '$borderSubtle'}
              rounded="$4"
              style={{
                position: 'absolute' as any,
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 200,
                marginTop: 4,
                maxHeight: 280,
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              } as any}
            >
              <YStack py="$1">
                {options.map((option) => {
                  const active = option.value === value
                  return (
                    <Button
                      key={option.value ?? '__null__'}
                      onPress={() => { onChange(option.value); setOpen(false) }}
                      bg={active ? (desktop ? '$color4' : '$accentSoft') : 'transparent'}
                      borderWidth={0}
                      rounded="$0"
                      px="$3"
                      py="$2"
                      hoverStyle={{ bg: desktop ? '$color3' : '$bgElevated' }}
                      pressStyle={{ bg: desktop ? '$color4' : '$accentSoft' }}
                      justify="space-between"
                    >
                      <YStack flex={1} gap="$0.25">
                        <Paragraph color={active ? (desktop ? '$color12' : '$textPrimary') : (desktop ? '$color11' : '$textSecondary')} fontSize={12} fontWeight={active ? '700' : '500'} numberOfLines={1}>
                          {option.label}
                        </Paragraph>
                        {option.description ? (
                          <Paragraph color={desktop ? '$color7' : '$textFaint'} fontSize={10}>{option.description}</Paragraph>
                        ) : null}
                      </YStack>
                      {active ? <Check size={12} color={desktop ? '$accentBackground' : '$accent'} /> : null}
                    </Button>
                  )
                })}
              </YStack>
            </YStack>
          ) : null}
        </YStack>
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
        <YStack gap="$1" py="$1">
          {options.map((option) => {
            const active = option.value === value
            return (
              <Button
                key={option.value ?? '__null__'}
                onPress={() => { onChange(option.value); setOpen(false) }}
                bg={active ? '$accentSoft' : '$bgSurface'}
                borderWidth={0}
                rounded="$5"
                px="$3"
                py="$2.5"
                hoverStyle={{ bg: '$bgElevated' }}
                pressStyle={{ bg: '$accentSoft' }}
                justify="space-between"
              >
                <YStack flex={1} gap="$0.5">
                  <Paragraph color={active ? '$textPrimary' : '$textSecondary'} fontWeight={active ? '700' : '500'}>
                    {option.label}
                  </Paragraph>
                  {option.description ? (
                    <Paragraph color="$textFaint" fontSize="$2">{option.description}</Paragraph>
                  ) : null}
                </YStack>
                {active ? <Check size={16} color="$accent" /> : null}
              </Button>
            )
          })}
        </YStack>
      </ResponsiveDialog>
    </>
  )
}
