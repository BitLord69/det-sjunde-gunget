import { desc, gte } from 'drizzle-orm'
import { getQuery, setHeader } from 'h3'
import { db } from '../../db/client'
import { analyticsEvents, gigs } from '../../db/schema'
import { ensureAnalyticsTable } from '../../utils/analytics'
import { requireAdminAuth } from '../../utils/auth'

const PAGE_LABELS: Record<string, string> = {
  '/': 'Hem (Startsidan)',
  '/music': 'Jukebox & Musik',
  '/gigs': 'Spelningar & Biljettluckan',
  '/about': 'Om Bandet',
  '/gallery': 'Fotogalleri',
  '/videos': 'Videor & Liveklipp',
  '/lyrics': 'Låttexter & Sångbok',
  '/fancentral': 'Fan Central (Korktavlan)',
  '/epk': 'Presskit & Tech Rider (EPK)',
  '/contact': 'Kontakt & Bokning',
  '/privacy': 'Integritet & Kakor',
}

const COUNTRY_NAMES: Record<string, string> = {
  SE: '🇸🇪 Sverige',
  DK: '🇩🇰 Danmark',
  NO: '🇳🇴 Norge',
  FI: '🇫🇮 Finland',
  DE: '🇩🇪 Tyskland',
  GB: '🇬🇧 Storbritannien',
  US: '🇺🇸 USA',
  NL: '🇳🇱 Nederländerna',
  ES: '🇪🇸 Spanien',
  FR: '🇫🇷 Frankrike',
  PL: '🇵🇱 Polen',
}

function getCountryLabel(code?: string | null): string {
  if (!code) return '🇸🇪 Sverige'
  const upper = code.toUpperCase()
  return COUNTRY_NAMES[upper] || `🌍 ${upper}`
}

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')

  await ensureAnalyticsTable()

  const query = getQuery(event)
  const rangeParam = String(query.range || '30d')

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  let periodDays = 30
  if (rangeParam === 'today') periodDays = 1
  else if (rangeParam === '7d') periodDays = 7
  else if (rangeParam === '30d') periodDays = 30
  else if (rangeParam === '90d') periodDays = 90
  else if (rangeParam === 'all') periodDays = 365

  const startMs = rangeParam === 'all' ? 0 : now - periodDays * dayMs
  const prevStartMs = rangeParam === 'all' ? 0 : startMs - periodDays * dayMs

  // Fetch events from prevStartMs onwards (so we can calculate both current period and previous period growth)
  const allFetchedEvents = await db
    .select()
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, new Date(prevStartMs)))
    .orderBy(desc(analyticsEvents.createdAt))

  // Fetch all gigs so we can annotate the timeline chart with concert dates
  const allGigs = await db.select().from(gigs)
  const gigsByDate = new Map<string, Array<{ venue: string; city: string }>>()
  for (const g of allGigs) {
    const dStr = new Date(g.date).toISOString().slice(0, 10)
    const list = gigsByDate.get(dStr) || []
    list.push({ venue: g.venue, city: g.city })
    gigsByDate.set(dStr, list)
  }

  // Split into current period vs previous comparison period
  const currentEvents = allFetchedEvents.filter((e) => new Date(e.createdAt).getTime() >= startMs)
  const prevEvents =
    rangeParam === 'all'
      ? []
      : allFetchedEvents.filter((e) => {
          const ts = new Date(e.createdAt).getTime()
          return ts >= prevStartMs && ts < startMs
        })

  // Live visitors active in the last 5 minutes
  const fiveMinAgo = now - 5 * 60 * 1000
  const liveVisitorSet = new Set<string>()
  for (const e of allFetchedEvents) {
    if (new Date(e.createdAt).getTime() >= fiveMinAgo) {
      liveVisitorSet.add(e.visitorHash)
    }
  }

  // Current vs Previous Pageviews & Unique Visitors
  const currentPageviews = currentEvents.filter((e) => e.eventType === 'pageview')
  const prevPageviews = prevEvents.filter((e) => e.eventType === 'pageview')

  const uniqueVisitorSet = new Set(currentEvents.map((e) => e.visitorHash))
  const prevUniqueVisitorSet = new Set(prevEvents.map((e) => e.visitorHash))

  const calcGrowth = (curr: number, prev: number): number | null => {
    if (rangeParam === 'all' || prev === 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }

  // Count interaction categories
  let jukeboxPlays = 0
  let lyricsViews = 0
  let gigInteractions = 0
  let epkInteractions = 0
  let merchClicks = 0
  let videoPlays = 0
  let easterEggTriggers = 0

  for (const e of currentEvents) {
    switch (e.eventType) {
      case 'jukebox_play':
        jukeboxPlays++
        break
      case 'lyrics_view':
        lyricsViews++
        break
      case 'gig_ticket_click':
      case 'gig_calendar_export':
      case 'gig_poster_view':
        gigInteractions++
        break
      case 'epk_zip_download':
      case 'epk_rider_download':
      case 'epk_copy_bio':
        epkInteractions++
        break
      case 'merch_click':
        merchClicks++
        break
      case 'video_play':
        videoPlays++
        break
      case 'easter_egg_harp':
        easterEggTriggers++
        break
    }
  }

  // Build Daily Timeline Series
  const chartDays = rangeParam === 'today' ? 1 : rangeParam === '7d' ? 7 : rangeParam === '90d' ? 90 : 30
  const dailyMap = new Map<
    string,
    { pageviews: number; visitors: Set<string>; jukeboxPlays: number; epkDownloads: number }
  >()

  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, { pageviews: 0, visitors: new Set(), jukeboxPlays: 0, epkDownloads: 0 })
  }

  for (const e of currentEvents) {
    const key = new Date(e.createdAt).toISOString().slice(0, 10)
    const bucket = dailyMap.get(key)
    if (!bucket) continue
    bucket.visitors.add(e.visitorHash)
    if (e.eventType === 'pageview') bucket.pageviews++
    if (e.eventType === 'jukebox_play') bucket.jukeboxPlays++
    if (e.eventType.startsWith('epk_')) bucket.epkDownloads++
  }

  const dailySeries = Array.from(dailyMap.entries()).map(([dateKey, data]) => {
    const dObj = new Date(`${dateKey}T12:00:00Z`)
    const label = dObj.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    return {
      date: dateKey,
      label,
      pageviews: data.pageviews,
      uniqueVisitors: data.visitors.size,
      jukeboxPlays: data.jukeboxPlays,
      epkDownloads: data.epkDownloads,
      gigsOnDay: gigsByDate.get(dateKey) || [],
    }
  })

  // Top Pages
  const pageStatsMap = new Map<string, { views: number; visitors: Set<string> }>()
  for (const e of currentPageviews) {
    const p = e.path || '/'
    let st = pageStatsMap.get(p)
    if (!st) {
      st = { views: 0, visitors: new Set() }
      pageStatsMap.set(p, st)
    }
    st.views++
    st.visitors.add(e.visitorHash)
  }
  const totalPageviewsCount = Math.max(1, currentPageviews.length)
  const topPages = Array.from(pageStatsMap.entries())
    .map(([path, st]) => ({
      path,
      label: PAGE_LABELS[path] || path,
      views: st.views,
      uniqueVisitors: st.visitors.size,
      pct: Math.round((st.views / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Referrers / Traffic Sources (per unique visitor session or pageview)
  const refMap = new Map<string, number>()
  const campaignMap = new Map<string, number>()
  for (const e of currentPageviews) {
    const ref = e.referrer || 'Direkt / Bokmärke'
    refMap.set(ref, (refMap.get(ref) || 0) + 1)
    if (e.campaign) {
      campaignMap.set(e.campaign, (campaignMap.get(e.campaign) || 0) + 1)
    }
  }
  const referrers = Array.from(refMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const campaigns = Array.from(campaignMap.entries())
    .map(([campaign, count]) => ({
      campaign,
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Locations (Cities & Countries)
  const cityMap = new Map<string, { city: string; country: string; count: number }>()
  const countryMap = new Map<string, number>()
  for (const e of currentPageviews) {
    const cCode = (e.country || 'SE').toUpperCase()
    countryMap.set(cCode, (countryMap.get(cCode) || 0) + 1)
    const cityName = e.city?.trim() || (cCode === 'SE' ? 'Sverige (ospecificerad ort)' : getCountryLabel(cCode))
    const cityKey = `${cityName}|${cCode}`
    const existing = cityMap.get(cityKey)
    if (existing) {
      existing.count++
    } else {
      cityMap.set(cityKey, { city: cityName, country: cCode, count: 1 })
    }
  }

  const cities = Array.from(cityMap.values())
    .map((item) => ({
      ...item,
      countryLabel: getCountryLabel(item.country),
      pct: Math.round((item.count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const countries = Array.from(countryMap.entries())
    .map(([code, count]) => ({
      code,
      label: getCountryLabel(code),
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Devices, OS, Browsers & Locales
  const deviceMap = new Map<string, number>()
  const osMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  const localeMap = new Map<string, number>()

  for (const e of currentPageviews) {
    const dt = e.deviceType || 'desktop'
    deviceMap.set(dt, (deviceMap.get(dt) || 0) + 1)
    const osName = e.os || 'Övrigt'
    osMap.set(osName, (osMap.get(osName) || 0) + 1)
    const brName = e.browser || 'Övrigt'
    browserMap.set(brName, (browserMap.get(brName) || 0) + 1)
    const loc = e.locale === 'en' ? 'en' : 'sv'
    localeMap.set(loc, (localeMap.get(loc) || 0) + 1)
  }

  const DEVICE_LABELS: Record<string, string> = {
    mobile: '📱 Mobiltelefon',
    desktop: '💻 Dator / Desktop',
    tablet: '📟 Surfplatta',
  }

  const deviceTypes = Array.from(deviceMap.entries())
    .map(([type, count]) => ({
      type,
      label: DEVICE_LABELS[type] || type,
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const osList = Array.from(osMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const browsers = Array.from(browserMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const locales = Array.from(localeMap.entries())
    .map(([locale, count]) => ({
      locale,
      label: locale === 'en' ? '🇬🇧 Engelska (EN)' : '🇸🇪 Svenska (SV)',
      count,
      pct: Math.round((count / totalPageviewsCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Band-specific Telemetry: Songs, Gigs, Merch, Videos & Organizer Radar (EPK)
  const songTelemetryMap = new Map<string, { id: string; title: string; plays: number; lyricsViews: number }>()
  const gigTelemetryMap = new Map<
    string,
    { id: string; label: string; ticketClicks: number; calendarExports: number; posterViews: number }
  >()
  const merchTelemetryMap = new Map<string, { id: string; label: string; clicks: number }>()
  const videoTelemetryMap = new Map<string, { id: string; label: string; plays: number }>()
  const organizerRadar: Array<{
    id: string
    eventType: string
    label: string
    city: string
    country: string
    deviceType: string
    createdAt: Date | number
  }> = []

  for (const e of currentEvents) {
    if (e.eventType === 'jukebox_play' || e.eventType === 'lyrics_view') {
      const key = (e.targetLabel || e.targetId || 'Okänd låt').trim()
      const existing = songTelemetryMap.get(key) || {
        id: e.targetId || key,
        title: e.targetLabel || key,
        plays: 0,
        lyricsViews: 0,
      }
      if (e.eventType === 'jukebox_play') existing.plays++
      if (e.eventType === 'lyrics_view') existing.lyricsViews++
      songTelemetryMap.set(key, existing)
    } else if (
      e.eventType === 'gig_ticket_click' ||
      e.eventType === 'gig_calendar_export' ||
      e.eventType === 'gig_poster_view'
    ) {
      const key = (e.targetId || e.targetLabel || 'Gig').trim()
      const existing = gigTelemetryMap.get(key) || {
        id: key,
        label: e.targetLabel || key,
        ticketClicks: 0,
        calendarExports: 0,
        posterViews: 0,
      }
      if (e.eventType === 'gig_ticket_click') existing.ticketClicks++
      if (e.eventType === 'gig_calendar_export') existing.calendarExports++
      if (e.eventType === 'gig_poster_view') existing.posterViews++
      gigTelemetryMap.set(key, existing)
    } else if (e.eventType === 'merch_click') {
      const key = (e.targetLabel || e.targetId || 'Merch').trim()
      const existing = merchTelemetryMap.get(key) || {
        id: e.targetId || key,
        label: e.targetLabel || key,
        clicks: 0,
      }
      existing.clicks++
      merchTelemetryMap.set(key, existing)
    } else if (e.eventType === 'video_play') {
      const key = (e.targetLabel || e.targetId || 'Video').trim()
      const existing = videoTelemetryMap.get(key) || {
        id: e.targetId || key,
        label: e.targetLabel || key,
        plays: 0,
      }
      existing.plays++
      videoTelemetryMap.set(key, existing)
    } else if (e.eventType.startsWith('epk_')) {
      if (organizerRadar.length < 25) {
        organizerRadar.push({
          id: e.id,
          eventType: e.eventType,
          label:
            e.targetLabel ||
            (e.eventType === 'epk_zip_download'
              ? 'Komplett Presskit (.zip)'
              : e.eventType === 'epk_rider_download'
                ? 'Tech Rider / Dokument'
                : 'Kopierad Presstext'),
          city: e.city || 'Sverige',
          country: getCountryLabel(e.country),
          deviceType: e.deviceType || 'desktop',
          createdAt: e.createdAt,
        })
      }
    }
  }

  const topSongs = Array.from(songTelemetryMap.values())
    .map((s) => ({ ...s, total: s.plays + s.lyricsViews }))
    .sort((a, b) => b.plays - a.plays || b.total - a.total)
    .slice(0, 8)

  const topGigs = Array.from(gigTelemetryMap.values())
    .map((g) => ({ ...g, total: g.ticketClicks + g.calendarExports + g.posterViews }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const topMerch = Array.from(merchTelemetryMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6)

  const topVideos = Array.from(videoTelemetryMap.values())
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6)

  return {
    range: rangeParam,
    summary: {
      liveVisitorsNow: liveVisitorSet.size,
      uniqueVisitors: uniqueVisitorSet.size,
      prevUniqueVisitors: prevUniqueVisitorSet.size,
      visitorsGrowthPct: calcGrowth(uniqueVisitorSet.size, prevUniqueVisitorSet.size),
      pageviews: currentPageviews.length,
      prevPageviews: prevPageviews.length,
      pageviewsGrowthPct: calcGrowth(currentPageviews.length, prevPageviews.length),
      jukeboxPlays,
      lyricsViews,
      gigInteractions,
      epkInteractions,
      merchClicks,
      videoPlays,
      easterEggTriggers,
    },
    dailySeries,
    topPages,
    referrers,
    campaigns,
    locations: {
      cities,
      countries,
    },
    devices: {
      deviceTypes,
      os: osList,
      browsers,
      locales,
    },
    bandTelemetry: {
      topSongs,
      topGigs,
      topMerch,
      topVideos,
      organizerRadar,
    },
  }
})

