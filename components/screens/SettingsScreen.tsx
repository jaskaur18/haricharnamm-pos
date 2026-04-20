import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Save } from '@tamagui/lucide-icons-2'
import { useMutation, useQuery } from 'convex/react'
import { Button, Input, Paragraph, Spinner, XStack, YStack, useMedia } from 'tamagui'
import { convexApi } from 'lib/convex'
import { getErrorMessage } from 'lib/errors'
import { CategoryNode } from 'lib/categories'
import { formatNumber } from 'lib/format'
import { PageHeader } from 'components/ui/PageHeader'
import { ResponsiveDialog } from 'components/ui/ResponsiveDialog'
import { SelectionField } from 'components/ui/SelectionField'
import { SurfaceCard } from 'components/ui/SurfaceCard'
import { FormField } from 'components/ui/FormField'
import { MetricCard } from 'components/ui/MetricCard'
import { useToastController } from '@tamagui/toast'

type EditableCategory = {
  categoryId: string | null
  name: string
  parentCategoryId: string | null
  isActive: boolean
}

const defaultForm: EditableCategory = {
  categoryId: null,
  name: '',
  parentCategoryId: null,
  isActive: true,
}

export function SettingsScreen() {
  const toast = useToastController()
  const media = useMedia()
  const desktop = !media.maxMd
  const categories = useQuery(convexApi.inventory.listCategories, { includeInactive: true }) as CategoryNode[] | undefined
  const seedDefaultCategories = useMutation(convexApi.inventory.seedDefaultCategories)
  const saveCategory = useMutation(convexApi.inventory.saveCategory)

  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<EditableCategory>(defaultForm)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!editorOpen) setForm(defaultForm)
  }, [editorOpen])

  // Auto-expand all categories on first load
  useEffect(() => {
    if (categories && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categories.map((c) => c._id)))
    }
  }, [categories])

  const totalSubcategories = (categories ?? []).reduce((sum, c) => sum + c.children.length, 0)

  async function handleSeedDefaults() {
    try {
      const result = await seedDefaultCategories({})
      toast.show(result.created ? 'Defaults added' : 'Already exist', {
        message: result.created ? 'Categories are ready.' : 'No changes needed.',
      })
    } catch (error) {
      toast.show('Failed', { message: getErrorMessage(error) })
    }
  }

  function openForCreate(parentCategoryId: string | null = null) {
    setForm({ categoryId: null, name: '', parentCategoryId, isActive: true })
    setEditorOpen(true)
  }

  function openForEdit(category: { _id: string; name: string; parentCategoryId?: string | null; isActive: boolean }) {
    setForm({ categoryId: category._id, name: category.name, parentCategoryId: category.parentCategoryId ?? null, isActive: category.isActive })
    setEditorOpen(true)
  }

  function toggleExpanded(categoryId: string) {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  async function handleSaveCategory() {
    if (!form.name.trim()) {
      toast.show('Name is required')
      return
    }

    setIsSaving(true)
    try {
      await saveCategory({
        categoryId: form.categoryId,
        name: form.name.trim(),
        parentCategoryId: form.parentCategoryId,
        isActive: form.isActive,
      })
      toast.show(form.categoryId ? 'Updated' : 'Created', { message: 'Category tree refreshed.' })
      setEditorOpen(false)
    } catch (error) {
      toast.show('Failed', { message: getErrorMessage(error) })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <YStack gap="$4">
      <PageHeader
        title="Settings"
        description="Store structure and categories."
        actions={
          <XStack gap="$2">
            <Button size="$3" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={handleSeedDefaults}>
              Seed defaults
            </Button>
            <Button size="$3" theme="accent" icon={Plus} onPress={() => openForCreate()}>
              {desktop ? 'New Category' : 'New'}
            </Button>
          </XStack>
        }
      />

      {/* Summary metrics */}
      <XStack gap="$2.5" flexWrap="wrap">
        <MetricCard
          label="Categories"
          value={categories ? formatNumber(categories.length) : '—'}
          accentColor="#E8A230"
        />
        <MetricCard
          label="Subcategories"
          value={categories ? formatNumber(totalSubcategories) : '—'}
          accentColor="#60A5FA"
        />
      </XStack>

      {/* Category tree */}
      {!categories ? (
        <XStack items="center" gap="$2" py="$4" justify="center">
          <Spinner size="small" />
          <Paragraph color="$color7" fontSize="$2">Loading categories…</Paragraph>
        </XStack>
      ) : categories.length === 0 ? (
        <YStack bg="$color2" borderWidth={1} borderColor="$borderColor" rounded="$5" p="$5" gap="$2" items="center">
          <Paragraph fontSize="$5" fontWeight="700">No categories</Paragraph>
          <Paragraph color="$color7" fontSize="$3">Seed defaults or create your own structure.</Paragraph>
          <XStack gap="$2" mt="$2">
            <Button bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={handleSeedDefaults}>Seed defaults</Button>
            <Button theme="accent" onPress={() => openForCreate()}>Create first</Button>
          </XStack>
        </YStack>
      ) : (
        <YStack gap="$1.5">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category._id)
            return (
              <YStack key={category._id}>
                {/* Category row */}
                <XStack
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  p="$2.5"
                  gap="$2.5"
                  items="center"
                  hoverStyle={{ borderColor: '$borderColorHover' }}
                  
                >
                  <Button
                    unstyled
                    onPress={() => toggleExpanded(category._id)}
                    p="$1"
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} color="$color10" />
                    ) : (
                      <ChevronRight size={16} color="$color10" />
                    )}
                  </Button>

                  <YStack flex={1} gap="$0.5">
                    <Paragraph fontWeight="700" fontSize="$3">
                      {category.name}
                    </Paragraph>
                    <Paragraph color="$color7" fontSize="$1">
                      {category.isActive ? 'Active' : 'Inactive'} · {formatNumber(category.children.length)} sub
                    </Paragraph>
                  </YStack>

                  <XStack gap="$1.5">
                    <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => openForCreate(category._id)}>
                      {desktop ? 'Add sub' : '+'}
                    </Button>
                    <Button size="$2" theme="accent" onPress={() => openForEdit(category)}>
                      Edit
                    </Button>
                  </XStack>
                </XStack>

                {/* Subcategories (indented) */}
                {isExpanded && category.children.length > 0 ? (
                  <YStack pl="$6" gap="$1" mt="$1">
                    {category.children.map((sub) => (
                      <XStack
                        key={sub._id}
                        bg="$color2"
                        borderWidth={1}
                        borderColor="$borderColor"
                        borderLeftWidth={3}
                        borderLeftColor="$color5"
                        rounded="$3"
                        p="$2"
                        gap="$2.5"
                        items="center"
                        hoverStyle={{ borderColor: '$borderColorHover' }}
                        
                      >
                        <YStack flex={1} gap="$0.5">
                          <Paragraph color="$color11" fontWeight="600" fontSize="$2">
                            {sub.name}
                          </Paragraph>
                          <Paragraph color="$color7" fontSize="$1">
                            {sub.isActive ? 'Active' : 'Inactive'}
                          </Paragraph>
                        </YStack>
                        <Button size="$2" bg="$color3" borderColor="$borderColor" borderWidth={1} onPress={() => openForEdit(sub)}>
                          Edit
                        </Button>
                      </XStack>
                    ))}
                  </YStack>
                ) : null}
              </YStack>
            )
          })}
        </YStack>
      )}

      {/* Category editor dialog */}
      <ResponsiveDialog open={editorOpen} onOpenChange={setEditorOpen} title={form.categoryId ? 'Edit category' : 'Create category'}>
        <YStack gap="$3" py="$2">
          <FormField label="Category name">
            <Input
              value={form.name}
              onChangeText={(name) => setForm((c) => ({ ...c, name }))}
              placeholder="e.g. Crowns & Mukuts"
              bg="$color1"
              borderColor="$borderColor"
            />
          </FormField>

          <SelectionField
            label="Parent"
            value={form.parentCategoryId}
            placeholder="Top level"
            description="Leave empty for a top-level category."
            options={[
              { label: 'Top level', value: null },
              ...(categories ?? []).map((c) => ({ label: c.name, value: c._id })),
            ]}
            onChange={(v) => setForm((c) => ({ ...c, parentCategoryId: v }))}
          />

          <FormField label="Status">
            <XStack gap="$2">
              <Button
                flex={1}
                theme={form.isActive ? 'accent' : undefined}
                onPress={() => setForm((c) => ({ ...c, isActive: true }))}
              >
                Active
              </Button>
              <Button
                flex={1}
                theme={!form.isActive ? 'accent' : undefined}
                onPress={() => setForm((c) => ({ ...c, isActive: false }))}
              >
                Inactive
              </Button>
            </XStack>

          </FormField>

          <XStack justify="flex-end">
            <Button theme="accent" icon={Save} onPress={handleSaveCategory} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </XStack>
        </YStack>
      </ResponsiveDialog>
    </YStack>
  )
}
