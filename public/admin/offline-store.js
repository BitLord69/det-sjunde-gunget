const DB = 'gunget-admin-offline-v1'
const MAX_AGE = 7 * 86400000
const RANGES = ['today', '7d', '30d', '90d', 'all']
const FIELDS = ['visitors', 'pageviews', 'lyricsViews', 'jukeboxPlays']

function summary(data) {
  if (!data || !FIELDS.every(key => Number.isSafeInteger(data[key]) && data[key] >= 0)) return null
  return Object.fromEntries(FIELDS.map(key => [key, data[key]]))
}

function validSnapshot(state, now) {
  const s = state.snapshot
  return !state.blocked && s && state.owner === s.userId && now >= s.lastSeen && now < s.expiresAt && now < s.savedAt + MAX_AGE
}

function validRange(item, now) {
  return item && Number.isFinite(item.expiresAt) && item.expiresAt > now &&
    Number.isFinite(item.savedAt) && item.savedAt <= now &&
    Number.isFinite(item.startedAt) && item.startedAt <= item.savedAt && summary(item.data)
}

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('state')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Lokal lagring är blockerad'))
  })
}

async function transaction(action) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite')
    const store = tx.objectStore('state')
    let result
    const request = store.get('state')
    request.onsuccess = () => {
      const state = request.result || { epoch: 0, owner: null, blocked: false, snapshot: null }
      result = action(state)
      store.put(state, 'state')
    }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Lokal lagring misslyckades')) }
  })
}

export const epoch = () => transaction(state => state.epoch)
export const authEpoch = () => transaction(state => state.authEpoch || 0)
export const authEpochForGeneration = expected => transaction(state => state.epoch === expected && !state.blocked ? state.authEpoch || 0 : null)

export const markReader = id => transaction(state => {
  const now = Date.now()
  const readers = Object.entries(state.readers || {}).filter(([, time]) => Number.isFinite(time) && now - time < MAX_AGE)
  state.readers = Object.fromEntries(readers.slice(-99))
  state.readers[id] = now
})
export const isReader = id => transaction(state => !!state.readers?.[id])

function notify() {
  if ('BroadcastChannel' in globalThis) {
    const channel = new BroadcastChannel('gunget-admin-offline')
    channel.postMessage('changed')
    channel.close()
  }
}

// Blocks even successful in-flight /me requests until an explicit new login succeeds.
export async function clear(block = false) {
  await transaction(state => {
    state.epoch++
    state.authEpoch = (state.authEpoch || 0) + 1
    state.owner = null
    state.snapshot = null
    state.blocked = state.blocked || block
  })
  notify()
}

export async function clearIfEpoch(expected) {
  const cleared = await transaction(state => {
    if (state.epoch !== expected) return false
    state.epoch++
    state.authEpoch = (state.authEpoch || 0) + 1
    state.owner = null
    state.snapshot = null
    return true
  })
  if (cleared) notify()
  return cleared
}

export async function clearIfAuthEpoch(expected) {
  const cleared = await transaction(state => {
    if ((state.authEpoch || 0) !== expected) return false
    state.epoch++
    state.authEpoch = (state.authEpoch || 0) + 1
    state.owner = null
    state.snapshot = null
    return true
  })
  if (cleared) notify()
  return cleared
}

export const unlock = expected => transaction(state => {
  if (state.epoch !== expected) return false
  state.blocked = false
  state.epoch++
  state.authEpoch = (state.authEpoch || 0) + 1
  return true
})

export async function begin(expected, owner) {
  let changed = false
  const result = await transaction(state => {
    if (state.blocked || state.epoch !== expected) return null
    state.epoch++
    if (state.owner !== owner) {
      if (state.owner !== null) state.authEpoch = (state.authEpoch || 0) + 1
      state.owner = owner
      state.snapshot = null
      changed = true
    }
    return state.epoch
  })
  if (changed) notify()
  return result
}

export const save = (expected, owner, snapshot, requestStartedAt) => transaction(state => {
  if (state.blocked || state.epoch !== expected || state.owner !== owner) return false
  const now = Date.now()
  const remaining = Date.parse(snapshot.sessionExpiresAt) - Date.parse(snapshot.serverTime)
  if (!Number.isFinite(remaining) || !Number.isFinite(requestStartedAt) || requestStartedAt > now || snapshot.userId !== owner) return false
  const expiresAt = requestStartedAt + Math.min(remaining, MAX_AGE)
  if (expiresAt <= now) return false
  const previous = validSnapshot(state, now) ? state.snapshot.analyticsRanges || {} : {}
  const oldGallery = validSnapshot(state, now) && state.snapshot.datasets.gallery?.available ? state.snapshot.datasets.gallery.data : []
  const previousImages = new Map((Array.isArray(oldGallery) ? oldGallery : []).map(item => [item.id, item]))
  const gallery = snapshot.datasets.gallery?.available && Array.isArray(snapshot.datasets.gallery.data) ? snapshot.datasets.gallery.data : []
  for (const item of gallery) {
    const old = previousImages.get(item.id)
    if (item.category === 'photo' && item.thumbnailKey && old?.category === 'photo' && old.thumbnailKey === item.thumbnailKey) {
      item.thumbnail = old.thumbnail || null
      item.thumbnailAttemptAt = old.thumbnailAttemptAt || 0
    }
  }
  snapshot.thumbnailStatus = { saved: gallery.filter(item => item.thumbnail instanceof Blob).length, total: gallery.filter(item => item.category === 'photo').length }
  const ranges = {}
  for (const range of RANGES) {
    const item = previous[range]
    if (validRange(item, now)) ranges[range] = item
  }
  const current = snapshot.datasets.analytics
  const data = current?.available && summary(current.data)
  if (data && (!ranges['7d'] || ranges['7d'].startedAt <= requestStartedAt)) {
    ranges['7d'] = { data, startedAt: requestStartedAt, savedAt: now, expiresAt }
  }
  // The legacy dataset is not stored separately; only the four allowed counters survive.
  delete snapshot.datasets.analytics
  snapshot.analyticsRanges = ranges
  state.snapshot = { ...snapshot, savedAt: now, lastSeen: now, expiresAt }
  return true
})

// Reserve before the online dashboard request, so older completions cannot replace newer ones.
export const reserveAnalytics = (expected, owner, range) => transaction(state => {
  const now = Date.now()
  if (!RANGES.includes(range) || state.epoch !== expected || state.owner !== owner || !validSnapshot(state, now)) return null
  state.snapshot.lastSeen = now
  state.analyticsSequence = (state.analyticsSequence || 0) + 1
  state.analyticsRequests ||= {}
  state.analyticsRequests[range] = state.analyticsSequence
  return state.analyticsSequence
})

export async function saveAnalytics(expected, owner, range, sequence, result, requestStartedAt) {
  const saved = await transaction(state => {
    const now = Date.now()
    const s = state.snapshot
    const data = summary(result?.summary)
    if (!RANGES.includes(range) || state.epoch !== expected || state.owner !== owner || !validSnapshot(state, now) ||
        state.analyticsRequests?.[range] !== sequence || result?.userId !== owner || result?.range !== range || !data ||
        !Number.isFinite(requestStartedAt) || requestStartedAt > now) return false
    s.analyticsRanges ||= {}
    s.analyticsRanges[range] = { data, startedAt: requestStartedAt, savedAt: now, expiresAt: Math.min(s.expiresAt, requestStartedAt + MAX_AGE) }
    s.lastSeen = now
    return true
  })
  if (saved) notify()
  return saved
}

export async function saveThumbnails(expected, owner, images) {
  const saved = await transaction(state => {
    const snapshot = state.snapshot
    if (state.blocked || state.epoch !== expected || state.owner !== owner || !snapshot || Date.now() >= snapshot.expiresAt) return false
    let bytes = 0
    let count = 0
    const accepted = new Map()
    const gallery = snapshot.datasets.gallery?.data || []
    const photoIds = new Set(gallery.filter(item => item.category === 'photo').map(item => item.id))
    for (const item of gallery) {
      if (item.category === 'photo' && item.thumbnail instanceof Blob && item.thumbnail.size <= 200000 && count < 40 && bytes + item.thumbnail.size <= 4000000) {
        accepted.set(item.id, item.thumbnail)
        bytes += item.thumbnail.size
        count++
      }
    }
    for (const image of images) {
      if (count >= 40 || !photoIds.has(image.id) || accepted.has(image.id) || !(image.blob instanceof Blob) || image.blob.type !== 'image/jpeg' || !image.blob.size || image.blob.size > 200000 || bytes + image.blob.size > 4000000) continue
      accepted.set(image.id, image.blob)
      bytes += image.blob.size
      count++
    }
    for (const item of gallery) item.thumbnail = accepted.get(item.id) || null
    snapshot.thumbnailStatus = { saved: accepted.size, total: gallery.filter(item => item.category === 'photo').length }
    return true
  })
  if (saved) notify()
  return saved
}

// Persist reservations before network I/O, so navigation and concurrent tabs cannot retry failures repeatedly.
export const reserveThumbnails = (expected, owner) => transaction(state => {
  const now = Date.now()
  if (state.epoch !== expected || state.owner !== owner || !validSnapshot(state, now)) return []
  const gallery = state.snapshot.datasets.gallery?.data || []
  const saved = gallery.filter(item => item.thumbnail instanceof Blob).length
  const candidates = gallery.filter(item => item.category === 'photo' && item.thumbnailKey && !item.thumbnail && (!item.thumbnailAttemptAt || now - item.thumbnailAttemptAt >= 3600000)).slice(0, Math.max(0, 40 - saved))
  for (const item of candidates) item.thumbnailAttemptAt = now
  return candidates.map(item => item.id)
})

export const read = () => transaction(state => {
  const s = state.snapshot
  const now = Date.now()
  // A backwards clock change invalidates this local grant rather than extending it.
  if (!validSnapshot(state, now)) {
    state.snapshot = null
    return null
  }
  if (!s.analyticsRanges && s.datasets.analytics?.available) {
    const data = summary(s.datasets.analytics.data)
    s.analyticsRanges = data ? { '7d': { data, startedAt: s.savedAt, savedAt: s.savedAt, expiresAt: s.expiresAt } } : {}
    delete s.datasets.analytics
  }
  for (const [range, item] of Object.entries(s.analyticsRanges || {})) {
    if (!RANGES.includes(range) || !validRange(item, now)) delete s.analyticsRanges[range]
  }
  s.lastSeen = now
  return s
})