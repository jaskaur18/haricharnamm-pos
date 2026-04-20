export type CategoryNode = {
  _id: string
  name: string
  isActive: boolean
  parentCategoryId?: string | null
  children: Array<{
    _id: string
    name: string
    isActive: boolean
    parentCategoryId?: string | null
  }>
}

export function getCategoryOptions(categories: CategoryNode[] | undefined) {
  return (categories ?? []).map((category) => ({
    label: category.name,
    value: category._id,
  }))
}

export function getSubcategoryOptions(
  categories: CategoryNode[] | undefined,
  categoryId: string | null,
) {
  if (!categoryId) {
    return []
  }

  const category = (categories ?? []).find((item) => item._id === categoryId)
  return (category?.children ?? []).map((subcategory) => ({
    label: subcategory.name,
    value: subcategory._id,
  }))
}

export function getCategoryName(
  categories: CategoryNode[] | undefined,
  categoryId: string | null | undefined,
) {
  if (!categoryId) {
    return '—'
  }
  return (
    (categories ?? []).find((category) => category._id === categoryId)?.name ?? '—'
  )
}

export function getSubcategoryName(
  categories: CategoryNode[] | undefined,
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
) {
  if (!categoryId || !subcategoryId) {
    return '—'
  }

  const category = (categories ?? []).find((item) => item._id === categoryId)
  return (
    (category?.children ?? []).find((item) => item._id === subcategoryId)?.name ?? '—'
  )
}
