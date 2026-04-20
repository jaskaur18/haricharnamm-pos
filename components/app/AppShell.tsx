import { Pressable } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import {
  Boxes,
  Cog,
  LayoutDashboard,
  ShoppingCart,
} from '@tamagui/lucide-icons-2'
import { Button, Paragraph, ScrollView, XStack, YStack, useMedia } from 'tamagui'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/settings', label: 'Settings', icon: Cog },
] as const

// Desktop sidebar shows all routes including Sales & Reports
const sidebarItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/sales', label: 'Sales', icon: require('@tamagui/lucide-icons-2').ReceiptText },
  { href: '/reports', label: 'Reports', icon: require('@tamagui/lucide-icons-2').BarChart3 },
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

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date())

  return (
    <XStack flex={1} bg="#000000" theme="dark">
      {/* ── Desktop Sidebar ── */}
      {desktop ? (
        <YStack
          style={{
            width: 240,
            height: 'calc(100vh - 32px)',
            position: 'sticky' as any,
            top: 16,
            marginLeft: 16
          }}
          bg="rgba(25, 25, 28, 0.65)"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.08)"
          rounded="$6"
          py="$4"
          gap="$1"
        >
          {/* Brand */}
          <XStack px="$3.5" py="$2" items="center" gap="$2.5">
            <YStack
              bg="$color8"
              rounded="$3"
              items="center"
              justify="center"
              style={{ width: 32, height: 32 }}
            >
              <Paragraph color="#09090B" fontSize={12} fontWeight="900">HC</Paragraph>
            </YStack>
            <YStack>
              <Paragraph color="#FFFFFF" fontSize="$3" fontWeight="800" letterSpacing={0.3}>
                HARI CHARNAMM
              </Paragraph>
              <Paragraph color="#8B8B93" fontSize={10}>{todayLabel}</Paragraph>
            </YStack>
          </XStack>

          {/* Navigation */}
          <YStack gap="$0.5" px="$2" mt="$3">
            {sidebarItems.map((item) => {
              const active = isItemActive(pathname, item.href)
              const Icon = item.icon

              return (
                <Button
                  key={item.href}
                  onPress={() => router.replace(item.href as any)}
                >
                  <XStack
                    items="center"
                    gap="$2.5"
                    px="$3"
                    py="$2"
                    rounded="$3"
                    bg={active ? 'rgba(232, 162, 48, 0.12)' : 'transparent'}
                    hoverStyle={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                    pressStyle={{ bg: 'rgba(232, 162, 48, 0.12)' }}
                  >
                    {active ? (
                      <YStack
                        bg="#FFAF20"
                        style={{ position: 'absolute' as any, left: 0, top: 6, bottom: 6, width: 3, borderRadius: 999 }}
                      />
                    ) : null}
                    <Icon color={active ? '#FFAF20' : '#E4E4E7'} size={18} />
                    <Paragraph
                      color={active ? '#FFFFFF' : '#A1A1AA'}
                      fontSize="$3"
                      fontWeight={active ? '700' : '500'}
                    >
                      {item.label}
                    </Paragraph>
                  </XStack>
                </Button>
              )
            })}
          </YStack>

          {/* Quick actions at bottom */}
          <YStack mt="auto" px="$2" gap="$1.5">
            <Button
              theme="accent"

              size="$3"
              onPress={() => router.replace('/pos' as any)}
            >
              New Sale
            </Button>
          </YStack>
        </YStack>
      ) : null}

      {/* ── Main Content ── */}
      <YStack flex={1} style={{ minHeight: '100%' }}>
        <ScrollView style={{ flex: 1 }}>
          <YStack
            gap="$5"
            style={{
              paddingHorizontal: desktop ? 32 : 16,
              paddingTop: desktop ? 16 : 16,
              paddingBottom: desktop ? 36 : 100,
            }}
          >
            {children}
          </YStack>
        </ScrollView>
      </YStack>

      {/* ── Mobile Bottom Tab Bar ── */}
      {!desktop ? (
        <XStack
          bg="$color2"
          borderTopWidth={1}
          borderColor="$borderColor"
          px="$2"
          pb="$2"
          pt="$1.5"
          justify="space-around"
          style={{ position: 'absolute' as any, left: 0, right: 0, bottom: 0, paddingBottom: 20 }}
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
                    bg={active ? 'rgba(232, 162, 48, 0.15)' : 'transparent'}
                    style={{ width: 40, height: 28, borderRadius: 14 }}
                  >
                    <Icon color={active ? '$color8' : '$color7'} size={20} />
                  </YStack>
                  <Paragraph
                    color={active ? '$color8' : '$color7'}
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
    </XStack>
  )
}
