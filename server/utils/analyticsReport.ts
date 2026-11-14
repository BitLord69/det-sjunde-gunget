import { desc, gte } from 'drizzle-orm'
import opentype from 'opentype.js'
import sharp from 'sharp'
import { db } from '../db/client'
import { analyticsEvents, gigs } from '../db/schema'
import { ensureAnalyticsTable } from './analytics'
import { DASHBOARD_FONT_BOLD_BASE64, DASHBOARD_FONT_MEDIUM_BASE64 } from './dashboardFontData'

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

let cachedMediumFont: opentype.Font | null = null
let cachedBoldFont: opentype.Font | null = null

function getDashboardFonts(): { medium: opentype.Font; bold: opentype.Font } {
  if (!cachedMediumFont) {
    const buf = Buffer.from(DASHBOARD_FONT_MEDIUM_BASE64, 'base64')
    const parsed = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
    delete (parsed.tables as Record<string, unknown>).gsub
    cachedMediumFont = parsed
  }
  if (!cachedBoldFont) {
    const buf = Buffer.from(DASHBOARD_FONT_BOLD_BASE64, 'base64')
    const parsed = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
    delete (parsed.tables as Record<string, unknown>).gsub
    cachedBoldFont = parsed
  }
  return { medium: cachedMediumFont, bold: cachedBoldFont }
}

function sanitizeText(str: string): string {
  return String(str || '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F1E6}-\u{1F1FF}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface VectorTextOptions {
  x: number
  y: number
  size: number
  fill: string
  weight?: 'medium' | 'bold'
  align?: 'left' | 'center' | 'right'
  letterSpacing?: number
  maxWidth?: number
  opacity?: number
}

function commandsToSvgPath(commands: opentype.PathCommand[]): string {
  const parts: string[] = []
  const r = (n: number) => Number(n.toFixed(2))
  for (const cmd of commands) {
    if (cmd.type === 'M') {
      parts.push(`M${r(cmd.x)} ${r(cmd.y)}`)
    } else if (cmd.type === 'L') {
      parts.push(`L${r(cmd.x)} ${r(cmd.y)}`)
    } else if (cmd.type === 'C') {
      parts.push(`C${r(cmd.x1)} ${r(cmd.y1)} ${r(cmd.x2)} ${r(cmd.y2)} ${r(cmd.x)} ${r(cmd.y)}`)
    } else if (cmd.type === 'Q') {
      parts.push(`Q${r(cmd.x1)} ${r(cmd.y1)} ${r(cmd.x)} ${r(cmd.y)}`)
    } else if (cmd.type === 'Z') {
      parts.push('Z')
    }
  }
  return parts.join('')
}

/**
 * Converts text into an exact SVG <path> using embedded OpenType fonts.
 * Works identically on Windows, macOS, and Vercel Linux serverless with zero OS font dependencies.
 */
function renderVectorText(rawText: string, opts: VectorTextOptions): string {
  const { medium, bold } = getDashboardFonts()
  const font = opts.weight === 'bold' ? bold : medium
  const size = opts.size
  const letterSpacing = opts.letterSpacing ?? 0

  let text = sanitizeText(rawText)
  if (!text) return ''

  const measureWidth = (s: string): number => {
    if (!s) return 0
    const baseW = font.getAdvanceWidth(s, size)
    const extraTracking = letterSpacing > 0 ? Math.max(0, s.length - 1) * letterSpacing : 0
    return baseW + extraTracking
  }

  if (opts.maxWidth && measureWidth(text) > opts.maxWidth) {
    let trimmed = text
    while (trimmed.length > 1 && measureWidth(`${trimmed}...`) > opts.maxWidth) {
      trimmed = trimmed.slice(0, -1).trimEnd()
    }
    text = `${trimmed}...`
  }

  const totalW = measureWidth(text)
  let startX = opts.x
  if (opts.align === 'center') {
    startX = opts.x - totalW / 2
  } else if (opts.align === 'right') {
    startX = opts.x - totalW
  }

  let pathData = ''
  if (letterSpacing > 0) {
    let cursorX = startX
    for (const ch of text) {
      const chPath = commandsToSvgPath(font.getPath(ch, cursorX, opts.y, size).commands)
      if (chPath) pathData += `${chPath} `
      cursorX += font.getAdvanceWidth(ch, size) + letterSpacing
    }
  } else {
    pathData = commandsToSvgPath(font.getPath(text, startX, opts.y, size).commands)
  }

  if (!pathData.trim()) return ''
  const opacityAttr = opts.opacity !== undefined ? ` fill-opacity="${opts.opacity}"` : ''
  return `<path d="${pathData.trim()}" fill="${opts.fill}"${opacityAttr} />`
}

/**
 * Generates a crisp 1400x940 PNG visual dashboard card of the analytics data using vector SVG paths + Sharp
 */
export async function generateAnalyticsDashboardPng(data: AnalyticsDashboardData): Promise<Buffer> {
  const width = 1400
  const height = 940
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
    if (pct === null || pct === undefined) {
      return { text: 'Ingen föreg. period', color: '#a89882', pillBg: '#272018' }
    }
    if (pct >= 0) {
      return { text: `+${pct}% mot föreg. period`, color: '#34d399', pillBg: '#0f2920' }
    }
    return { text: `${pct}% mot föreg. period`, color: '#fb7185', pillBg: '#2c1419' }
  }

  const visGrowth = formatGrowth(data.summary.visitorsGrowthPct)
  const pvGrowth = formatGrowth(data.summary.pageviewsGrowthPct)

  const kpiCards = [
    {
      title: 'UNIKA BESÖKARE',
      value: String(data.summary.uniqueVisitors),
      sub: visGrowth.text,
      subColor: visGrowth.color,
      pillBg: visGrowth.pillBg,
      accent: '#e2bd72',
    },
    {
      title: 'SIDVISNINGAR',
      value: String(data.summary.pageviews),
      sub: pvGrowth.text,
      subColor: pvGrowth.color,
      pillBg: pvGrowth.pillBg,
      accent: '#e2bd72',
    },
    {
      title: 'JUKEBOX & MUSIK',
      value: String(data.summary.jukeboxPlays),
      sub: `${data.summary.lyricsViews} låttextvisningar`,
      subColor: '#fbbf24',
      pillBg: '#2b2012',
      accent: '#f59e0b',
    },
    {
      title: 'GIG & BILJETTKLICK',
      value: String(data.summary.gigInteractions),
      sub: `${data.summary.merchClicks} merch • ${data.summary.videoPlays} videor`,
      subColor: '#fdba74',
      pillBg: '#2b1c12',
      accent: '#fb923c',
    },
    {
      title: 'ARRANGÖRSRADAR (EPK)',
      value: String(data.summary.epkInteractions),
      sub: 'Presskit & Tech Rider',
      subColor: '#34d399',
      pillBg: '#0f2920',
      accent: '#34d399',
    },
  ]

  const kpiSvg = kpiCards
    .map((card, idx) => {
      const cardW = 248
      const gap = 18
      const x = 44 + idx * (cardW + gap)
      const y = 126
      return `
        <g transform="translate(${x}, ${y})">
          <rect width="${cardW}" height="134" rx="18" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.32" stroke-width="1.5" />
          <rect x="0" y="0" width="${cardW}" height="5" rx="2.5" fill="${card.accent}" />
          ${renderVectorText(card.title, {
            x: 20,
            y: 32,
            size: 12.5,
            fill: '#b8a790',
            weight: 'bold',
            letterSpacing: 0.9,
            maxWidth: cardW - 36,
          })}
          ${renderVectorText(card.value, {
            x: 20,
            y: 84,
            size: 44,
            fill: '#fdf8ee',
            weight: 'bold',
          })}
          <rect x="18" y="98" width="${cardW - 36}" height="24" rx="8" fill="${card.pillBg}" />
          ${renderVectorText(card.sub, {
            x: 28,
            y: 114,
            size: 12.5,
            fill: card.subColor,
            weight: 'bold',
            maxWidth: cardW - 56,
          })}
        </g>
      `
    })
    .join('\n')

  // Daily Bar Chart
  const series = data.dailySeries.slice(-30)
  const chartX = 44
  const chartY = 282
  const chartW = 1312
  const chartH = 278
  const plotLeft = chartX + 58
  const plotRight = chartX + chartW - 30
  const plotTop = chartY + 66
  const plotBottom = chartY + chartH - 42
  const plotW = plotRight - plotLeft
  const plotH = plotBottom - plotTop

  const maxVal = Math.max(4, ...series.map((d) => Math.max(d.pageviews, d.uniqueVisitors)))

  // Horizontal grid lines
  const gridSteps = [0, 0.25, 0.5, 0.75, 1]
  const gridSvg = gridSteps
    .map((step) => {
      const gy = Math.round(plotBottom - step * plotH)
      const labelVal = Math.round(step * maxVal)
      return `
        <line x1="${plotLeft}" y1="${gy}" x2="${plotRight}" y2="${gy}" stroke="#e2bd72" stroke-opacity="0.14" stroke-dasharray="5 5" />
        ${renderVectorText(String(labelVal), {
          x: plotLeft - 14,
          y: gy + 4,
          size: 12,
          fill: '#9e8f7b',
          weight: 'medium',
          align: 'right',
        })}
      `
    })
    .join('\n')

  const slotW = series.length > 0 ? plotW / series.length : plotW
  const barPairW = Math.min(64, Math.max(10, slotW * 0.58))
  const singleBarW = Math.max(4, (barPairW - 4) / 2)

  const barsSvg = series
    .map((item, idx) => {
      const centerX = plotLeft + idx * slotW + slotW / 2
      const pvH = item.pageviews > 0 ? Math.max(5, Math.round((item.pageviews / maxVal) * plotH)) : 2
      const uvH = item.uniqueVisitors > 0 ? Math.max(5, Math.round((item.uniqueVisitors / maxVal) * plotH)) : 2
      const pvX = Math.round(centerX - singleBarW - 2)
      const uvX = Math.round(centerX + 2)
      const pvY = plotBottom - pvH
      const uvY = plotBottom - uvH

      const showLabel = series.length <= 14 || idx % Math.ceil(series.length / 12) === 0 || idx === series.length - 1
      const hasGig = item.gigsOnDay && item.gigsOnDay.length > 0

      return `
        <g>
          ${hasGig ? `<circle cx="${Math.round(centerX)}" cy="${plotTop - 16}" r="6" fill="#f59e0b" />` : ''}
          <rect x="${pvX}" y="${pvY}" width="${Math.round(singleBarW)}" height="${pvH}" rx="4" fill="#e2bd72" />
          <rect x="${uvX}" y="${uvY}" width="${Math.round(singleBarW)}" height="${uvH}" rx="4" fill="#c87837" />
          ${
            series.length <= 14 && item.pageviews > 0
              ? renderVectorText(String(item.pageviews), {
                  x: Math.round(pvX + singleBarW / 2),
                  y: pvY - 7,
                  size: 11.5,
                  fill: '#f7eedc',
                  weight: 'bold',
                  align: 'center',
                })
              : ''
          }
          ${
            series.length <= 14 && item.uniqueVisitors > 0
              ? renderVectorText(String(item.uniqueVisitors), {
                  x: Math.round(uvX + singleBarW / 2),
                  y: uvY - 7,
                  size: 11,
                  fill: '#e5a46c',
                  weight: 'bold',
                  align: 'center',
                })
              : ''
          }
          ${
            showLabel
              ? renderVectorText(item.label, {
                  x: Math.round(centerX),
                  y: plotBottom + 23,
                  size: 12.5,
                  fill: '#c2b39e',
                  weight: 'bold',
                  align: 'center',
                })
              : ''
          }
        </g>
      `
    })
    .join('\n')

  // Bottom 3 Panels (y = 582, height = 314)
  const panelY = 582
  const panelH = 314
  const panelW = 422
  const panelGap = 23

  const panel1X = 44
  const panel2X = 44 + panelW + panelGap
  const panel3X = 44 + (panelW + panelGap) * 2
  const innerW = panelW - 44

  // Panel 1: Top Pages
  const topPagesSlice = data.topPages.slice(0, 5)
  const topPagesRows =
    topPagesSlice.length > 0
      ? topPagesSlice
          .map((p, i) => {
            const ry = panelY + 70 + i * 47
            const barW = Math.max(8, Math.round((p.pct / 100) * innerW))
            return `
              <g transform="translate(${panel1X + 22}, ${ry})">
                ${renderVectorText(`${i + 1}. ${p.label}`, {
                  x: 0,
                  y: 14,
                  size: 14,
                  fill: '#fdf8ee',
                  weight: 'bold',
                  maxWidth: innerW - 95,
                })}
                ${renderVectorText(`${p.views} (${p.pct}%)`, {
                  x: innerW,
                  y: 14,
                  size: 13.5,
                  fill: '#e2bd72',
                  weight: 'bold',
                  align: 'right',
                })}
                <rect x="0" y="23" width="${innerW}" height="8" rx="4" fill="#2a2119" />
                <rect x="0" y="23" width="${barW}" height="8" rx="4" fill="#e2bd72" />
              </g>
            `
          })
          .join('\n')
      : renderVectorText('Inga sidvisningar under perioden', {
          x: panel1X + 22,
          y: panelY + 110,
          size: 14,
          fill: '#9e8f7b',
          weight: 'medium',
        })

  // Panel 2: Top Songs & Jukebox
  const topSongsSlice = data.bandTelemetry.topSongs.slice(0, 5)
  const topSongsRows =
    topSongsSlice.length > 0
      ? topSongsSlice
          .map((s, i) => {
            const ry = panelY + 68 + i * 47
            return `
              <g transform="translate(${panel2X + 22}, ${ry})">
                <rect x="0" y="0" width="28" height="28" rx="8" fill="#2b2118" stroke="#e2bd72" stroke-opacity="0.4" />
                ${renderVectorText(String(i + 1), {
                  x: 14,
                  y: 19,
                  size: 13.5,
                  fill: '#e2bd72',
                  weight: 'bold',
                  align: 'center',
                })}
                ${renderVectorText(s.title, {
                  x: 38,
                  y: 19,
                  size: 14.5,
                  fill: '#fdf8ee',
                  weight: 'bold',
                  maxWidth: innerW - 165,
                })}
                <rect x="${innerW - 122}" y="2" width="122" height="24" rx="7" fill="#271d14" />
                ${renderVectorText(`${s.plays} speln. • ${s.lyricsViews} text`, {
                  x: innerW - 61,
                  y: 18,
                  size: 12,
                  fill: '#fbbf24',
                  weight: 'bold',
                  align: 'center',
                  maxWidth: 114,
                })}
              </g>
            `
          })
          .join('\n')
      : renderVectorText('Inga låtspelningar registrerade ännu', {
          x: panel2X + 22,
          y: panelY + 110,
          size: 14,
          fill: '#9e8f7b',
          weight: 'medium',
        })

  // Panel 3: Traffic Sources & Locations
  const topRefsSlice = data.referrers.slice(0, 3)
  const topCitiesSlice = data.locations.cities.slice(0, 2)
  const refRows =
    topRefsSlice.length > 0
      ? topRefsSlice
          .map((r, i) => {
            const ry = panelY + 68 + i * 38
            return `
              <g transform="translate(${panel3X + 22}, ${ry})">
                ${renderVectorText(r.source, {
                  x: 0,
                  y: 16,
                  size: 14,
                  fill: '#fdf8ee',
                  weight: 'bold',
                  maxWidth: innerW - 90,
                })}
                ${renderVectorText(`${r.count} (${r.pct}%)`, {
                  x: innerW,
                  y: 16,
                  size: 13.5,
                  fill: '#e2bd72',
                  weight: 'bold',
                  align: 'right',
                })}
              </g>
            `
          })
          .join('\n')
      : renderVectorText('Ingen trafikdata', {
          x: panel3X + 22,
          y: panelY + 95,
          size: 13.5,
          fill: '#9e8f7b',
          weight: 'medium',
        })

  const cityRows =
    topCitiesSlice.length > 0
      ? topCitiesSlice
          .map((c, i) => {
            const ry = panelY + 222 + i * 38
            return `
              <g transform="translate(${panel3X + 22}, ${ry})">
                ${renderVectorText(`${c.city} (${c.country})`, {
                  x: 0,
                  y: 16,
                  size: 14,
                  fill: '#e5d8c5',
                  weight: 'medium',
                  maxWidth: innerW - 90,
                })}
                ${renderVectorText(`${c.count} (${c.pct}%)`, {
                  x: innerW,
                  y: 16,
                  size: 13.5,
                  fill: '#34d399',
                  weight: 'bold',
                  align: 'right',
                })}
              </g>
            `
          })
          .join('\n')
      : renderVectorText('Ingen ortsdata', {
          x: panel3X + 22,
          y: panelY + 245,
          size: 13.5,
          fill: '#9e8f7b',
          weight: 'medium',
        })

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#130e0a" />
      <stop offset="50%" stop-color="#18120d" />
      <stop offset="100%" stop-color="#0f0b08" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="26" fill="none" stroke="#e2bd72" stroke-opacity="0.26" stroke-width="1.5" />

  <!-- Top Header -->
  <g transform="translate(44, 40)">
    <rect x="0" y="0" width="224" height="28" rx="14" fill="#e2bd72" fill-opacity="0.16" stroke="#e2bd72" stroke-opacity="0.45" />
    ${renderVectorText('DET 7:E GUNGET • TELEMETRI', {
      x: 112,
      y: 19,
      size: 12,
      fill: '#e2bd72',
      weight: 'bold',
      align: 'center',
      letterSpacing: 1.2,
    })}
    ${renderVectorText('Besöksstatistik & Publikpuls', {
      x: 0,
      y: 64,
      size: 34,
      fill: '#fdf8ee',
      weight: 'bold',
    })}

    <!-- Period Badge on Right -->
    <g transform="translate(972, 6)">
      <rect x="0" y="0" width="340" height="58" rx="16" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.38" stroke-width="1.5" />
      ${renderVectorText(`Period: ${rangeLabel}`, {
        x: 170,
        y: 25,
        size: 15,
        fill: '#e2bd72',
        weight: 'bold',
        align: 'center',
      })}
      ${renderVectorText(`Rapport skapad ${generatedAtStr}`, {
        x: 170,
        y: 45,
        size: 12,
        fill: '#a89882',
        weight: 'medium',
        align: 'center',
      })}
    </g>
  </g>

  <!-- Row 1: 5 KPI Cards -->
  ${kpiSvg}

  <!-- Row 2: Daily Timeline Chart -->
  <g>
    <rect x="${chartX}" y="${chartY}" width="${chartW}" height="${chartH}" rx="20" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.28" stroke-width="1.5" />
    ${renderVectorText('DAGLIG TRAFIKUTVECKLING', {
      x: chartX + 26,
      y: chartY + 34,
      size: 15.5,
      fill: '#e2bd72',
      weight: 'bold',
      letterSpacing: 0.9,
    })}

    <!-- Legend -->
    <g transform="translate(${chartX + chartW - 380}, ${chartY + 19})">
      <rect x="0" y="2" width="14" height="14" rx="4" fill="#e2bd72" />
      ${renderVectorText('Sidvisningar', {
        x: 22,
        y: 14,
        size: 13,
        fill: '#e5d8c5',
        weight: 'bold',
      })}
      <rect x="130" y="2" width="14" height="14" rx="4" fill="#c87837" />
      ${renderVectorText('Unika besökare', {
        x: 152,
        y: 14,
        size: 13,
        fill: '#e5d8c5',
        weight: 'bold',
      })}
      <circle cx="282" cy="9" r="6" fill="#f59e0b" />
      ${renderVectorText('Speldag', {
        x: 295,
        y: 14,
        size: 13,
        fill: '#e5d8c5',
        weight: 'bold',
      })}
    </g>

    ${gridSvg}
    ${barsSvg}
  </g>

  <!-- Row 3: 3 Detail Panels -->
  <!-- Panel 1: Top Pages -->
  <rect x="${panel1X}" y="${panelY}" width="${panelW}" height="${panelH}" rx="20" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.28" stroke-width="1.5" />
  ${renderVectorText('POPULÄRASTE SIDORNA', {
    x: panel1X + 22,
    y: panelY + 34,
    size: 15,
    fill: '#e2bd72',
    weight: 'bold',
    letterSpacing: 0.9,
  })}
  <line x1="${panel1X + 22}" y1="${panelY + 48}" x2="${panel1X + panelW - 22}" y2="${panelY + 48}" stroke="#e2bd72" stroke-opacity="0.18" />
  ${topPagesRows}

  <!-- Panel 2: Top Songs -->
  <rect x="${panel2X}" y="${panelY}" width="${panelW}" height="${panelH}" rx="20" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.28" stroke-width="1.5" />
  ${renderVectorText('TOPPLÅTAR I JUKEBOX & TEXT', {
    x: panel2X + 22,
    y: panelY + 34,
    size: 15,
    fill: '#e2bd72',
    weight: 'bold',
    letterSpacing: 0.9,
  })}
  <line x1="${panel2X + 22}" y1="${panelY + 48}" x2="${panel2X + panelW - 22}" y2="${panelY + 48}" stroke="#e2bd72" stroke-opacity="0.18" />
  ${topSongsRows}

  <!-- Panel 3: Referrers & Cities -->
  <rect x="${panel3X}" y="${panelY}" width="${panelW}" height="${panelH}" rx="20" fill="#1b1510" stroke="#e2bd72" stroke-opacity="0.28" stroke-width="1.5" />
  ${renderVectorText('TRAFIKKÄLLOR & WEBBHÄNVISNING', {
    x: panel3X + 22,
    y: panelY + 34,
    size: 15,
    fill: '#e2bd72',
    weight: 'bold',
    letterSpacing: 0.9,
  })}
  <line x1="${panel3X + 22}" y1="${panelY + 48}" x2="${panel3X + panelW - 22}" y2="${panelY + 48}" stroke="#e2bd72" stroke-opacity="0.18" />
  ${refRows}
  ${renderVectorText('TOPP-ORTER & LÄNDER', {
    x: panel3X + 22,
    y: panelY + 196,
    size: 14,
    fill: '#e2bd72',
    weight: 'bold',
    letterSpacing: 0.9,
  })}
  <line x1="${panel3X + 22}" y1="${panelY + 208}" x2="${panel3X + panelW - 22}" y2="${panelY + 208}" stroke="#e2bd72" stroke-opacity="0.18" />
  ${cityRows}
</svg>`

  return sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer()
}
