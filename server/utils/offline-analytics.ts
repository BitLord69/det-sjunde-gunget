import { gte, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { analyticsEvents } from '../db/schema'
import { ensureAnalyticsTable } from './analytics'

export const OFFLINE_ANALYTICS_RANGES = ['today', '7d', '30d', '90d', 'all'] as const
export type OfflineAnalyticsRange = typeof OFFLINE_ANALYTICS_RANGES[number]

export function isOfflineAnalyticsRange(value: unknown): value is OfflineAnalyticsRange {
  return typeof value === 'string' && OFFLINE_ANALYTICS_RANGES.includes(value as OfflineAnalyticsRange)
}

// Match the dashboard's rolling periods; "all" includes events from the Unix epoch.
export async function getOfflineAnalyticsSummary(range: OfflineAnalyticsRange) {
  await ensureAnalyticsTable()
  const days = { today: 1, '7d': 7, '30d': 30, '90d': 90, all: 0 }[range]
  const start = range === 'all' ? 0 : Date.now() - days * 86400000
  const [summary] = await db.select({
    visitors: sql<number>`count(distinct ${analyticsEvents.visitorHash})`,
    pageviews: sql<number>`coalesce(sum(case when ${analyticsEvents.eventType} = 'pageview' then 1 else 0 end), 0)`,
    lyricsViews: sql<number>`coalesce(sum(case when ${analyticsEvents.eventType} = 'lyrics_view' then 1 else 0 end), 0)`,
    jukeboxPlays: sql<number>`coalesce(sum(case when ${analyticsEvents.eventType} = 'jukebox_play' then 1 else 0 end), 0)`,
  }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, new Date(start)))
  return summary
}