interface MerchProduct {
  id: string
  name: string
  typeSv: string
  typeEn: string
  price: string
  image: string
  url: string
}

export default defineEventHandler(async (): Promise<MerchProduct[]> => {
  const typeLabels: Record<string, { sv: string; en: string }> = {
    '813': { sv: 'Premium T-Shirt', en: 'Premium T-Shirt' },
    '1007': { sv: 'Huvtröja (Hoodie)', en: 'Hoodie' },
    '949': { sv: 'Vintage Emaljmugg', en: 'Enamel Mug' },
    '560': { sv: 'Tygkasse', en: 'Tote Bag' },
    '631': { sv: 'Dam T-Shirt', en: "Women's T-Shirt" },
    '1459': { sv: 'Klistermärke', en: 'Sticker' },
    '6': { sv: 'Klassisk T-Shirt', en: 'Classic T-Shirt' },
    '141': { sv: 'Unisex T-Shirt', en: 'Unisex T-Shirt' },
    '725': { sv: 'Keps', en: 'Snapback Cap' },
    '1089': { sv: 'Vattenflaska / Termos', en: 'Water Bottle' },
    '1183': { sv: 'Baby Body', en: 'Baby Onesie' },
    '127': { sv: 'Långärmad T-Shirt', en: 'Longsleeve Shirt' },
    '125': { sv: 'Pikétröja', en: 'Polo Shirt' },
    '1088': { sv: 'Kaffemugg', en: 'Ceramic Mug' },
    '1413': { sv: 'Musmatta', en: 'Mousepad' },
    '1435': { sv: 'Mössa (Beanie)', en: 'Beanie' },
    '1464': { sv: 'Förkläde', en: 'Apron' },
    '15': { sv: 'Kudde', en: 'Cushion' },
    '1515': { sv: 'Ryggsäck', en: 'Backpack' },
    '1614': { sv: 'Emaljmugg', en: 'Enamel Mug' },
    '1615': { sv: 'Termosmugg', en: 'Thermal Mug' },
    '2963': { sv: 'Retro T-Shirt', en: 'Retro T-Shirt' },
    '3109': { sv: 'Gympapåse', en: 'Gym Bag' },
    '4249': { sv: 'Oversized T-Shirt', en: 'Oversized T-Shirt' },
    '4250': { sv: 'Oversized Hoodie', en: 'Oversized Hoodie' },
    '996': { sv: 'Väska', en: 'Shoulder Bag' },
  }

  try {
    const res: any = await $fetch(
      'https://det-7e-gunget.myspreadshop.se/api/v1/shops/1553619/sellables',
      {
        headers: { 'User-Agent': 'Det7eGunget-Web/1.0' },
        timeout: 6000,
      }
    )

    const rawSellables: any[] = res?.sellables || []
    
    // Filter only sellables with a valid image
    const validItems = rawSellables.filter((s: any) => s.previewImage?.url)

    if (validItems.length > 0) {
      // Shuffle the list for dynamic freshness
      const shuffled = [...validItems].sort(() => Math.random() - 0.5)

      // Pick up to 4 items with distinct product types first to ensure rich visual variety
      const selected: any[] = []
      const usedTypes = new Set<string>()

      for (const item of shuffled) {
        if (selected.length >= 4) break
        if (!usedTypes.has(item.productTypeId)) {
          selected.push(item)
          usedTypes.add(item.productTypeId)
        }
      }

      // If we still need more to reach 4 items, fill from remaining shuffled items
      for (const item of shuffled) {
        if (selected.length >= 4) break
        if (!selected.some((s) => s.sellableId === item.sellableId)) {
          selected.push(item)
        }
      }

      return selected.map((item: any): MerchProduct => {
        const labels = typeLabels[item.productTypeId] || { sv: 'Band-merch', en: 'Band Merch' }
        return {
          id: item.sellableId,
          name: item.name || 'Det 7:e Gunget',
          typeSv: labels.sv,
          typeEn: labels.en,
          price: `${item.price?.amount || 0} kr`,
          image: item.previewImage?.url || '',
          url: `https://det-7e-gunget.myspreadshop.se/${item.sellableId}`,
        }
      })
    }
  } catch (err: any) {
    console.warn('[MerchAPI] Spreadshop API error or timeout, using fallback:', err?.message)
  }

  // Fallback items if Spreadshop API is temporarily unreachable (also shuffled)
  const fallbacks: MerchProduct[] = [
    {
      id: 'w8dZkrLmpBurqyz9gdg8-813-8',
      name: 'Det 7:e gunget',
      typeSv: 'Premium T-Shirt',
      typeEn: 'Premium T-Shirt',
      price: '301 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T813A1256PA8544PT17X40Y37D359193817W25000H25000/views/1,width=500,height=500,appearanceId=1256,crop=list,modelId=17103/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se',
    },
    {
      id: 'w8dZkrLmpBurqyz9gdg8-1007-22',
      name: 'Det 7:e gunget',
      typeSv: 'Huvtröja (Hoodie)',
      typeEn: 'Hoodie',
      price: '460 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T1007A738PA8165PT17X61Y9D359193817W24000H24000/views/1,width=500,height=500,appearanceId=738,crop=list,modelId=11277/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se',
    },
    {
      id: 'w8dZkrLmpBurqyz9gdg8-949-32',
      name: 'Det 7:e gunget',
      typeSv: 'Vintage Emaljmugg',
      typeEn: 'Enamel Mug',
      price: '205 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T949A2PA2011PT25X0Y6D359193817W5900H5900/views/4,width=500,height=500,appearanceId=2,crop=list,modelId=11691/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se',
    },
    {
      id: 'w8dZkrLmpBurqyz9gdg8-560-10',
      name: 'Det 7:e gunget',
      typeSv: 'Tygkasse',
      typeEn: 'Tote Bag',
      price: '197 kr',
      image: 'https://image.spreadshirtmedia.net/image-server/v1/products/T560A1269PA9067PT17X15Y15D359193817W6998H6998/views/1,width=500,height=500,appearanceId=1269,crop=list,modelId=20377/den-officiella-logotypen-foer-bluesrockbandet-det-7e-gunget.jpg',
      url: 'https://det-7e-gunget.myspreadshop.se',
    },
  ]

  return [...fallbacks].sort(() => Math.random() - 0.5)
})
