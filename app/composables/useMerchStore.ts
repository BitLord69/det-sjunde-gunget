export interface MerchItem {
  id: string
  name: string
  typeSv: string
  typeEn: string
  categorySv?: string
  categoryEn?: string
  price: string
  image: string
  url: string
}

export function useMerchStore() {
  const merchItems = useState<MerchItem[]>('merch_store_items', () => [])
  const isLoaded = useState<boolean>('merch_store_loaded', () => false)
  const isLoading = useState<boolean>('merch_store_loading', () => false)

  const fetchMerch = async (forceRefresh = false) => {
    if (isLoaded.value && merchItems.value.length > 0 && !forceRefresh) {
      return merchItems.value
    }

    isLoading.value = true
    try {
      const data = await $fetch<MerchItem[]>('/api/merch')
      merchItems.value = data || []
      isLoaded.value = true
    } catch (err) {
      console.error('[useMerchStore] Error fetching merch items:', err)
    } finally {
      isLoading.value = false
    }

    return merchItems.value
  }

  return {
    merchItems,
    isLoaded,
    isLoading,
    fetchMerch,
  }
}
