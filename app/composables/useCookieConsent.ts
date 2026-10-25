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
  const isProd = process.env.NODE_ENV === 'production'

  const consentCookie = useCookie<CookieConsentPreferences>(STORAGE_KEY, {
    default: () => ({ ...DEFAULT_CONSENT }),
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  })

  // Synchronize state across all components in the app
  const consentState = useState<CookieConsentPreferences>('gunget_cookie_consent_shared', () => {
    return consentCookie.value?.answered ? { ...consentCookie.value } : { ...DEFAULT_CONSENT }
  })

  const isSettingsOpen = useState<boolean>('gunget_cookie_settings_open', () => false)

  // Resilient client-side synchronization with localStorage and document.cookie
  if (import.meta.client) {
    try {
      // 1. Check localStorage first
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CookieConsentPreferences
        if (parsed && parsed.answered) {
          consentState.value = parsed
          if (!consentCookie.value?.answered) {
            consentCookie.value = parsed
          }
        }
      } else if (consentCookie.value?.answered) {
        // Sync cookie to localStorage
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
        // Explicitly write document.cookie with shared root domain for www & apex
        const json = encodeURIComponent(JSON.stringify(prefs))
        const maxAge = 60 * 60 * 24 * 365
        const host = window.location.hostname
        const domainStr = host.includes('detsjundegunget.se')
          ? '; domain=.detsjundegunget.se'
          : host.includes('sjundegunget.se')
            ? '; domain=.sjundegunget.se'
            : ''
        const secureStr = window.location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `${STORAGE_KEY}=${json}; path=/; max-age=${maxAge}; SameSite=Lax${domainStr}${secureStr}`
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
