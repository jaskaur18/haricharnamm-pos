import { Pressable } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import {
  BarChart3,
  Boxes,
  Cog,
  LayoutDashboard,
  ReceiptText,
  ShoppingCart,
} from '@tamagui/lucide-icons-2'
import { Button, Paragraph, ScrollView, XStack, YStack, useMedia } from 'tamagui'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/sales', label: 'Sales', icon: ReceiptText },
  { href: '/settings', label: 'Settings', icon: Cog },
] as const

const desktopNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/sales', label: 'Sales', icon: ReceiptText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Cog },
] as const

function isItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const media = useMedia()
  const desktop = !media.maxMd
  const [scrolled, setScrolled] = useState(false)

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <YStack flex={1} bg="$background" theme="dark" style={{ minHeight: '100vh' } as any}>
      {/* ── Desktop Top Nav ── */}
      {desktop ? (
        <XStack
          style={{
            position: 'sticky' as any,
            top: 0,
            zIndex: 100,
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
            boxShadow: scrolled
              ? '0 1px 40px rgba(0,0,0,0.6)'
              : 'none',
          } as any}
          bg={scrolled ? 'rgba(5, 5, 8, 0.82)' : 'rgba(5, 5, 8, 0.4)'}
          borderBottomWidth={1}
          borderColor={scrolled ? '$borderColor' : 'transparent'}
          px="$6"
          height={56}
          items="center"
          justify="space-between"
        >
          {/* Brand */}
          <XStack items="center" gap="$2.5" pressStyle={{ opacity: 0.8 }} onPress={() => router.replace('/' as any)} cursor="pointer">
            <YStack
              bg="$accentBackground"
              rounded="$3"
              items="center"
              justify="center"
              style={{ width: 32, height: 32 }}
            >
              <Paragraph color="$accentColor" fontSize={12} fontWeight="900" letterSpacing={-0.5}>HC</Paragraph>
            </YStack>
            <YStack>
              <Paragraph color="$color12" fontSize="$3" fontWeight="800" letterSpacing={0.8}>
                HARI CHARNAMM
              </Paragraph>
            </YStack>
          </XStack>

          {/* Navigation */}
          <XStack
            bg="$color2"
            rounded="$10"
            p="$0.5"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$0.5"
          >
            {desktopNavItems.map((item) => {
              const active = isItemActive(pathname, item.href)
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  onPress={() => router.replace(item.href as any)}
                  px="$2.5"
                  height={32}
                  bg={active ? '$color4' : 'transparent'}
                  borderWidth={0}
                  rounded="$10"
                  hoverStyle={{
                    bg: active ? '$color5' : '$color3',
                  }}
                  pressStyle={{ scale: 0.97 }}
                  style={{ transition: 'all 0.15s ease' } as any}
                >
                  <XStack items="center" gap="$1.5">
                    <Icon color={active ? '$accentBackground' : '$color8'} size={14} />
                    <Paragraph
                      color={active ? '$color12' : '$color9'}
                      fontSize={12}
                      fontWeight={active ? '700' : '500'}
                    >
                      {item.label}
                    </Paragraph>
                  </XStack>
                </Button>
              )
            })}
          </XStack>

          {/* Right side */}
          <XStack items="center" gap="$3">
            <Paragraph color="$color8" fontSize={12} fontWeight="500">{todayLabel}</Paragraph>
            <Button
              theme="accent"
              size="$3"
              fontWeight="800"
              rounded="$10"
              onPress={() => router.replace('/pos' as any)}
              hoverStyle={{ scale: 1.03 }}
              pressStyle={{ scale: 0.97 }}
              icon={<ShoppingCart size={14} />}
            >
              New Sale
            </Button>
          </XStack>
        </XStack>
      ) : null}

      {/* ── Content area with proper padding ── */}
      <YStack flex={1}>
        <YStack
          flex={1}
          gap="$5"
          px={desktop ? '$7' : '$4'}
          pt={desktop ? '$5' : '$4'}
          pb={desktop ? '$8' : 110}
        >
          {children}
        </YStack>
      </YStack>

      {/* ── Mobile Bottom Tab Bar ── */}
      {!desktop ? (
        <XStack
          bg="rgba(10, 10, 14, 0.92)"
          borderTopWidth={1}
          borderColor="$borderColor"
          px="$2"
          pt="$1.5"
          pb="$4"
          justify="space-around"
          style={{
            position: 'fixed' as any,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            zIndex: 100,
          } as any}
        >
          {navItems.map((item) => {
            const active = isItemActive(pathname, item.href)
            const Icon = item.icon

            return (
              <Pressable key={item.href} onPress={() => router.replace(item.href as any)}>
                <YStack items="center" justify="center" gap="$0.5" py="$1" style={{ minWidth: 56 }}>
                  <YStack
                    items="center"
                    justify="center"
                    bg={active ? '$accentBackground' : 'transparent'}
                    style={{ width: 44, height: 28, borderRadius: 14 }}
                  >
                    <Icon color={active ? '$accentColor' : '$color8'} size={18} />
                  </YStack>
                  <Paragraph
                    color={active ? '$accentBackground' : '$color8'}
                    fontSize={10}
                    fontWeight={active ? '700' : '500'}
                  >
                    {item.label}
                  </Paragraph>
                </YStack>
              </Pressable>
            )
          })}
        </XStack>
      ) : null}
    </YStack>
  )
}
