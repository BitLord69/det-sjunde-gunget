export type PublicAnalyticsEventType =
  | 'pageview'
  | 'jukebox_play'
  | 'lyrics_view'
  | 'gig_ticket_click'
  | 'gig_calendar_export'
  | 'gig_poster_view'
  | 'epk_zip_download'
  | 'epk_rider_download'
  | 'epk_copy_bio'
  | 'merch_click'
  | 'video_play'
  | 'easter_egg_harp'

export function usePublicAnalytics() {
  const route = useRoute()

  const trackPublicEvent = (
    eventType: PublicAnalyticsEventType,
    options?: {
      path?: string
      targetId?: string | null
      targetLabel?: string | null
      referrer?: string | null
      campaign?: string | null
    },
  ) => {
    if (!import.meta.client) return

    const currentPath = options?.path || route.path || window.location.pathname || '/'
    if (
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/en/admin')
    ) {
      return
    }

    const locale = currentPath === '/en' || currentPath.startsWith('/en/') ? 'en' : 'sv'
    const queryRef =
      options?.campaign ||
      (typeof route.query.ref === 'string' ? route.query.ref : null) ||
      (typeof route.query.utm_source === 'string' ? route.query.utm_source : null) ||
      null

    const payload = {
      eventType,
      path: currentPath,
      referrer: options?.referrer !== undefined ? options.referrer : (document.referrer || null),
      campaign: queryRef,
      locale,
      targetId: options?.targetId || null,
      targetLabel: options?.targetLabel || null,
    }

    // Fire-and-forget non-blocking request
    $fetch('/api/analytics/track', {
      method: 'POST',
      body: payload,
    }).catch(() => {
      // Ignore analytics network errors silently
    })
  }

  const trackEvent = (
    eventType: PublicAnalyticsEventType,
    targetLabel?: string | null,
    targetId?: string | null,
  ) => {
    trackPublicEvent(eventType, { targetLabel, targetId })
  }

  return {
    trackPublicEvent,
    trackEvent,
  }
}

