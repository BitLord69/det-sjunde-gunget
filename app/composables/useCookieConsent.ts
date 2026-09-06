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

const STORAGE_KEY = 'gunget_cookie_consent'

export function useCookieConsent() {
  const consentCookie = useCookie<CookieConsentPreferences>(STORAGE_KEY, {
    default: () => ({ ...DEFAULT_CONSENT }),
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    path: '/',
  })

  // Synchronize state across all components in the app
  const consentState = useState<CookieConsentPreferences>('gunget_cookie_consent_shared', () => {
    return consentCookie.value ? { ...consentCookie.value } : { ...DEFAULT_CONSENT }
  })

  const isSettingsOpen = useState<boolean>('gunget_cookie_settings_open', () => false)

  // Resilient client-side synchronization with localStorage
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CookieConsentPreferences
        if (parsed && parsed.answered) {
          if (!consentState.value.answered) {
            consentState.value = parsed
          }
          if (!consentCookie.value?.answered) {
            consentCookie.value = parsed
          }
        }
      } else if (consentCookie.value?.answered) {
        // Sync cookie to localStorage if already present in cookie
        localStorage.setItem(STORAGE_KEY, JSON.stringify(consentCookie.value))
      }
    } catch {}
  }

  const isConsentGiven = (category: 'necessary' | 'media'): boolean => {
    if (category === 'necessary') return true
    return Boolean(consentState.value?.answered && consentState.value?.media)
  }

  const hasAnswered = computed(() => Boolean(consentState.value?.answered))

  const persist = (prefs: CookieConsentPreferences) => {
    consentState.value = prefs
    consentCookie.value = prefs
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      } catch {}
    }
  }

  const acceptAll = () => {
    persist({
      necessary: true,
      media: true,
      answered: true,
      updatedAt: Date.now(),
    })
    isSettingsOpen.value = false
  }

  const acceptNecessaryOnly = () => {
    persist({
      necessary: true,
      media: false,
      answered: true,
      updatedAt: Date.now(),
    })
    isSettingsOpen.value = false
  }

  const savePreferences = (mediaConsent: boolean) => {
    persist({
      necessary: true,
      media: mediaConsent,
      answered: true,
      updatedAt: Date.now(),
    })
    isSettingsOpen.value = false
  }

  const openSettings = () => {
    isSettingsOpen.value = true
  }

  const closeSettings = () => {
    isSettingsOpen.value = false
  }

  return {
    consent: consentState,
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
