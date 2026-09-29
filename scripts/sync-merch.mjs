import 'dotenv/config'
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN

console.log(`\n======================================================`)
console.log(`👕 SYNC MERCH FROM SPREADSHOP`)
console.log(`======================================================`)
console.log(`Databas: ${url.startsWith('file:') ? 'Lokal (local.db)' : url.split('@').pop()}\n`)

const client = createClient({
  url,
  ...(authToken ? { authToken } : {}),
})

const KNOWN_PRODUCT_TYPES = {
  '813': { sv: 'Ekologisk premium-T-shirt dam', en: "Women's Standard T-Shirt" },
  '141': { sv: 'Förkläde', en: 'Apron' },
  '725': { sv: 'T-shirt tonåring', en: 'Teen T-Shirt Classic' },
  '1007': { sv: 'Kontrastluvtröja', en: 'Kontrast-Kapuzenpullover' },
  '949': { sv: 'Enfärgad mugg', en: 'Colored Mug' },
  '6': { sv: 'T-shirt herr', en: 'Männer Basis-T-Shirt' },
  '631': { sv: 'T-shirt dam', en: 'Frauen Basis-T-Shirt' },
  '560': { sv: 'Baby Premium kortärmad bodysuit', en: 'Babys Body' },
  '1089': { sv: 'Jerseymössa', en: 'Unisex Jersey Beanie' },
  '1183': { sv: 'Vintage-T-shirt herr', en: "Men's Spray Dye T-Shirt with Raw-cut trims" },
  '127': { sv: 'Små knappar 25 mm (5-pack)', en: 'Small Buttons 25mm' },
  '125': { sv: 'Stora knappar 56 mm (5-pack)', en: 'Large Buttons 56mm' },
  '1088': { sv: 'Basebollinne herr', en: 'Männer Basketball-Trikot' },
  '1413': { sv: 'Soffkudde med stoppning 45 x 45 cm', en: 'Sofa Pillow' },
  '1435': { sv: 'Matlåda', en: 'Lunchbox' },
  '1459': { sv: 'Klistermärke storlek S (10 x 10 cm)', en: 'Sticker 10x10cm' },
  '1464': { sv: 'Fiskarhatt', en: 'Bucket Hat' },
  '15': { sv: 'Basebollkeps', en: 'Baseball Cap' },
  '1515': { sv: 'JAKO matchlinne Center 2.0', en: 'JAKO Trikot Center 2.0' },
  '1614': { sv: 'Softshelljacka dam', en: "Women's Softshell Jacket" },
  '1615': { sv: 'Softshelljacka unisex', en: 'Unisex Softshell Jacket' },
  '2963': { sv: 'Hoodie unisex oversize kraftig', en: 'Oversized Unisex Hoodie' },
  '3109': { sv: 'Ledig vintagekeps', en: 'Vintage Cap' },
  '4249': { sv: 'Bikini för dam', en: "Women's Bikini" },
  '4250': { sv: 'Baddräkt för dam', en: "Women's Swimsuit" },
  '996': { sv: 'Underlägg (4-pack)', en: 'Coasters (set of 4)' },
}

function resolveMerchCategory(nameSv, nameEn) {
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

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://det-7e-gunget.myspreadshop.se/',
}

async function run() {
  const syncedAt = Date.now()

  // 1. Bygg produkttypsmappning
  const mapSv = {}
  const mapEn = {}
  for (const [id, names] of Object.entries(KNOWN_PRODUCT_TYPES)) {
    mapSv[id] = names.sv
    mapEn[id] = names.en
  }

  try {
    const dbTypes = await client.execute('SELECT product_type_id, type_sv, type_en FROM merch_products')
    for (const row of dbTypes.rows) {
      const id = String(row.product_type_id)
      if (row.type_sv && !mapSv[id]) mapSv[id] = String(row.type_sv)
      if (row.type_en && !mapEn[id]) mapEn[id] = String(row.type_en)
    }
  } catch {}

  console.log('Hämtar artiklar från Spreadshop...')
  const res = await fetch('https://det-7e-gunget.myspreadshop.se/api/v1/shops/1553619/sellables', {
    headers: BROWSER_HEADERS,
  })

  if (!res.ok) {
    throw new Error(`Spreadshop returnerade HTTP ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  const rawSellables = data?.sellables || []
  const validItems = rawSellables.filter((s) => s.previewImage?.url && s.sellableId)
  console.log(`Hittade ${validItems.length} giltiga merch-artiklar i Spreadshop.\n`)

  const activeSellableIds = new Set()

  for (const item of validItems) {
    const typeIdStr = String(item.productTypeId)
    activeSellableIds.add(String(item.sellableId))

    const nameSv = mapSv[typeIdStr] || item.name || 'Officiell Band-merch'
    const nameEn = mapEn[typeIdStr] || item.name || 'Official Band Merch'
    const categories = resolveMerchCategory(nameSv, nameEn)
    const priceAmount = Number(item.price?.amount) || 0
    const priceStr = `${priceAmount} kr`
    const imageUrl = item.previewImage?.url || ''

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

    await client.execute({
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
    console.log(`  ✓ ${nameSv} (${priceStr}) -> ${categories.sv}`)
  }

  // Spara last_merch_sync i site_settings
  await client.execute({
    sql: `
      INSERT INTO site_settings (key, value, created_at, updated_at)
      VALUES ('last_merch_sync', ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    args: [String(syncedAt), syncedAt, syncedAt],
  })

  console.log(`\n🎉 Synkronisering klar! ${validItems.length} artiklar uppdaterade i databasen.`)
}

run().catch((err) => {
  console.error('Synk misslyckades:', err)
  process.exit(1)
})
