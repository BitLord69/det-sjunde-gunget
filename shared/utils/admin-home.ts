export const DEFAULT_ADMIN_HOME = '/admin/songs'

export const ADMIN_HOME_OPTIONS = [
  { path: '/admin/songs', label: 'Låtar' },
  { path: '/admin/ideas', label: 'Idébank' },
  { path: '/admin/gigs', label: 'Gig' },
  { path: '/admin/band', label: 'Bandet' },
  { path: '/admin/setlist', label: 'Setlist' },
  { path: '/admin/gallery', label: 'Galleri' },
  { path: '/admin/videos', label: 'Videor' },
  { path: '/admin/fancentral', label: 'Fan Central' },
  { path: '/admin/hashtags', label: 'Taggar' },
  { path: '/admin/messages', label: 'Bokningar' },
  { path: '/admin/analytics', label: 'Statistik' },
  { path: '/admin/admins', label: 'Admins' },
  { path: '/admin/subscribers', label: 'Nyhetsbrev' },
  { path: '/admin/merch', label: 'Merch' },
  { path: '/admin/settings', label: 'Inställningar' },
  { path: '/admin/help', label: 'Hjälp' },
] as const

export type AdminHome = typeof ADMIN_HOME_OPTIONS[number]['path']

export function isAdminHome(value: unknown): value is AdminHome {
  return typeof value === 'string' && ADMIN_HOME_OPTIONS.some(option => option.path === value)
}

export function normalizeAdminHome(value: unknown): AdminHome {
  return isAdminHome(value) ? value : DEFAULT_ADMIN_HOME
}

// null means there was no explicit legacy destination; only then use the preference.
export function explicitAdminDestination(query: Record<string, unknown>): string | null {
  const message = query.msg || query.messageId
  if (message) {
    return typeof message === 'string'
      ? `/admin/messages?msg=${encodeURIComponent(message)}`
      : DEFAULT_ADMIN_HOME
  }
  if ('msg' in query || 'messageId' in query) return DEFAULT_ADMIN_HOME
  if ('tab' in query) {
    const legacyTabs = ['songs', 'gigs', 'band', 'setlist', 'gallery', 'merch', 'admins', 'messages', 'subscribers', 'hashtags', 'analytics', 'settings', 'help']
    return typeof query.tab === 'string' && legacyTabs.includes(query.tab)
      ? `/admin/${query.tab}`
      : DEFAULT_ADMIN_HOME
  }
  return null
}