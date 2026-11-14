import { desc, gte } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '../db/client'
import { analyticsEvents, gigs } from '../db/schema'
import { ensureAnalyticsTable } from './analytics'

export const PAGE_LABELS: Record<string, string> = {
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

export const COUNTRY_NAMES: Record<string, string> = {
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

export const COUNTRY_NAMES_PLAIN: Record<string, string> = {
  SE: 'Sverige (SE)',
  DK: 'Danmark (DK)',
  NO: 'Norge (NO)',
  FI: 'Finland (FI)',
  DE: 'Tyskland (DE)',
  GB: 'Storbritannien (GB)',
  US: 'USA (US)',
  NL: 'Nederländerna (NL)',
  ES: 'Spanien (ES)',
  FR: 'Frankrike (FR)',
  PL: 'Polen (PL)',
}

export const RANGE_LABELS: Record<string, string> = {
  today: 'Senaste 24 timmarna',
  '7d': 'Senaste 7 dagarna',
  '30d': 'Senaste 30 dagarna',
  '90d': 'Senaste 90 dagarna',
  all: 'All tid',
}

export function getCountryLabel(code?: string | null): string {
  if (!code) return '🇸🇪 Sverige'
  const upper = code.toUpperCase()
  return COUNTRY_NAMES[upper] || `🌍 ${upper}`
}

export function getCountryPlainLabel(code?: string | null): string {
  if (!code) return 'Sverige (SE)'
  const upper = code.toUpperCase()
  return COUNTRY_NAMES_PLAIN[upper] || upper
}

export async function getAnalyticsDashboardData(rawRange: string = '7d') {
  await ensureAnalyticsTable()

  const validRanges = ['today', '7d', '30d', '90d', 'all']
  const rangeParam = validRanges.includes(rawRange) ? rawRange : '7d'

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  let periodDays = 7
  if (rangeParam === 'today') periodDays = 1
  else if (rangeParam === '7d') periodDays = 7
  else if (rangeParam === '30d') periodDays = 30
  else if (rangeParam === '90d') periodDays = 90
  else if (rangeParam === 'all') periodDays = 365

  const startMs = rangeParam === 'all' ? 0 : now - periodDays * dayMs
  const prevStartMs = rangeParam === 'all' ? 0 : startMs - periodDays * dayMs

  const allFetchedEvents = await db
    .select()
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, new Date(prevStartMs)))
    .orderBy(desc(analyticsEvents.createdAt))

  const allGigs = await db.select().from(gigs)
  const gigsByDate = new Map<string, Array<{ venue: string; city: string }>>()
  for (const g of allGigs) {
    const dStr = new Date(g.date).toISOString().slice(0, 10)
    const list = gigsByDate.get(dStr) || []
    list.push({ venue: g.venue, city: g.city })
    gigsByDate.set(dStr, list)
  }

  const currentEvents = allFetchedEvents.filter((e) => new Date(e.createdAt).getTime() >= startMs)
  const prevEvents =
    rangeParam === 'all'
      ? []
      : allFetchedEvents.filter((e) => {
          const ts = new Date(e.createdAt).getTime()
          return ts >= prevStartMs && ts < startMs
        })

  const fiveMinAgo = now - 5 * 60 * 1000
  const liveVisitorSet = new Set<string>()
  for (const e of allFetchedEvents) {
    if (new Date(e.createdAt).getTime() >= fiveMinAgo) {
      liveVisitorSet.add(e.visitorHash)
    }
  }

  const currentPageviews = currentEvents.filter((e) => e.eventType === 'pageview')
  const prevPageviews = prevEvents.filter((e) => e.eventType === 'pageview')

  const uniqueVisitorSet = new Set(currentEvents.map((e) => e.visitorHash))
  const prevUniqueVisitorSet = new Set(prevEvents.map((e) => e.visitorHash))

  const calcGrowth = (curr: number, prev: number): number | null => {
    if (rangeParam === 'all' || prev === 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }

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

  // Daily Timeline Series
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

  // Referrers & Campaigns
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

  // Locations
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

  // Band-specific Telemetry
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
}

export type AnalyticsDashboardData = Awaited<ReturnType<typeof getAnalyticsDashboardData>>

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateText(str: string, maxLen: number): string {
  const clean = String(str || '')
    // Strip flag/emoji symbols so librsvg on Linux never renders missing glyph boxes
    .replace(/\p{Extended_Pictographic}/gu, '')
    .trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen - 1)}…`
}

/**
 * Generates a crisp 1200x820 PNG visual dashboard card of the analytics data using SVG + Sharp
 */
export async function generateAnalyticsDashboardPng(data: AnalyticsDashboardData): Promise<Buffer> {
  const width = 1200
  const height = 820
  const rangeLabel = RANGE_LABELS[data.range] || 'Senaste 7 dagarna'
  const generatedAtStr = new Date().toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // KPI Card definitions
  const formatGrowth = (pct: number | null) => {
    if (pct === null || pct === undefined) return { text: 'Ingen föreg. period', color: '#8c7e6a' }
    if (pct >= 0) return { text: `+${pct}% mot föreg. period`, color: '#34d399' }
    return { text: `${pct}% mot föreg. period`, color: '#fb7185' }
  }

  const visGrowth = formatGrowth(data.summary.visitorsGrowthPct)
  const pvGrowth = formatGrowth(data.summary.pageviewsGrowthPct)

  const kpiCards = [
    {
      title: 'UNIKA BESÖKARE',
      value: String(data.summary.uniqueVisitors),
      sub: visGrowth.text,
      subColor: visGrowth.color,
      accent: '#e2bd72',
    },
    {
      title: 'SIDVISNINGAR',
      value: String(data.summary.pageviews),
      sub: pvGrowth.text,
      subColor: pvGrowth.color,
      accent: '#e2bd72',
    },
    {
      title: 'JUKEBOX & MUSIK',
      value: String(data.summary.jukeboxPlays),
      sub: `${data.summary.lyricsViews} låttextvisningar`,
      subColor: '#c8a96e',
      accent: '#f59e0b',
    },
    {
      title: 'GIG & BILJETTKLICK',
      value: String(data.summary.gigInteractions),
      sub: `${data.summary.merchClicks} merch • ${data.summary.videoPlays} videoklick`,
      subColor: '#c8a96e',
      accent: '#fb923c',
    },
    {
      title: 'ARRANGÖRSRADAR (EPK)',
      value: String(data.summary.epkInteractions),
      sub: 'Presskit & Tech Rider',
      subColor: '#34d399',
      accent: '#34d399',
    },
  ]

  const kpiSvg = kpiCards
    .map((card, idx) => {
      const cardW = 212
      const gap = 15
      const x = 40 + idx * (cardW + gap)
      const y = 115
      return `
        <g transform="translate(${x}, ${y})">
          <rect width="${cardW}" height="118" rx="16" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.28" stroke-width="1.5" />
          <rect x="0" y="0" width="${cardW}" height="4" rx="2" fill="${card.accent}" fill-opacity="0.85" />
          <text x="18" y="30" fill="#a89882" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" font-weight="bold" letter-spacing="1">${escapeXml(card.title)}</text>
          <text x="18" y="76" fill="#f7eedc" font-family="DejaVu Sans, Arial, sans-serif" font-size="36" font-weight="bold">${escapeXml(card.value)}</text>
          <text x="18" y="102" fill="${card.subColor}" font-family="DejaVu Sans, Arial, sans-serif" font-size="11.5" font-weight="bold">${escapeXml(card.sub)}</text>
        </g>
      `
    })
    .join('\n')

  // Daily Bar Chart (up to 30 bars, or 7 bars for 7d)
  const series = data.dailySeries.slice(-30)
  const chartX = 40
  const chartY = 252
  const chartW = 1120
  const chartH = 235
  const plotLeft = chartX + 48
  const plotRight = chartX + chartW - 24
  const plotTop = chartY + 54
  const plotBottom = chartY + chartH - 34
  const plotW = plotRight - plotLeft
  const plotH = plotBottom - plotTop

  const maxVal = Math.max(5, ...series.map((d) => Math.max(d.pageviews, d.uniqueVisitors)))

  // Horizontal grid lines
  const gridSteps = [0, 0.25, 0.5, 0.75, 1]
  const gridSvg = gridSteps
    .map((step) => {
      const gy = Math.round(plotBottom - step * plotH)
      const labelVal = Math.round(step * maxVal)
      return `
        <line x1="${plotLeft}" y1="${gy}" x2="${plotRight}" y2="${gy}" stroke="#e2bd72" stroke-opacity="0.12" stroke-dasharray="4 4" />
        <text x="${plotLeft - 10}" y="${gy + 4}" fill="#8c7e6a" font-family="DejaVu Sans, Arial, sans-serif" font-size="10" text-anchor="end">${labelVal}</text>
      `
    })
    .join('\n')

  const slotW = series.length > 0 ? plotW / series.length : plotW
  const barPairW = Math.min(48, Math.max(8, slotW * 0.62))
  const singleBarW = Math.max(3, (barPairW - 3) / 2)

  const barsSvg = series
    .map((item, idx) => {
      const centerX = plotLeft + idx * slotW + slotW / 2
      const pvH = Math.max(2, Math.round((item.pageviews / maxVal) * plotH))
      const uvH = Math.max(2, Math.round((item.uniqueVisitors / maxVal) * plotH))
      const pvX = Math.round(centerX - singleBarW - 1.5)
      const uvX = Math.round(centerX + 1.5)
      const pvY = plotBottom - pvH
      const uvY = plotBottom - uvH

      const showLabel = series.length <= 14 || idx % Math.ceil(series.length / 12) === 0 || idx === series.length - 1
      const hasGig = item.gigsOnDay && item.gigsOnDay.length > 0

      return `
        <g>
          ${hasGig ? `<circle cx="${Math.round(centerX)}" cy="${plotTop - 10}" r="5" fill="#f59e0b" />` : ''}
          <rect x="${pvX}" y="${pvY}" width="${Math.round(singleBarW)}" height="${pvH}" rx="3" fill="#e2bd72" />
          <rect x="${uvX}" y="${uvY}" width="${Math.round(singleBarW)}" height="${uvH}" rx="3" fill="#b4692c" />
          ${
            series.length <= 10 && item.pageviews > 0
              ? `<text x="${Math.round(pvX + singleBarW / 2)}" y="${pvY - 5}" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${item.pageviews}</text>`
              : ''
          }
          ${
            showLabel
              ? `<text x="${Math.round(centerX)}" y="${plotBottom + 18}" fill="#a89882" font-family="DejaVu Sans, Arial, sans-serif" font-size="10.5" text-anchor="middle">${escapeXml(item.label)}</text>`
              : ''
          }
        </g>
      `
    })
    .join('\n')

  // Bottom 3 Panels (y = 505, height = 275)
  const panelY = 505
  const panelH = 275
  const panelW = 360

  // Panel 1: Top Pages
  const topPagesSlice = data.topPages.slice(0, 5)
  const topPagesRows =
    topPagesSlice.length > 0
      ? topPagesSlice
          .map((p, i) => {
            const ry = panelY + 66 + i * 41
            const barW = Math.max(6, Math.round((p.pct / 100) * 210))
            return `
              <g transform="translate(58, ${ry})">
                <text x="0" y="13" fill="#f7eedc" font-family="DejaVu Sans, Arial, sans-serif" font-size="12.5" font-weight="bold">${escapeXml(truncateText(p.label, 27))}</text>
                <text x="324" y="13" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="end">${p.views} (${p.pct}%)</text>
                <rect x="0" y="21" width="324" height="6" rx="3" fill="#2a2119" />
                <rect x="0" y="21" width="${barW}" height="6" rx="3" fill="#e2bd72" />
              </g>
            `
          })
          .join('\n')
      : `<text x="58" y="${panelY + 95}" fill="#8c7e6a" font-family="DejaVu Sans, Arial, sans-serif" font-size="13">Inga sidvisningar under perioden</text>`

  // Panel 2: Top Songs & Jukebox
  const topSongsSlice = data.bandTelemetry.topSongs.slice(0, 5)
  const topSongsRows =
    topSongsSlice.length > 0
      ? topSongsSlice
          .map((s, i) => {
            const ry = panelY + 66 + i * 41
            return `
              <g transform="translate(438, ${ry})">
                <rect x="0" y="0" width="24" height="24" rx="6" fill="#2a2119" stroke="#e2bd72" stroke-opacity="0.3" />
                <text x="12" y="16" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${i + 1}</text>
                <text x="34" y="16" fill="#f7eedc" font-family="DejaVu Sans, Arial, sans-serif" font-size="12.5" font-weight="bold">${escapeXml(truncateText(s.title, 24))}</text>
                <text x="324" y="16" fill="#f59e0b" font-family="DejaVu Sans, Arial, sans-serif" font-size="11.5" font-weight="bold" text-anchor="end">${s.plays} speln. • ${s.lyricsViews} text</text>
              </g>
            `
          })
          .join('\n')
      : `<text x="438" y="${panelY + 95}" fill="#8c7e6a" font-family="DejaVu Sans, Arial, sans-serif" font-size="13">Inga låtspelningar registrerade ännu</text>`

  // Panel 3: Traffic Sources & Locations
  const topRefsSlice = data.referrers.slice(0, 3)
  const topCitiesSlice = data.locations.cities.slice(0, 2)
  const refRows =
    topRefsSlice.length > 0
      ? topRefsSlice
          .map((r, i) => {
            const ry = panelY + 66 + i * 34
            return `
              <g transform="translate(818, ${ry})">
                <text x="0" y="14" fill="#f7eedc" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold">${escapeXml(truncateText(r.source, 26))}</text>
                <text x="324" y="14" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="end">${r.count} (${r.pct}%)</text>
              </g>
            `
          })
          .join('\n')
      : `<text x="818" y="${panelY + 85}" fill="#8c7e6a" font-family="DejaVu Sans, Arial, sans-serif" font-size="12">Ingen trafikdata</text>`

  const cityRows =
    topCitiesSlice.length > 0
      ? topCitiesSlice
          .map((c, i) => {
            const ry = panelY + 198 + i * 32
            const cleanCity = truncateText(c.city, 22)
            return `
              <g transform="translate(818, ${ry})">
                <text x="0" y="14" fill="#d6c7b2" font-family="DejaVu Sans, Arial, sans-serif" font-size="12">${escapeXml(cleanCity)} (${escapeXml(c.country)})</text>
                <text x="324" y="14" fill="#34d399" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="end">${c.count} (${c.pct}%)</text>
              </g>
            `
          })
          .join('\n')
      : `<text x="818" y="${panelY + 215}" fill="#8c7e6a" font-family="DejaVu Sans, Arial, sans-serif" font-size="12">Ingen ortsdata</text>`

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#120e0a" />
      <stop offset="50%" stop-color="#17120d" />
      <stop offset="100%" stop-color="#0f0b08" />
    </linearGradient>
    <linearGradient id="goldHeader" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e2bd72" />
      <stop offset="100%" stop-color="#c87f3f" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="24" fill="none" stroke="#e2bd72" stroke-opacity="0.22" stroke-width="1.5" />

  <!-- Top Header -->
  <g transform="translate(40, 42)">
    <rect x="0" y="0" width="180" height="24" rx="12" fill="#e2bd72" fill-opacity="0.15" stroke="#e2bd72" stroke-opacity="0.4" />
    <text x="90" y="16" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="10.5" font-weight="bold" text-anchor="middle" letter-spacing="1.2">DET 7:E GUNGET • TELEMETRI</text>
    <text x="0" y="54" fill="#f7eedc" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="bold">Besöksstatistik &amp; Publikpuls</text>

    <!-- Period Badge on Right -->
    <g transform="translate(820, 8)">
      <rect x="0" y="0" width="300" height="48" rx="14" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.35" />
      <text x="150" y="21" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Period: ${escapeXml(rangeLabel)}</text>
      <text x="150" y="38" fill="#8c7e6a" font-family="DejaVu Sans, Arial, sans-serif" font-size="10.5" text-anchor="middle">Rapport skapad ${escapeXml(generatedAtStr)}</text>
    </g>
  </g>

  <!-- Row 1: 5 KPI Cards -->
  ${kpiSvg}

  <!-- Row 2: Daily Timeline Chart -->
  <g>
    <rect x="${chartX}" y="${chartY}" width="${chartW}" height="${chartH}" rx="18" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.25" stroke-width="1.5" />
    <text x="${chartX + 24}" y="${chartY + 30}" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="bold">DAGLIG TRAFIKUTVECKLING</text>

    <!-- Legend -->
    <g transform="translate(${chartX + chartW - 330}, ${chartY + 18})">
      <rect x="0" y="2" width="12" height="12" rx="3" fill="#e2bd72" />
      <text x="18" y="12" fill="#d6c7b2" font-family="DejaVu Sans, Arial, sans-serif" font-size="11.5">Sidvisningar</text>
      <rect x="115" y="2" width="12" height="12" rx="3" fill="#b4692c" />
      <text x="133" y="12" fill="#d6c7b2" font-family="DejaVu Sans, Arial, sans-serif" font-size="11.5">Unika besökare</text>
      <circle cx="248" cy="8" r="5" fill="#f59e0b" />
      <text x="258" y="12" fill="#d6c7b2" font-family="DejaVu Sans, Arial, sans-serif" font-size="11.5">Speldag</text>
    </g>

    ${gridSvg}
    ${barsSvg}
  </g>

  <!-- Row 3: 3 Detail Panels -->
  <!-- Panel 1: Top Pages -->
  <rect x="40" y="${panelY}" width="${panelW}" height="${panelH}" rx="18" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.25" stroke-width="1.5" />
  <text x="58" y="${panelY + 32}" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="13.5" font-weight="bold" letter-spacing="0.8">POPULÄRASTE SIDORNA</text>
  <line x1="58" y1="${panelY + 44}" x2="382" y2="${panelY + 44}" stroke="#e2bd72" stroke-opacity="0.15" />
  ${topPagesRows}

  <!-- Panel 2: Top Songs -->
  <rect x="420" y="${panelY}" width="${panelW}" height="${panelH}" rx="18" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.25" stroke-width="1.5" />
  <text x="438" y="${panelY + 32}" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="13.5" font-weight="bold" letter-spacing="0.8">TOPPLÅTAR I JUKEBOX &amp; TEXT</text>
  <line x1="438" y1="${panelY + 44}" x2="762" y2="${panelY + 44}" stroke="#e2bd72" stroke-opacity="0.15" />
  ${topSongsRows}

  <!-- Panel 3: Referrers & Cities -->
  <rect x="800" y="${panelY}" width="${panelW}" height="${panelH}" rx="18" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.25" stroke-width="1.5" />
  <text x="818" y="${panelY + 32}" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="13.5" font-weight="bold" letter-spacing="0.8">TRAFIKKÄLLOR &amp; ORTER</text>
  <line x1="818" y1="${panelY + 44}" x2="1142" y2="${panelY + 44}" stroke="#e2bd72" stroke-opacity="0.15" />
  ${refRows}
  <text x="818" y="${panelY + 180}" fill="#e2bd72" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.8">TOPP-ORTER / LÄNDER</text>
  <line x1="818" y1="${panelY + 188}" x2="1142" y2="${panelY + 188}" stroke="#e2bd72" stroke-opacity="0.15" />
  ${cityRows}
</svg>`

  return sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer()
}
