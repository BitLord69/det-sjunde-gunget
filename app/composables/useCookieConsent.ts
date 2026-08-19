export interface CookieConsentPreferences {
  necessary: boolean
  media: boolean
  answered: boolean
  updatedAt?: number
}

const DEFAULT_CONSENT: CookieConsentPreferences = {
  necessary: true,
  media: false,
  answered: false,
}

export function useCookieConsent() {
  const consentCookie = useCookie<CookieConsentPreferences>('gunget_cookie_consent', {
    default: () => ({ ...DEFAULT_CONSENT }),
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    path: '/',
  })

  const isSettingsOpen = useState<boolean>('gunget_cookie_settings_open', () => false)

  const isConsentGiven = (category: 'necessary' | 'media'): boolean => {
    if (category === 'necessary') return true
    return Boolean(consentCookie.value?.answered && consentCookie.value?.media)
  }

  const hasAnswered = computed(() => Boolean(consentCookie.value?.answered))

  const acceptAll = () => {
    consentCookie.value = {
      necessary: true,
      media: true,
      answered: true,
      updatedAt: Date.now(),
    }
    isSettingsOpen.value = false
  }

  const acceptNecessaryOnly = () => {
    consentCookie.value = {
      necessary: true,
      media: false,
      answered: true,
      updatedAt: Date.now(),
    }
    isSettingsOpen.value = false
  }

  const savePreferences = (mediaConsent: boolean) => {
    consentCookie.value = {
      necessary: true,
      media: mediaConsent,
      answered: true,
      updatedAt: Date.now(),
    }
    isSettingsOpen.value = false
  }

  const openSettings = () => {
    isSettingsOpen.value = true
  }

  const closeSettings = () => {
    isSettingsOpen.value = false
  }

  return {
    consent: consentCookie,
    hasAnswered,
    isSettingsOpen,
    isConsentGiven,
    acceptAll,
    acceptNecessaryOnly,
    savePreferences,
    openSettings,
    closeSettings,
  }
}
