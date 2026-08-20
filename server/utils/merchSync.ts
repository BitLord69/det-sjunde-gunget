import { tursoClient } from '../db/client'

export interface SyncResult {
  success: boolean
  totalItems: number
  syncedAt: number
  error?: string
}

export function resolveMerchCategory(nameSv: string, nameEn: string): { sv: string; en: string } {
  const svLow = (nameSv || '').toLowerCase()
  const enLow = (nameEn || '').toLowerCase()
  const combined = `${svLow} ${enLow}`

  if (/keps|mössa|hatt|fiskarhatt|cap|beanie|hat|bucket/i.test(combined)) {
    return { sv: 'Huvudbonader', en: 'Headwear' }
  }
  if (/mugg|flaska|vattenflaska|matlåda|underlägg|förkläde|mug|bottle|apron|lunchbox|coaster/i.test(combined)) {
    return { sv: 'Muggar & Kök', en: 'Mugs & Kitchen' }
  }
  if (/knapp|pin|klistermärke|sticker|kudde|cushion|musmatta|mousepad|kasse|påse|ryggsäck|väska|tote|backpack|bag/i.test(combined)) {
    return { sv: 'Accessoarer & Hem', en: 'Accessories & Home' }
  }
  if (/baby|bodysuit|onesie|tonåring|teen|junior|kids/i.test(combined) || (svLow.includes('barn') && !svLow.includes('baddräkt'))) {
    return { sv: 'Barn & Baby', en: 'Kids & Baby' }
  }
  return { sv: 'Kläder & Mode', en: 'Apparel & Clothing' }
}

export async function ensureMerchTableExists() {
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS merch_products (
      id TEXT PRIMARY KEY,
      product_type_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Det 7:e gunget',
      type_sv TEXT NOT NULL,
      type_en TEXT NOT NULL,
      category_sv TEXT NOT NULL DEFAULT 'Kläder & Mode',
      category_en TEXT NOT NULL DEFAULT 'Apparel & Clothing',
      price TEXT NOT NULL,
      price_amount INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'SEK',
      image_url TEXT NOT NULL,
      product_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_synced_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `)
  try {
    await tursoClient.execute(`ALTER TABLE merch_products ADD COLUMN category_sv TEXT DEFAULT 'Kläder & Mode';`)
  } catch {}
  try {
    await tursoClient.execute(`ALTER TABLE merch_products ADD COLUMN category_en TEXT DEFAULT 'Apparel & Clothing';`)
  } catch {}
}

export async function syncMerchFromSpreadshop(): Promise<SyncResult> {
  const syncedAt = Date.now()

  try {
    await ensureMerchTableExists()

    // 1. Fetch live sellables and all 448+ product types (both SV & EN)
    const [sellablesRes, svRes, enRes]: [any, any, any] = await Promise.all([
      $fetch('https://det-7e-gunget.myspreadshop.se/api/v1/shops/1553619/sellables', {
        headers: { 'User-Agent': 'Det7eGunget-Sync/1.0' },
        timeout: 10000,
      }),
      $fetch('https://det-7e-gunget.myspreadshop.se/api/v1/shops/1553619/productTypes?locale=sv_SE&limit=1000', {
        headers: { 'User-Agent': 'Det7eGunget-Sync/1.0' },
        timeout: 10000,
      }),
      $fetch('https://det-7e-gunget.myspreadshop.se/api/v1/shops/1553619/productTypes?locale=en_US&limit=1000', {
        headers: { 'User-Agent': 'Det7eGunget-Sync/1.0' },
        timeout: 10000,
      }),
    ])

    const mapSv: Record<string, string> = {}
    const mapEn: Record<string, string> = {}

    if (Array.isArray(svRes?.productTypes)) {
      for (const p of svRes.productTypes) {
        if (p?.id && p?.name) mapSv[String(p.id)] = p.name
      }
    }

    if (Array.isArray(enRes?.productTypes)) {
      for (const p of enRes.productTypes) {
        if (p?.id && p?.name) mapEn[String(p.id)] = p.name
      }
    }

    const rawSellables: any[] = sellablesRes?.sellables || []
    const validItems = rawSellables.filter((s: any) => s.previewImage?.url && s.sellableId)

    if (validItems.length === 0) {
      return { success: false, totalItems: 0, syncedAt, error: 'No items returned from Spreadshop' }
    }

    // 2. Batch upsert into database
    for (const item of validItems) {
      const typeIdStr = String(item.productTypeId)
      const nameSv = mapSv[typeIdStr] || item.name || 'Officiell Band-merch'
      const nameEn = mapEn[typeIdStr] || item.name || 'Official Band Merch'
      const categories = resolveMerchCategory(nameSv, nameEn)
      const priceAmount = Number(item.price?.amount) || 0
      const priceStr = `${priceAmount} kr`
      const imageUrl = item.previewImage?.url || ''

      // Build the exact deep link URL required by Spreadshop
      const rawName = item.name || 'det 7e gunget'
      const slug = rawName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/7:e/g, '7e')
        .replace(/[^a-z0-9]+/g, '+')
        .replace(/^\+|\+$/g, '') || 'det+7e+gunget'

      const ideaId = item.ideaId ? `-A${item.ideaId}` : ''
      const pt = item.productTypeId ? `productType=${item.productTypeId}` : ''
      const sellable = item.sellableId ? `sellable=${item.sellableId}` : ''
      const query = [pt, sellable].filter(Boolean).join('&')
      const productUrl = `https://det-7e-gunget.myspreadshop.se/${slug}${ideaId}${query ? '?' + query : ''}`

      await tursoClient.execute({
        sql: `
          INSERT INTO merch_products (
            id, product_type_id, name, type_sv, type_en, category_sv, category_en, price, price_amount, currency, image_url, product_url, is_active, last_synced_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            product_type_id = excluded.product_type_id,
            name = excluded.name,
            type_sv = excluded.type_sv,
            type_en = excluded.type_en,
            category_sv = excluded.category_sv,
            category_en = excluded.category_en,
            price = excluded.price,
            price_amount = excluded.price_amount,
            currency = excluded.currency,
            image_url = excluded.image_url,
            product_url = excluded.product_url,
            is_active = 1,
            last_synced_at = excluded.last_synced_at,
            updated_at = excluded.updated_at
        `,
        args: [
          item.sellableId,
          typeIdStr,
          item.name || 'Det 7:e gunget',
          nameSv,
          nameEn,
          categories.sv,
          categories.en,
          priceStr,
          priceAmount,
          'SEK',
          imageUrl,
          productUrl,
          syncedAt,
          syncedAt,
        ],
      })
    }

    // 3. Update last_merch_sync setting
    await tursoClient.execute({
      sql: `
        INSERT INTO site_settings (key, value, updated_at)
        VALUES ('last_merch_sync', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      args: [String(syncedAt), syncedAt],
    })

    return {
      success: true,
      totalItems: validItems.length,
      syncedAt,
    }
  } catch (err: any) {
    console.error('[MerchSync] Error synchronizing from Spreadshop:', err)
    return {
      success: false,
      totalItems: 0,
      syncedAt,
      error: err?.message || String(err),
    }
  }
}
