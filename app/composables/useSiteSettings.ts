export interface PublicSiteSettings {
  contactEmail: string
  newsletterEnabled: boolean
  landingSongCount: number
  landingMerchCount: number
  lastMerchSync: number | null
}

export function useSiteSettings() {
  const { data: settingsData, refresh: refreshSettings } = useFetch<PublicSiteSettings>('/api/settings', {
    key: 'public_site_settings',
    default: () => ({
      contactEmail: 'info@det7egunget.se',
      newsletterEnabled: false,
      landingSongCount: 4,
      landingMerchCount: 4,
      lastMerchSync: null,
    }),
  })

  const contactEmail = computed(() => {
    return settingsData.value?.contactEmail || 'info@det7egunget.se'
  })

  return {
    settingsData,
    contactEmail,
    refreshSettings,
  }
}
