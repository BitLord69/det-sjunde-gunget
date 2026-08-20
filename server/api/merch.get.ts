import { db, tursoClient } from '../db/client'
import { merchProducts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { syncMerchFromSpreadshop, ensureMerchTableExists } from '../utils/merchSync'

interface MerchProduct {
  id: string
  name: string
  typeSv: string
  typeEn: string
  categorySv: string
  categoryEn: string
  price: string
  image: string
  url: string
}

// Server in-memory cache to prevent frequent round-trips to the cloud database
let serverDbCache: { timestamp: number; items: any[] } | null = null
const DB_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export function invalidateMerchServerCache() {
  serverDbCache = null
}

export default defineEventHandler(async (): Promise<MerchProduct[]> => {
  try {
    const now = Date.now()
    let items: any[] = []

    if (serverDbCache && now - serverDbCache.timestamp < DB_CACHE_TTL_MS && serverDbCache.items.length > 0) {
      items = serverDbCache.items
    } else {
      await ensureMerchTableExists()
      items = await db
        .select()
        .from(merchProducts)
        .where(eq(merchProducts.isActive, true))

      // If database is empty, perform initial sync automatically
      if (items.length === 0) {
        await syncMerchFromSpreadshop()
        items = await db
          .select()
          .from(merchProducts)
          .where(eq(merchProducts.isActive, true))
      }

      if (items.length > 0) {
        serverDbCache = { timestamp: now, items }
      }
    }

    if (items.length > 0) {
      // Shuffle the items for dynamic presentation on refresh
      const shuffled = [...items].sort(() => Math.random() - 0.5)

      // Ensure distinct product types first
      const selected: any[] = []
      const usedTypes = new Set<string>()

      for (const item of shuffled) {
        if (!usedTypes.has(item.productTypeId)) {
          selected.push(item)
          usedTypes.add(item.productTypeId)
        }
      }

      // Add remaining items to list
      for (const item of shuffled) {
        if (!selected.some((s) => s.id === item.id)) {
          selected.push(item)
        }
      }

      return selected.map((item): MerchProduct => ({
        id: item.id,
        name: item.name,
        typeSv: item.typeSv,
        typeEn: item.typeEn,
        categorySv: item.categorySv || 'Kläder & Mode',
        categoryEn: item.categoryEn || 'Apparel & Clothing',
        price: item.price,
        image: item.imageUrl,
        url: item.productUrl,
      }))
    }
  } catch (err: any) {
    console.error('[MerchAPI] Error querying merch_products table:', err)
  }

  // Graceful fallback if database query fails
  return [
    {
      id: 'w8dZkrLmpBurqyz9gdg8-6-7',
      name: 'Det 7:e gunget',
      typeSv: 'T-shirt herr',
      typeEn: "Men's T-Shirt",
      price: '258 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T6A444PA8124PT17X65Y58D359193817W25000H25000/views/1,width=500,height=500,appearanceId=444,crop=list,modelId=22663/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se/?sellable=w8dZkrLmpBurqyz9gdg8-6-7',
    },
    {
      id: 'w8dZkrLmpBurqyz9gdg8-1007-22',
      name: 'Det 7:e gunget',
      typeSv: 'Kontrastluvtröja',
      typeEn: 'Contrast Hoodie',
      price: '460 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T1007A738PA8165PT17X61Y9D359193817W24000H24000/views/1,width=500,height=500,appearanceId=738,crop=list,modelId=11277/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se/?sellable=w8dZkrLmpBurqyz9gdg8-1007-22',
    },
    {
      id: 'w8dZkrLmpBurqyz9gdg8-1435-32',
      name: 'Det 7:e gunget',
      typeSv: 'Matlåda',
      typeEn: 'Lunch Box',
      price: '220 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T1435A675PA4397PT10X44Y17D359193817W6149H6149/views/1,width=500,height=500,appearanceId=675,crop=list,modelId=12007/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se/?sellable=w8dZkrLmpBurqyz9gdg8-1435-32',
    },
    {
      id: 'w8dZkrLmpBurqyz9gdg8-1464-36',
      name: 'Det 7:e gunget',
      typeSv: 'Fiskarhatt',
      typeEn: 'Bucket Hat',
      price: '220 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T1464A2PA6606PT32X36Y1D359193817W4777H4777/views/1,width=500,height=500,appearanceId=2,crop=list,modelId=11321/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se/?sellable=w8dZkrLmpBurqyz9gdg8-1464-36',
    },
  ]
})
