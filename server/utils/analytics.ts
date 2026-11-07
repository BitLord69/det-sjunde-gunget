import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCookie, getRequestHeader, getRequestIP } from 'h3'
import { nanoid } from 'nanoid'
import { db, tursoClient } from '../db/client'
import { analyticsEvents } from '../db/schema'

let tableInitialized = false

export async function ensureAnalyticsTable() {
  if (tableInitialized) return
  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id text PRIMARY KEY NOT NULL,
        event_type text DEFAULT 'pageview' NOT NULL,
        path text DEFAULT '/' NOT NULL,
        visitor_hash text NOT NULL,
        referrer text,
        campaign text,
        country text,
        city text,
        device_type text,
        os text,
        browser text,
        locale text DEFAULT 'sv',
        target_id text,
        target_label text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `)
    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events (created_at)
    `)
    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events (event_type)
    `)
    tableInitialized = true
  } catch (err) {
    console.warn('[Analytics] Could not initialize analytics_events table:', err)
  }
}

const BOT_UA_REGEX = /bot|crawler|spider|slurp|facebookexternalhit|meta-externalagent|whatsapp|discordbot|headlesschrome|playwright|lighthouse|vercel-screenshot|curl|wget|python-requests|go-http-client|uptimerobot/i

export function isBotUserAgent(ua: string): boolean {
  if (!ua || ua.trim().length < 8) return true
  return BOT_UA_REGEX.test(ua)
}

export function normalizePublicPath(rawPath: string): string {
  if (!rawPath) return '/'
  const withoutQuery = (rawPath.split('?')[0] || '/').trim()
  const clean = withoutQuery.replace(/\/+$/, '') || '/'
  if (clean === '/en') return '/'
  if (clean.startsWith('/en/')) return clean.slice(3) || '/'
  return clean
}

export function isPublicTrackablePath(rawPath: string): boolean {
  const norm = normalizePublicPath(rawPath)
  if (
    norm.startsWith('/admin') ||
    norm.startsWith('/api') ||
    norm.startsWith('/_nuxt') ||
    norm.startsWith('/__nuxt')
  ) {
    return false
  }
  return true
}

export function parseUserAgentInfo(ua: string): {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
} {
  const lower = (ua || '').toLowerCase()

  // Device Type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    deviceType = 'mobile'
  }

  // OS
  let os = 'Övrigt'
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  // Browser
  let browser = 'Övrigt'
  if (lower.includes('instagram')) {
    browser = 'Instagram App'
  } else if (lower.includes('fban') || lower.includes('fbav') || lower.includes('fb_iab')) {
    browser = 'Facebook App'
  } else if (lower.includes('edg/')) {
    browser = 'Edge'
  } else if (lower.includes('opr/') || lower.includes('opera')) {
    browser = 'Opera'
  } else if (lower.includes('chrome/') && !lower.includes('edg/')) {
    browser = 'Chrome'
  } else if (lower.includes('safari/') && !lower.includes('chrome/')) {
    browser = 'Safari'
  } else if (lower.includes('firefox/')) {
    browser = 'Firefox'
  }

  return { deviceType, os, browser }
}

export function classifyReferrer(
  rawReferrer?: string | null,
  campaign?: string | null,
  userAgent?: string | null,
): string {
  const uaLower = (userAgent || '').toLowerCase()
  const refLower = (rawReferrer || '').toLowerCase()
  const camp = (campaign || '').toLowerCase().trim()

  // 1. Smart FB -> IG Autopost Detection:
  // Even if a link has ?ref=fb (or no ref) because Facebook auto-crossposted to Instagram,
  // if the visitor opens it from the Instagram app or instagram.com referrer, always credit Instagram!
  if (uaLower.includes('instagram') || refLower.includes('instagram.com')) {
    return 'Instagram'
  }
  if (
    (camp === '' || camp === 'fb' || camp === 'facebook') &&
    (uaLower.includes('fban') || uaLower.includes('fbav') || uaLower.includes('fb_iab'))
  ) {
    return 'Facebook'
  }

  // 2. Explicit ?ref= campaign tags
  if (camp === 'poster' || camp === 'qr' || camp === 'affisch') return 'QR / Affisch'
  if (camp === 'fb' || camp === 'facebook') return 'Facebook'
  if (camp === 'ig' || camp === 'instagram') return 'Instagram'
  if (camp === 'newsletter' || camp === 'nyhetsbrev') return 'Nyhetsbrev'

  if (!rawReferrer || !rawReferrer.trim()) return 'Direkt / Bokmärke'

  try {
    const url = new URL(rawReferrer)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')

    // Ignore internal self-referrals
    if (
      host.includes('sjundegunget.se') ||
      host.includes('detsjundegunget.se') ||
      host.includes('det7egunget.se') ||
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.endsWith('.vercel.app')
    ) {
      return 'Direkt / Bokmärke'
    }

    if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('fb.me')) return 'Facebook'
    if (host.includes('instagram.com')) return 'Instagram'
    if (host.includes('google.')) return 'Google Sök'
    if (host.includes('bing.com') || host.includes('duckduckgo.com') || host.includes('yahoo.')) return 'Sökmotor (Bing/DDG)'
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube'
    if (host.includes('spotify.com')) return 'Spotify'
    if (host.includes('tiktok.com')) return 'TikTok'

    return host
  } catch {
    return 'Direkt / Bokmärke'
  }
}

export interface TrackEventInput {
  eventType: string
  path?: string
  referrer?: string | null
  campaign?: string | null
  locale?: string | null
  targetId?: string | null
  targetLabel?: string | null
}

export async function recordPublicAnalyticsEvent(
  event: H3Event,
  input: TrackEventInput,
): Promise<{ tracked: boolean; reason?: string }> {
  // 1. Ignore logged-in admins so band members don't skew visitor metrics
  const adminToken = getCookie(event, 'gunget_session') || getCookie(event, 'admin_session')
  if (adminToken) {
    return { tracked: false, reason: 'admin_session' }
  }

  // 2. Ignore non-public routes
  const rawPath = input.path || '/'
  if (!isPublicTrackablePath(rawPath)) {
    return { tracked: false, reason: 'non_public_path' }
  }

  // 3. Ignore bots & automated crawlers
  const ua = getRequestHeader(event, 'user-agent') || ''
  if (isBotUserAgent(ua)) {
    return { tracked: false, reason: 'bot' }
  }

  await ensureAnalyticsTable()

  // 4. Compute daily anonymous visitor hash (no raw IP stored)
  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const todayKey = new Date().toISOString().slice(0, 10)
  const visitorHash = createHash('sha256')
    .update(`${ip}|${ua}|${todayKey}|d7g-public-telemetry`)
    .digest('hex')
    .slice(0, 16)

  // 5. Extract Vercel Geo headers
  const rawCountry = getRequestHeader(event, 'x-vercel-ip-country') || ''
  const rawCity = getRequestHeader(event, 'x-vercel-ip-city') || ''
  const country = rawCountry ? rawCountry.toUpperCase().slice(0, 8) : 'SE'
  let city: string | null = null
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity).trim().slice(0, 80)
    } catch {
      city = rawCity.trim().slice(0, 80)
    }
  }

  const { deviceType, os, browser } = parseUserAgentInfo(ua)
  const normalizedPath = normalizePublicPath(rawPath)
  const detectedLocale =
    input.locale === 'en' || rawPath.startsWith('/en/') || rawPath === '/en' ? 'en' : 'sv'
  const cleanCampaign = input.campaign ? String(input.campaign).trim().slice(0, 60) : null
  const classifiedRef = classifyReferrer(input.referrer, cleanCampaign, ua)

  await db.insert(analyticsEvents).values({
    id: nanoid(),
    eventType: (input.eventType || 'pageview').slice(0, 50),
    path: normalizedPath.slice(0, 160),
    visitorHash,
    referrer: classifiedRef.slice(0, 100),
    campaign: cleanCampaign,
    country,
    city,
    deviceType,
    os,
    browser,
    locale: detectedLocale,
    targetId: input.targetId ? String(input.targetId).slice(0, 120) : null,
    targetLabel: input.targetLabel ? String(input.targetLabel).slice(0, 180) : null,
    createdAt: new Date(),
  })

  return { tracked: true }
}

