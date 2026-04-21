import { useEffect, useState } from 'react'
import { Platform, Pressable } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  BarChart3,
  Boxes,
  Cog,
  LayoutDashboard,
  PackagePlus,
  Plus,
  ReceiptText,
  ShoppingCart,
} from '@tamagui/lucide-icons-2'
import { Button, Paragraph, ScrollView, XStack, YStack, useMedia } from 'tamagui'
import { hapticLight } from 'lib/haptics'
import { useAuthSession } from 'components/auth/AuthProvider'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import type { WebAwareViewStyle } from 'types/tamagui'

const mobileNavItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
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

const screenMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Today’s movement' },
  '/inventory': { title: 'Catalog and stock', subtitle: 'Inventory + POS' },
  '/pos': { title: 'Fast checkout', subtitle: 'Inventory + POS' },
  '/sales': { title: 'Receipts and returns', subtitle: 'Inventory + POS' },
  '/reports': { title: 'Business analytics', subtitle: 'Inventory + POS' },
  '/settings': { title: 'Store structure', subtitle: 'Inventory + POS' },
}

function isItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function resolveMeta(pathname: string) {
  const key = Object.keys(screenMeta).find((item) => item !== '/' && pathname.startsWith(item))
  return screenMeta[key ?? pathname] ?? screenMeta['/']
}

function BrandMark() {
  return (
    <XStack items="center" gap="$2.5">
      <YStack
        width={38}
        height={38}
        rounded="$6"
        items="center"
        justify="center"
        bg="$color10"
      >
        <Paragraph color="$accentColor" fontSize={13} fontWeight="900" letterSpacing={0.6}>HC</Paragraph>
      </YStack>
      <YStack gap={2}>
        <Paragraph color="$color12" fontSize="$3" fontWeight="900" letterSpacing={0.8}>
          HARI CHARNAMM
        </Paragraph>
        <Paragraph color="$color7" fontSize="$1">Inventory + POS</Paragraph>
      </YStack>
    </XStack>
  )
}

function DesktopAppShell({
  pathname,
  children,
  onNav,
  scrolled,
  onLogout,
}: {
  pathname: string
  children: React.ReactNode
  onNav: (href: string) => void
  scrolled: boolean
  onLogout: () => void
}) {
  const meta = resolveMeta(pathname)

  return (
    <YStack flex={1} bg="$background" theme="dark" minH={Platform.OS === 'web' ? '100vh' : undefined}>
      <XStack
        px="$6"
        py="$3"
        justify="space-between"
        items="center"
        borderBottomWidth={1}
        borderColor={scrolled ? '$borderColorHover' : '$borderColor'}
        bg={scrolled ? '$overlayNav' : '$background'}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 80,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        } as WebAwareViewStyle}
      >
        <Pressable onPress={() => onNav('/')}>
          <BrandMark />
        </Pressable>

        <XStack bg="$color2" rounded="$12" p="$0.5" borderWidth={1} borderColor="$borderColor" gap="$0.5">
          {desktopNavItems.map((item) => {
            const active = isItemActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Button
                key={item.href}
                onPress={() => onNav(item.href)}
                bg={active ? '$color4' : 'transparent'}
                px="$3"
                rounded="$10"
                borderWidth={0}
                hoverStyle={{ bg: active ? '$color4' : '$color3' }}
              >
                <XStack gap="$1.5" items="center">
                  <Icon size={14} color={active ? '$accentBackground' : '$color7'} />
                  <Paragraph color={active ? '$color12' : '$color10'} fontSize="$2" fontWeight={active ? '700' : '600'}>
                    {item.label}
                  </Paragraph>
                </XStack>
              </Button>
            )
          })}
        </XStack>

        <XStack gap="$2.5" items="center">
          <YStack gap={2} items="flex-end">
            <Paragraph color="$color7" fontSize="$2">{meta.title}</Paragraph>
          </YStack>
          <Button
            size="$3"
            bg="$color3"
            borderWidth={1}
            borderColor="$borderColor"
            onPress={onLogout}
          >
            Sign Out
          </Button>
          <Button theme="accent" rounded="$10" icon={<ShoppingCart size={14} />} onPress={() => onNav('/pos')}>
            New Sale
          </Button>
        </XStack>
      </XStack>

      <YStack
        flex={1}
        px="$7"
        pt="$5"
        pb="$8"
        style={{ maxWidth: 1480, width: '100%', marginLeft: 'auto', marginRight: 'auto', flexBasis: 0 } as WebAwareViewStyle}
      >
        {pathname === '/pos' ? (
          children
        ) : (
          <ScrollView flex={1} showsVerticalScrollIndicator={false} contentContainerStyle={{ pb: 60 }}>
            {children}
          </ScrollView>
        )}
      </YStack>
    </YStack>
  )
}

function MobileAppShell({
  pathname,
  children,
  onNav,
  onLogout,
}: {
  pathname: string
  children: React.ReactNode
  onNav: (href: string) => void
  onLogout: () => void
}) {
  const insets = useSafeAreaInsets()
  const meta = resolveMeta(pathname)
  const isWeb = Platform.OS === 'web'
  const [newMenuOpen, setNewMenuOpen] = useState(false)

  function handleNewAction(target: 'sale' | 'product' | 'category') {
    setNewMenuOpen(false)
    const stamp = Date.now()
    if (target === 'sale') {
      onNav(`/pos?newSaleAt=${stamp}`)
      return
    }
    if (target === 'product') {
      onNav(`/inventory?create=product&openAt=${stamp}`)
      return
    }
    onNav(`/settings?create=category&openAt=${stamp}`)
  }

  const mobileUsesShellScroll = pathname !== '/pos'

  return (
    <YStack flex={1} bg="$background" theme="dark" minH={isWeb ? '100vh' : undefined}>
      <YStack
        pt={insets.top + 8}
        px="$4"
        pb="$3"
        gap="$3"
        bg="$background"
        borderBottomWidth={1}
        borderColor="$borderColor"
      >
        <XStack justify="space-between" items="center">
          <YStack gap="$0.5">
            <Paragraph color="$color12" fontSize="$7" fontWeight="900" letterSpacing={-0.8}>
              {meta.title}
            </Paragraph>
            <Paragraph color="$color10" fontSize="$2">
              {meta.subtitle}
            </Paragraph>
          </YStack>
          <Button
            onPress={() => setNewMenuOpen(true)}
            theme="accent"
            size="$3"
            rounded="$6"
            icon={<Plus size={14} />}
          >
            New
          </Button>
        </XStack>
        <Button
          size="$2.5"
          bg="$color3"
          borderWidth={1}
          borderColor="$borderColor"
          onPress={onLogout}
          style={{ alignSelf: 'flex-start' }}
        >
          Sign Out
        </Button>
      </YStack>

      <YStack flex={1}>
        {mobileUsesShellScroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              px: 12,
              pt: 12,
              pb: insets.bottom + 86,
            }}
            showsVerticalScrollIndicator={false}
          >
            <YStack gap="$4">{children}</YStack>
          </ScrollView>
        ) : (
          <YStack flex={1}>{children}</YStack>
        )}
      </YStack>

      <XStack
        bg="$color1"
        borderWidth={1}
        borderColor="$borderStrong"
        rounded="$10"
        px="$2.5"
        py="$2"
        justify="space-between"
        style={isWeb
          ? {
            position: 'fixed',
            left: 20,
            right: 20,
            bottom: Math.max(insets.bottom, 20),
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.6,
            shadowRadius: 24,
          } as WebAwareViewStyle
          : {
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: Math.max(insets.bottom, 20),
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.6,
            shadowRadius: 24,
          } as any}
      >
        {mobileNavItems.map((item) => {
          const active = isItemActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Pressable key={item.href} onPress={() => onNav(item.href)}>
              <YStack items="center" justify="center" gap="$1" py="$1" px="$1.5">
                <YStack
                  items="center"
                  justify="center"
                  bg={active ? '$color4' : 'transparent'}
                  borderWidth={active ? 1 : 0}
                  borderColor={active ? '$color6' : 'transparent'}
                  style={{ width: 48, height: 34, borderRadius: 17 }}
                >
                  <Icon color={active ? '$color12' : '$color8'} size={20} />
                </YStack>
              </YStack>
            </Pressable>
          )
        })}
      </XStack>

      <ResponsiveDialog open={newMenuOpen} onOpenChange={setNewMenuOpen} title="Create new" description="Choose the workflow you want to start.">
        <YStack gap="$2" py="$2">
          <Button theme="accent" size="$4" justify="space-between" icon={<ShoppingCart size={16} />} onPress={() => handleNewAction('sale')}>
            New Sale
          </Button>
          <Button bg="$color3" borderWidth={1} borderColor="$borderColor" size="$4" justify="space-between" icon={<PackagePlus size={16} />} onPress={() => handleNewAction('product')}>
            New Product
          </Button>
          <Button bg="$color3" borderWidth={1} borderColor="$borderColor" size="$4" justify="space-between" icon={<Boxes size={16} />} onPress={() => handleNewAction('category')}>
            New Category
          </Button>
        </YStack>
      </ResponsiveDialog>
    </YStack>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const media = useMedia()
  const desktop = !media.maxMd
  const [scrolled, setScrolled] = useState(false)
  const { logout } = useAuthSession()

  useEffect(() => {
    if (Platform.OS !== 'web' || !desktop) return
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [desktop])

  function handleNav(href: string) {
    hapticLight()
    router.replace(href as import('expo-router').Href)
  }

  return desktop
    ? <DesktopAppShell pathname={pathname} onNav={handleNav} scrolled={scrolled} onLogout={logout}>{children}</DesktopAppShell>
    : <MobileAppShell pathname={pathname} onNav={handleNav} onLogout={logout}>{children}</MobileAppShell>
}
