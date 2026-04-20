import { useEffect, useState } from 'react'
import { Image, Platform, Pressable } from 'react-native'
import { createPortal } from 'react-dom'
import { X } from '@tamagui/lucide-icons-2'
import { useQuery } from 'convex/react'
import { Button, Paragraph, ScrollView, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { formatCurrency, formatNumber } from 'lib/format'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'

/**
 * Lightbox that renders as a fixed overlay via portal (web) or inline (native).
 * Uses z-index 100000 to sit above Tamagui Dialog portals.
 */
function Lightbox({ visible, url, onClose }: { visible: boolean; url: string | null; onClose: () => void }) {
  if (!visible || !url) return null

  const content = (
    <Pressable
      onPress={onClose}
      style={{
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100000,
      }}
    >
      <Image source={{ uri: url }} style={{ width: '90%', height: '85%', borderRadius: 12 } as any} resizeMode="contain" />
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.15)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <X size={22} color="white" />
      </Pressable>
    </Pressable>
  )

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}

/**
 * Customer-facing product showcase — read-only, no uploads.
 * Used in both POS and Inventory to display full product details.
 * Features: large hero image, lightbox, variant details, brand copy.
 */
export function ProductShowcaseDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const media = useMedia()
  const desktop = !media.maxMd
  const details = useQuery(convexApi.pos.catalogProductDetails, productId ? { productId } : 'skip' as any) as any
  const gallery = useQuery(convexApi.pos.productMediaGallery, productId ? { productId } : 'skip' as any) as any[] | undefined
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Reset active image when dialog opens or gallery loads
  useEffect(() => { if (open) { setActiveUrl(null); setLightboxOpen(false) } }, [open])
  useEffect(() => {
    if (gallery && gallery.length > 0 && !activeUrl) setActiveUrl(gallery[0].url)
  }, [gallery, activeUrl])

  if (!productId) return null

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Product Details">
        {!details ? (
          <XStack justify="center" py="$8"><Spinner size="large" /></XStack>
        ) : (
          <YStack gap="$4" py="$2">
            {/* ── Hero: large image + product info side by side ── */}
            <XStack gap="$5" flexWrap="wrap">
              {/* Main Image — clickable for lightbox */}
              <YStack
                style={{ width: desktop ? 300 : '100%', aspectRatio: 1 } as any}
                bg="$color2"
                rounded="$6"
                overflow="hidden"
                items="center"
                justify="center"
                cursor="pointer"
                onPress={() => activeUrl && setLightboxOpen(true)}
                hoverStyle={{ opacity: 0.9 }}
              >
                {activeUrl ? (
                  <Image
                    source={{ uri: activeUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 16 }}
                    resizeMode="cover"
                  />
                ) : (
                  <YStack items="center" gap="$2">
                    <Paragraph color="$color7" fontSize="$8" fontWeight="900">{(details.name || 'HC').slice(0, 2).toUpperCase()}</Paragraph>
                    <Paragraph color="$color8" fontSize="$1">No image</Paragraph>
                  </YStack>
                )}
              </YStack>

              {/* Product info */}
              <YStack flex={1} gap="$3" style={{ minWidth: 220 }}>
                <YStack gap="$1">
                  <Paragraph fontSize={desktop ? '$8' : '$6'} fontWeight="900" letterSpacing={-0.5}>{details.name}</Paragraph>
                  <Paragraph color="$color8" fontSize="$3" fontWeight="600">{details.productCode}</Paragraph>
                </YStack>

                {/* Tags */}
                {details.merchandisingTags?.length > 0 ? (
                  <XStack flexWrap="wrap" gap="$1.5">
                    {details.merchandisingTags.map((tag: string) => (
                      <YStack key={tag} bg="$color3" px="$2.5" py="$1" rounded="$10">
                        <Paragraph color="$accentBackground" fontSize={11} fontWeight="700">{tag}</Paragraph>
                      </YStack>
                    ))}
                  </XStack>
                ) : null}

                {/* Description */}
                <YStack gap="$1">
                  <Paragraph color="$color9" fontSize={11} fontWeight="700">DESCRIPTION</Paragraph>
                  <Paragraph color="$color11" fontSize="$3" lineHeight={22}>
                    {details.description || 'No description provided.'}
                  </Paragraph>
                </YStack>

                {/* Brand copy */}
                {details.brandCopy ? (
                  <YStack bg="$color2" rounded="$4" p="$3" borderLeftWidth={3} borderLeftColor="$accentBackground">
                    <Paragraph color="$color9" fontStyle="italic" fontSize="$2" lineHeight={20}>
                      "{details.brandCopy}"
                    </Paragraph>
                  </YStack>
                ) : null}
              </YStack>
            </XStack>

            {/* ── Variants table ── */}
            {details.variants?.length > 0 ? (
              <YStack gap="$2">
                <Paragraph fontSize="$3" fontWeight="800" color="$color10">
                  {details.variants.length} Variant{details.variants.length > 1 ? 's' : ''} Available
                </Paragraph>
                <YStack gap="$1.5">
                  {details.variants.map((v: any, i: number) => (
                    <XStack
                      key={i}
                      bg="$color2"
                      rounded="$4"
                      px="$3"
                      py="$2.5"
                      justify="space-between"
                      items="center"
                      borderWidth={1}
                      borderColor="$borderColor"
                      hoverStyle={{ borderColor: '$color6', bg: '$color3' }}
                    >
                      <YStack gap="$0.5" flex={1}>
                        <Paragraph fontSize="$3" fontWeight="700">{v.label || v.optionSummary || `Variant ${i + 1}`}</Paragraph>
                        {v.displayCode ? <Paragraph color="$color8" fontSize={10}>{v.displayCode}</Paragraph> : null}
                        {v.attributes?.length > 0 ? (
                          <XStack gap="$1.5" flexWrap="wrap" mt="$0.5">
                            {v.attributes.map((a: any, j: number) => (
                              <Paragraph key={j} color="$color8" fontSize={10}>
                                {a.name}: <Paragraph color="$color10" fontSize={10} fontWeight="600">{a.value}</Paragraph>
                              </Paragraph>
                            ))}
                          </XStack>
                        ) : null}
                      </YStack>
                      <XStack gap="$4" items="center">
                        <YStack items="flex-end">
                          <Paragraph fontSize="$5" fontWeight="900">{formatCurrency(v.salePrice)}</Paragraph>
                        </YStack>
                        <YStack items="flex-end" bg="$color3" rounded="$3" px="$2" py="$1">
                          <Paragraph fontSize="$2" fontWeight="700" color={v.onHand <= 0 ? '$red10' : v.onHand <= (v.reorderThreshold || 5) ? '$yellow10' : '$green10'}>
                            {formatNumber(v.onHand ?? 0)}
                          </Paragraph>
                          <Paragraph color="$color8" fontSize={9}>avail</Paragraph>
                        </YStack>
                      </XStack>
                    </XStack>
                  ))}
                </YStack>
              </YStack>
            ) : null}

            {/* ── Thumbnail gallery strip ── */}
            {gallery && gallery.length > 1 ? (
              <YStack gap="$2">
                <Paragraph fontSize="$2" fontWeight="700" color="$color9">Gallery ({gallery.length})</Paragraph>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <XStack gap="$2">
                    {gallery.map((m: any) => (
                      <YStack
                        key={m._id}
                        onPress={() => setActiveUrl(m.url)}
                        borderWidth={2}
                        borderColor={activeUrl === m.url ? '$accentBackground' : '$borderColor'}
                        rounded="$3"
                        overflow="hidden"
                        cursor="pointer"
                        hoverStyle={{ borderColor: '$color6', scale: 1.05 }}
                        pressStyle={{ scale: 0.95 }}
                      >
                        <Image
                          source={{ uri: m.url }}
                          style={{ width: 72, height: 72, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      </YStack>
                    ))}
                  </XStack>
                </ScrollView>
              </YStack>
            ) : null}
          </YStack>
        )}
      </ResponsiveDialog>

      {/* ── Lightbox overlay — portal-based, z-index 100000 ── */}
      <Lightbox visible={lightboxOpen} url={activeUrl} onClose={() => setLightboxOpen(false)} />
    </>
  )
}
