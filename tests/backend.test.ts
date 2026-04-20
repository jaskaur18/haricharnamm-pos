import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../convex/_generated/api'
import schema from '../convex/schema'

const modules = import.meta.glob('../convex/**/*.*s')

async function seedProduct(t: any) {
  await t.mutation(api.inventory.seedDefaultCategories, {})
  const categories = await t.query(api.inventory.listCategories, {
    includeInactive: true,
  })
  const categoryId = categories[0]._id
  const subcategoryId = categories[0].children[0]._id

  const created = await t.mutation(api.inventory.create, {
    name: 'Mukut Set',
    description: 'Handmade crown set',
    categoryId,
    subcategoryId,
    status: 'active',
    brandCopy: 'We are providing unique and handmade Lord Accessories.',
    notes: null,
    merchandisingTags: ['festival'],
    variants: [
      {
        variantId: null,
        label: 'Ruby',
        barcode: null,
        attributes: [{ name: 'Stone', value: 'Ruby' }],
        salePrice: 120,
        reorderThreshold: 2,
        openingQuantity: 10,
      },
      {
        variantId: null,
        label: 'Emerald',
        barcode: null,
        attributes: [{ name: 'Stone', value: 'Emerald' }],
        salePrice: 140,
        reorderThreshold: 2,
        openingQuantity: 4,
      },
    ],
  })

  return {
    categories,
    created,
  }
}

describe('HARI CHARNAMM Convex flows', () => {
  it('creates products with incremental codes and keeps stock adjustments in the ledger', async () => {
    const t = convexTest(schema, modules)
    const { created } = await seedProduct(t)

    expect(created.productCode).toBe('HC-P-000001')

    const detail = await t.query(api.inventory.detail, {
      productId: created.productId,
    })
    expect(detail).not.toBeNull()
    expect(detail?.variants).toHaveLength(2)
    expect(detail?.variants[0].displayCode).toBe('HC-P-000001-01')
    expect(detail?.variants[0].inventoryLevel.onHand).toBe(10)

    await t.mutation(api.inventory.adjustStock, {
      variantId: detail!.variants[0]._id,
      quantityDelta: 5,
      reason: 'Cycle count',
      note: null,
    })

    const refreshed = await t.query(api.inventory.detail, {
      productId: created.productId,
    })
    expect(refreshed?.variants[0].inventoryLevel.onHand).toBe(15)

    await expect(
      t.mutation(api.inventory.adjustStock, {
        variantId: detail!.variants[0]._id,
        quantityDelta: -99,
        reason: 'Invalid test adjustment',
        note: null,
      }),
    ).rejects.toThrow('below zero')
  })

  it('commits sales, rejects insufficient stock, updates reports, and supports partial returns', async () => {
    const t = convexTest(schema, modules)
    const { created } = await seedProduct(t)
    const detail = await t.query(api.inventory.detail, {
      productId: created.productId,
    })
    const rubyVariant = detail!.variants[0]

    await expect(
      t.mutation(api.pos.createSale, {
        items: [
          {
            variantId: rubyVariant._id,
            quantity: 99,
            lineDiscount: 0,
          },
        ],
        orderDiscount: 0,
        paymentMethod: 'cash',
        paymentNote: null,
        customerName: null,
        customerPhone: null,
        notes: null,
      }),
    ).rejects.toThrow('Insufficient stock')

    const preview = await t.query(api.pos.previewSale, {
      items: [
        {
          variantId: rubyVariant._id,
          quantity: 2,
          lineDiscount: 20,
        },
      ],
      orderDiscount: 20,
    })

    expect(preview.summary.total).toBe(200)
    expect(preview.summary.totalQty).toBe(2)

    const sale = await t.mutation(api.pos.createSale, {
      items: [
        {
          variantId: rubyVariant._id,
          quantity: 2,
          lineDiscount: 20,
        },
      ],
      orderDiscount: 20,
      paymentMethod: 'cash',
      paymentNote: 'drawer-1',
      customerName: 'Ravi',
      customerPhone: '9999999999',
      notes: 'festival rush',
    })

    expect(sale.saleCode).toBe('HC-S-000001')

    const soldDetail = await t.query(api.pos.saleDetail, {
      saleId: sale.saleId,
    })

    expect(soldDetail?.status).toBe('completed')
    expect(soldDetail?.items[0].remainingQty).toBe(2)

    const afterSaleInventory = await t.query(api.inventory.detail, {
      productId: created.productId,
    })
    expect(afterSaleInventory?.variants[0].inventoryLevel.onHand).toBe(8)

    const overviewAfterSale = await t.query(api.reports.overview, {
      fromDate: null,
      toDate: null,
      categoryId: null,
      subcategoryId: null,
      productId: null,
      variantId: null,
      paymentMethod: 'all',
      returnStatus: 'all',
    })

    expect(overviewAfterSale.metrics.grossRevenue).toBe(200)
    expect(overviewAfterSale.metrics.returnValue).toBe(0)

    const createdReturn = await t.mutation(api.pos.createReturn, {
      saleId: sale.saleId,
      items: [
        {
          saleItemId: soldDetail!.items[0]._id,
          quantity: 1,
        },
      ],
      refundMethod: 'cash',
      refundNote: 'Damaged stone',
    })

    expect(createdReturn.returnCode).toBe('HC-R-000001')

    const returnedSale = await t.query(api.pos.saleDetail, {
      saleId: sale.saleId,
    })
    expect(returnedSale?.status).toBe('returned_partial')
    expect(returnedSale?.items[0].remainingQty).toBe(1)
    expect(returnedSale?.returns).toHaveLength(1)

    const afterReturnInventory = await t.query(api.inventory.detail, {
      productId: created.productId,
    })
    expect(afterReturnInventory?.variants[0].inventoryLevel.onHand).toBe(9)

    const overviewAfterReturn = await t.query(api.reports.overview, {
      fromDate: null,
      toDate: null,
      categoryId: null,
      subcategoryId: null,
      productId: null,
      variantId: null,
      paymentMethod: 'all',
      returnStatus: 'all',
    })

    expect(overviewAfterReturn.metrics.grossRevenue).toBe(200)
    expect(overviewAfterReturn.metrics.returnValue).toBe(100)
    expect(overviewAfterReturn.metrics.revenue).toBe(100)

    const returnsReport = await t.query(api.reports.returnsReport, {
      fromDate: null,
      toDate: null,
      categoryId: null,
      subcategoryId: null,
      productId: null,
      variantId: null,
      paymentMethod: 'all',
      returnStatus: 'all',
      paginationOpts: {
        numItems: 20,
        cursor: null,
      },
    })

    expect(returnsReport.summary.returnCount).toBe(1)
    expect(returnsReport.summary.returnedUnits).toBe(1)
    expect(returnsReport.summary.returnValue).toBe(100)
  })
})
