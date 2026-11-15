interface Store {
  epoch: () => Promise<number>
  authEpoch: () => Promise<number>
  authEpochForGeneration: (epoch: number) => Promise<number | null>
  clear: (block?: boolean) => Promise<void>
  clearIfEpoch: (epoch: number) => Promise<boolean>
  clearIfAuthEpoch: (epoch: number) => Promise<boolean>
  unlock: (epoch: number) => Promise<boolean>
  begin: (epoch: number, owner: string) => Promise<number | null>
  save: (epoch: number, owner: string, snapshot: Snapshot, requestStartedAt: number) => Promise<boolean>
  saveThumbnails: (epoch: number, owner: string, images: Array<{ id: string; blob: Blob }>) => Promise<boolean>
  reserveThumbnails: (epoch: number, owner: string) => Promise<string[]>
  reserveAnalytics: (epoch: number, owner: string, range: AnalyticsRange) => Promise<number | null>
  saveAnalytics: (epoch: number, owner: string, range: AnalyticsRange, sequence: number, result: unknown, startedAt: number) => Promise<boolean>
  read: () => Promise<{ savedAt: number; expiresAt: number; thumbnailStatus?: { saved: number; total: number }; datasets: Record<string, { available: boolean }> } | null>
}
interface Snapshot {
  userId: string
  sessionExpiresAt: string
  serverTime: string
  datasets: Record<string, { available: boolean; data?: unknown }>
}

interface GalleryItem { id: string; category: string; thumbnailSource?: string | null; thumbnailKey?: string | null }
export type AnalyticsRange = 'today' | '7d' | '30d' | '90d' | 'all'
interface AnalyticsReservation { store: Store; epoch: number; authorization: number; owner: string; range: AnalyticsRange; sequence: number; startedAt: number }
let preparation: Promise<void> | null = null

// Fetch directly from approved origins; never use a server-side URL proxy.
async function thumbnail(source: string, signal: AbortSignal, budget: { remaining: number }): Promise<Blob | null> {
  try {
    const url = new URL(source, location.origin)
    const local = url.origin === location.origin && url.pathname.startsWith('/media/') && !url.pathname.startsWith('/media/fan-central/')
    const blob = url.protocol === 'https:' && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname) && url.pathname.startsWith('/media/')
    if ((!local && !blob) || url.username || url.password || (blob && url.port) || url.search || url.hash || /%2f|%5c/i.test(url.pathname)) return null
    const response = await fetch(url.href, { mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', signal })
    if (!response.ok || response.type === 'opaque' || response.redirected || !/^image\/(jpeg|png|webp|gif)$/i.test(response.headers.get('content-type')?.split(';')[0]?.trim() || '')) {
      await response.body?.cancel()
      return null
    }
    const maxInput = Math.min(2 * 1024 * 1024, budget.remaining)
    if (maxInput <= 0) return null
    if (Number(response.headers.get('content-length')) > maxInput || !response.body) {
      await response.body?.cancel()
      return null
    }
    const reader = response.body.getReader()
    const parts: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      budget.remaining = Math.max(0, budget.remaining - value.byteLength)
      if (size > maxInput) { await reader.cancel(); return null }
      parts.push(value)
    }
    const input = new Blob(parts as BlobPart[], { type: response.headers.get('content-type') || '' })
    const bitmap = await createImageBitmap(input)
    try {
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 16000000) return null
      const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) return null
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.72))
    } finally { bitmap.close() }
  } catch { return null }
}

async function prepareThumbnails(store: Store, generation: number, owner: string, items: GalleryItem[]) {
  const reserved = new Set(await store.reserveThumbnails(generation, owner))
  const candidates = items.filter(item => reserved.has(item.id) && item.thumbnailSource)
  const signal = AbortSignal.timeout(30000)
  const budget = { remaining: 8 * 1024 * 1024 }
  for (const item of candidates) {
    if (signal.aborted || budget.remaining <= 0) break
    if (await store.authEpochForGeneration(generation) === null) return
    const result = await thumbnail(item.thumbnailSource!, signal, budget)
    if (result && result.size <= 200000 && !await store.saveThumbnails(generation, owner, [{ id: item.id, blob: result }])) return
  }
}

const storeUrl = '/admin/offline-store.js'
export const offlineStore = (): Promise<Store> => import(/* @vite-ignore */ storeUrl)

export function prepareOffline(owner: string, expected: number) {
  const pending = prepareOfflineSnapshot(owner, expected)
  preparation = pending
  void pending.finally(() => { if (preparation === pending) preparation = null })
  return pending
}

async function prepareOfflineSnapshot(owner: string, expected: number) {
  const state = useState<string>('adminOfflineStatus', () => 'Inte förberedd')
  try {
    const store = await offlineStore()
    const generation = await store.begin(expected, owner)
    if (generation === null) return
    const authorization = await store.authEpochForGeneration(generation)
    if (authorization === null) return
    state.value = 'Förbereder offlinekopia …'
    const requestStartedAt = Date.now()
    const response = await fetch('/api/admin/offline-snapshot', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) })
    if (response.status === 401 || response.status === 403) {
      if (await store.clearIfAuthEpoch(authorization)) state.value = 'Offlinekopian rensades: inloggningen nekades'
      return
    }
    if (!response.ok) throw new Error('Kunde inte hämta offlinekopian')
    const snapshot: Snapshot = await response.json()
    const gallery = snapshot.datasets.gallery?.data
    const images: GalleryItem[] = Array.isArray(gallery) ? gallery.map((item: GalleryItem) => ({ id: item.id, category: item.category, thumbnailSource: item.thumbnailSource })) : []
    // Image URLs are transient and never stored in IndexedDB.
    if (Array.isArray(gallery)) for (const item of gallery) {
      if (item.thumbnailSource && globalThis.crypto?.subtle) {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(item.thumbnailSource))
        item.thumbnailKey = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
      }
      delete item.thumbnailSource
    }
    const missing = Object.values(snapshot.datasets).some(item => !item.available)
    if (!await store.save(generation, owner, snapshot, requestStartedAt)) return
    state.value = missing ? 'Offlinekopian är ofullständig; försök igen online' : 'Offlinekopian är förberedd; miniatyrer förbereds separat'
    void (async () => { try {
      await prepareThumbnails(store, generation, owner, images)
      if (await store.authEpochForGeneration(generation) === null) return
      const saved = await store.read()
      if (saved && !missing) state.value = `Offlinekopian är förberedd; miniatyrer ${saved.thumbnailStatus?.saved ?? 0} av ${saved.thumbnailStatus?.total ?? 0}`
    } catch {
      state.value = 'Offlinekopian är sparad, men miniatyrerna kunde inte förberedas; kontrollera lokal lagring'
    } })()
  } catch {
    state.value = 'Offlineförberedelsen misslyckades; kontrollera nätverk och lokal lagring'
  }
}

export async function reserveOfflineAnalytics(owner: string, range: AnalyticsRange): Promise<AnalyticsReservation | null> {
  try {
    await preparation
    const store = await offlineStore()
    const epoch = await store.epoch()
    const sequence = await store.reserveAnalytics(epoch, owner, range)
    const authorization = await store.authEpochForGeneration(epoch)
    return sequence === null || authorization === null ? null : { store, epoch, authorization, owner, range, sequence, startedAt: Date.now() }
  } catch { return null }
}

export async function prepareOfflineAnalytics(reservation: AnalyticsReservation | null): Promise<boolean> {
  if (!reservation) return false
  const { store, epoch, authorization, owner, range, sequence, startedAt } = reservation
  try {
    const response = await fetch(`/api/admin/offline-analytics?range=${encodeURIComponent(range)}`, {
      credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000),
    })
    if (response.status === 401 || response.status === 403) await store.clearIfAuthEpoch(authorization)
    if (!response.ok) return false
    return await store.saveAnalytics(epoch, owner, range, sequence, await response.json(), startedAt)
  } catch { return false }
}