import type { GalleryItem } from '~/types'

export function useBandPhotos() {
  const bandPhotos = useState<GalleryItem[]>('band_page_photos_pool', () => [])
  const isLoaded = useState<boolean>('band_page_photos_loaded', () => false)

  const fetchBandPhotos = async (forceRefresh = false) => {
    // Om poolen redan är laddad i vår globala store och inte forceRefresh begärts: återanvänd direkt utan nytt backend-anrop
    if (isLoaded.value && bandPhotos.value.length > 0 && !forceRefresh) {
      return bandPhotos.value
    }

    try {
      const data = await $fetch<GalleryItem[]>('/api/gallery?band=true')
      bandPhotos.value = data || []
      isLoaded.value = true
    } catch (err) {
      console.error('[useBandPhotos] Error fetching band photos:', err)
    }

    return bandPhotos.value
  }

  return {
    bandPhotos,
    isLoaded,
    fetchBandPhotos,
  }
}
