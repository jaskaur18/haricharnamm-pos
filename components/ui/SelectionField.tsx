import { Check, ChevronDown } from '@tamagui/lucide-icons-2'
import { Button, Paragraph, XStack, YStack, useMedia } from 'tamagui'
import { useEffect, useRef, useState } from 'react'
import { Platform, ActionSheetIOS } from 'react-native'
import { ResponsiveDialog } from './ResponsiveDialog'
import { FormField } from './FormField'

let createPortal: ((children: React.ReactNode, container: Element) => React.ReactPortal) | null = null
if (Platform.OS === 'web') {
  try { createPortal = require('react-dom').createPortal } catch {}
}

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
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  // Close dropdown on outside click (desktop web only)
  useEffect(() => {
    if (!open || !desktop || Platform.OS !== 'web') return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, desktop])

  useEffect(() => {
    if (!open || !desktop || Platform.OS !== 'web') return
    const updateRect = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      })
    }
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
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
      <Paragraph color={selected ? (desktop ? '$color12' : '$color12') : (desktop ? '$color10' : '$color10')} flex={1} numberOfLines={1} fontSize={12}>
        {selected?.label ?? placeholder}
      </Paragraph>
      <ChevronDown size={14} color={desktop ? '$color7' : '$color8'} />
    </Button>
  )

  // ── Desktop: inline floating dropdown ──
  if (desktop) {
    const dropdown = open ? (
      <YStack
        ref={menuRef as any}
        bg="$color2"
        borderWidth={1}
        borderColor="$borderColorHover"
        rounded="$4"
        style={{
          position: Platform.OS === 'web' ? 'fixed' as any : 'absolute' as any,
          top: menuRect?.top ?? 0,
          left: menuRect?.left ?? 0,
          width: menuRect?.width ?? undefined,
          zIndex: 2147483000,
          maxHeight: 320,
          overflowY: 'auto',
          boxShadow: '0 18px 50px rgba(0,0,0,0.72)',
        } as any}
      >
        <YStack py="$1">
          {options.map((option) => {
            const active = option.value === value
            return (
              <Button
                key={option.value ?? '__null__'}
                onPress={() => { onChange(option.value); setOpen(false) }}
                bg={active ? '$color4' : 'transparent'}
                borderWidth={0}
                rounded="$0"
                px="$3"
                py="$2"
                hoverStyle={{ bg: '$color3' }}
                pressStyle={{ bg: '$color4' }}
                justify="space-between"
              >
                <YStack flex={1} gap="$0.25">
                  <Paragraph color={active ? '$color12' : '$color11'} fontSize={12} fontWeight={active ? '700' : '500'} numberOfLines={1}>
                    {option.label}
                  </Paragraph>
                  {option.description ? (
                    <Paragraph color="$color7" fontSize={10}>{option.description}</Paragraph>
                  ) : null}
                </YStack>
                {active ? <Check size={12} color="$accentBackground" /> : null}
              </Button>
            )
          })}
        </YStack>
      </YStack>
    ) : null

    return (
      <FormField label={label} description={description}>
        <YStack style={{ position: 'relative' } as any} ref={containerRef as any}>
          {trigger}
          {Platform.OS === 'web' && createPortal && typeof document !== 'undefined'
            ? createPortal(dropdown, document.body)
            : dropdown}
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
                  <Paragraph color={active ? '$color12' : '$color11'} fontWeight={active ? '700' : '500'}>
                    {option.label}
                  </Paragraph>
                  {option.description ? (
                    <Paragraph color="$color8" fontSize="$2">{option.description}</Paragraph>
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
