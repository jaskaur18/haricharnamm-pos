import { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronDown, ChevronRight, Plus, Save, Trash2 } from '@tamagui/lucide-icons-2'
import { useMutation, useQuery } from 'convex/react'
import { Button, Input, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { Id } from 'convex/_generated/dataModel'
import { getErrorMessage } from 'lib/errors'
import { CategoryNode } from 'lib/categories'
import { formatNumber } from 'lib/format'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { SurfaceCard } from 'components/ui/SurfaceCard'
import { FormField } from 'components/ui/FormField'
import { MetricCard } from 'components/ui/MetricCard'
import { hapticMedium } from 'lib/haptics'
import { useToastController } from '@tamagui/toast'

type EditableCategory = { categoryId: string | null; name: string; parentCategoryId: string | null; isActive: boolean }
const defaultForm: EditableCategory = { categoryId: null, name: '', parentCategoryId: null, isActive: true }

export function SettingsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ create?: string | string[]; openAt?: string | string[] }>()
  const toast = useToastController()
  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const seedDefaultCategories = useMutation(convexApi.inventory.seedDefaultCategories)
  const saveCategory = useMutation(convexApi.inventory.saveCategory)
  const deleteCategory = useMutation(convexApi.inventory.deleteCategory)

  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<EditableCategory>(defaultForm)
  const [isSaving, setIsSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => { if (!editorOpen) setForm(defaultForm) }, [editorOpen])
  useEffect(() => { if (categories && expanded.size === 0) setExpanded(new Set(categories.map((c) => c._id))) }, [categories])
  useEffect(() => {
    const create = Array.isArray(params.create) ? params.create[0] : params.create
    const openAt = Array.isArray(params.openAt) ? params.openAt[0] : params.openAt
    if (create !== 'category' || !openAt) return
    setForm(defaultForm)
    setEditorOpen(true)
    router.replace('/settings')
  }, [params.create, params.openAt, router])

  const totalSubs = (categories ?? []).reduce((s, c) => s + c.children.length, 0)

  async function handleSeed() {
    try { const r = await seedDefaultCategories({}); toast.show(r.created ? 'Defaults added' : 'Already exist') }
    catch (e) { toast.show('Failed', { message: getErrorMessage(e) }) }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.show('Name required'); return }
    setIsSaving(true)
    try {
      await saveCategory({ categoryId: form.categoryId as Id<'categories'> | null, name: form.name.trim(), parentCategoryId: form.parentCategoryId as Id<'categories'> | null, isActive: form.isActive })
      hapticMedium()
      toast.show(form.categoryId ? 'Updated' : 'Created')
      setEditorOpen(false)
    } catch (e) { toast.show('Failed', { message: getErrorMessage(e) }) }
    finally { setIsSaving(false) }
  }

  async function handleDelete() {
    if (!form.categoryId) return
    setIsSaving(true)
    try {
      await deleteCategory({ categoryId: form.categoryId as Id<'categories'> })
      hapticMedium()
      toast.show('Deleted')
      setEditorOpen(false)
    } catch (e) { toast.show('Can\'t delete', { message: getErrorMessage(e) }) }
    finally { setIsSaving(false) }
  }

  return (
    <YStack gap="$4">
      <XStack justify="space-between" items="center" gap="$3" flexWrap="wrap">
        {!media.maxMd ? (
          <>
            <YStack gap="$0.5">
              <Paragraph fontSize="$7" fontWeight="900" letterSpacing={-0.5}>Settings</Paragraph>
              <Paragraph color="$color8" fontSize="$2">Categories and store structure.</Paragraph>
            </YStack>
            <Button theme="accent" size="$3" icon={<Plus size={14} />} onPress={() => { setForm(defaultForm); setEditorOpen(true) }} hoverStyle={{ scale: 1.02 }} pressStyle={{ scale: 0.97 }}>
              New Category
            </Button>
          </>
        ) : null}
      </XStack>

      <XStack gap="$2.5" flexWrap="wrap">
        <MetricCard label="Categories" value={categories ? formatNumber(categories.length) : '—'} tone="accent" />
        <MetricCard label="Subcategories" value={categories ? formatNumber(totalSubs) : '—'} tone="info" />
      </XStack>

      {!categories ? (
        <XStack items="center" gap="$2" py="$4" justify="center"><Spinner size="small" /><Paragraph color="$color8">Loading…</Paragraph></XStack>
      ) : categories.length === 0 ? (
        <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" borderStyle="dashed" rounded="$6" p="$5" gap="$3" items="center">
          <Paragraph fontSize="$5" fontWeight="700">No categories</Paragraph>
          <Paragraph color="$color8">Seed defaults or create your own.</Paragraph>
          <XStack gap="$2" mt="$2">
            <Button bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={handleSeed}>Seed defaults</Button>
            <Button theme="accent" onPress={() => { setForm(defaultForm); setEditorOpen(true) }}>Create first</Button>
          </XStack>
        </YStack>
      ) : (
        <YStack gap="$1.5">
          {categories.map((cat) => {
            const isExp = expanded.has(cat._id)
            return (
              <YStack key={cat._id}>
                <XStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$4" p="$2.5" gap="$2.5" items="center" hoverStyle={{ borderColor: '$color6', bg: '$color3' }}>
                  <Button size="$2" bg="transparent" borderWidth={0} onPress={() => { const n = new Set(expanded); if (n.has(cat._id)) n.delete(cat._id); else n.add(cat._id); setExpanded(n) }} p="$1" pressStyle={{ scale: 0.9 }}>
                    {isExp ? <ChevronDown size={16} color="$color10" /> : <ChevronRight size={16} color="$color10" />}
                  </Button>
                  <YStack flex={1} gap="$0.5">
                    <Paragraph fontWeight="700" fontSize="$3">{cat.name}</Paragraph>
                    <Paragraph color="$color8" fontSize="$1">{cat.isActive ? 'Active' : 'Inactive'} · {formatNumber(cat.children.length)} sub</Paragraph>
                  </YStack>
                  <XStack gap="$1.5">
                    <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={() => { setForm({ categoryId: null, name: '', parentCategoryId: cat._id, isActive: true }); setEditorOpen(true) }}>{desktop ? 'Add sub' : '+'}</Button>
                    <Button size="$2" theme="accent" onPress={() => { setForm({ categoryId: cat._id, name: cat.name, parentCategoryId: cat.parentCategoryId ?? null, isActive: cat.isActive }); setEditorOpen(true) }}>Edit</Button>
                  </XStack>
                </XStack>

                {isExp && cat.children.length > 0 ? (
                  <YStack pl="$5" gap="$0.5" mt="$0.5" ml="$2" borderLeftWidth={2} borderLeftColor="$borderColor">
                    {cat.children.map((sub) => (
                      <XStack key={sub._id} bg="$color2" borderWidth={1} borderColor="$color3" rounded="$3" p="$2" gap="$2.5" items="center" hoverStyle={{ borderColor: '$color6', bg: '$color3' }} ml="$2">
                        <YStack width={6} height={6} rounded="$10" bg="$color7" style={{ marginLeft: -22 }} />
                        <YStack flex={1} gap="$0.5">
                          <Paragraph color="$color11" fontWeight="600" fontSize="$2">{sub.name}</Paragraph>
                          <Paragraph color="$color8" fontSize="$1">{sub.isActive ? 'Active' : 'Inactive'}</Paragraph>
                        </YStack>
                        <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '$color4' }} onPress={() => { setForm({ categoryId: sub._id, name: sub.name, parentCategoryId: sub.parentCategoryId ?? null, isActive: sub.isActive }); setEditorOpen(true) }}>Edit</Button>
                      </XStack>
                    ))}
                  </YStack>
                ) : null}
              </YStack>
            )
          })}
        </YStack>
      )}

      <ResponsiveDialog open={editorOpen} onOpenChange={setEditorOpen} title={form.categoryId ? 'Edit category' : 'Create category'}>
        <YStack gap="$3" py="$2">
          <FormField label="Name"><Input value={form.name} onChangeText={(n) => setForm((c) => ({ ...c, name: n }))} placeholder="e.g. Crowns" bg="$color3" borderWidth={0} px="$4" /></FormField>
          <SelectionField label="Parent" value={form.parentCategoryId} placeholder="Top level" description="Leave empty for top-level." options={[{ label: 'Top level', value: null }, ...(categories ?? []).filter(c => c._id !== form.categoryId).map((c) => ({ label: c.name, value: c._id }))]} onChange={(v) => setForm((c) => ({ ...c, parentCategoryId: v }))} />
          <FormField label="Status">
            <XStack bg="$color2" rounded="$3" p="$0.5" borderWidth={1} borderColor="$borderColor">
              <Button flex={1} bg={form.isActive ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setForm((c) => ({ ...c, isActive: true }))}><Paragraph fontSize="$2" fontWeight={form.isActive ? '700' : '500'} color={form.isActive ? '$color12' : '$color8'}>Active</Paragraph></Button>
              <Button flex={1} bg={!form.isActive ? '$color4' : 'transparent'} borderWidth={0} rounded="$2" onPress={() => setForm((c) => ({ ...c, isActive: false }))}><Paragraph fontSize="$2" fontWeight={!form.isActive ? '700' : '500'} color={!form.isActive ? '$color12' : '$color8'}>Inactive</Paragraph></Button>
            </XStack>
          </FormField>
          <XStack justify="space-between">
            {form.categoryId ? (
              <Button bg="$color3" borderColor="$borderColor" borderWidth={1} hoverStyle={{ bg: '#ff333320', borderColor: '#ff000040' }} icon={<Trash2 size={14} color="$color10" />} onPress={handleDelete} disabled={isSaving} pressStyle={{ scale: 0.97 }}>
                <Paragraph color="$color11" fontSize="$3">Delete</Paragraph>
              </Button>
            ) : <XStack />}
            <Button theme="accent" icon={<Save size={14} />} onPress={handleSave} disabled={isSaving} hoverStyle={{ scale: 1.02 }} pressStyle={{ scale: 0.97 }}>{isSaving ? 'Saving…' : 'Save'}</Button>
          </XStack>
        </YStack>
      </ResponsiveDialog>
    </YStack>
  )
}
