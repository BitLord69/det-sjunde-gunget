import { clear, read } from '/admin/offline-store.js'

navigator.serviceWorker?.controller?.postMessage('offline-reader')
const status = document.querySelector('#status')
const content = document.querySelector('#content')
const nav = document.querySelector('#navigation')
const logoutButton = document.querySelector('#logout')
const logoutStatus = document.querySelector('#logout-status')
const labels = { songs: 'Låtar & texter', setlist: 'Setlist', gigs: 'Spelningar', analytics: 'Statistik', gallery: 'Galleri' }
const ranges = { today: 'Idag (24h)', '7d': '7 dagar', '30d': '30 dagar', '90d': '90 dagar', all: 'All tid' }
const paths = { '/admin/songs': 'songs', '/admin/setlist': 'setlist', '/admin/gigs': 'gigs', '/admin/analytics': 'analytics', '/admin/gallery': 'gallery' }
const sourcePath = location.pathname === '/admin/offline.html' ? (new URLSearchParams(location.search).get('from') || '/admin') : location.pathname
let view = paths[sourcePath] || 'songs'
let range = '7d'
let snapshot = null
let expiryTimer = null
let imageUrls = []
let unsupported = !['/admin', '/admin/', ...Object.keys(paths)].includes(sourcePath)

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true
  let localFailed = false
  try { sessionStorage.removeItem('admin-offline-login') } catch { /* Local storage may be unavailable. */ }
  try { await clear(true) } catch { localFailed = true }
  await refresh()
  let serverFailed = false
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!response.ok || !(await response.json()).revoked) serverFailed = true
  } catch { serverFailed = true }
  logoutStatus.textContent = [
    localFailed ? 'Den lokala kopian kunde inte rensas. Rensa webbplatsens lagring manuellt på enheten.' : 'Den lokala kopian har rensats.',
    serverFailed ? 'Serverutloggningen kunde inte bekräftas och sessionen kan fortfarande gälla. Anslut och försök igen med knappen. Vid misstänkt stulen cookie, kontakta en administratör för manuell återkallelse; lösenordsbyte återkallar inte befintliga sessioner.' : 'Servern bekräftade utloggningen.',
  ].join(' ')
  logoutButton.textContent = serverFailed ? 'Försök serverutloggning igen' : 'Logga ut'
  logoutButton.disabled = false
})

function node(tag, text, className) {
  const el = document.createElement(tag)
  if (text != null) el.textContent = String(text)
  if (className) el.className = className
  return el
}
function date(value) {
  const parsed = new Date(value)
  return value && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString('sv-SE', { dateStyle: 'medium' }) : ''
}
function render() {
  for (const url of imageUrls) URL.revokeObjectURL(url)
  imageUrls = []
  content.replaceChildren()
  nav.hidden = !snapshot
  if (!snapshot) {
    status.textContent = 'Ingen giltig lokal kopia finns. Anslut till internet, logga in och låt offlineförberedelsen bli klar.'
    return
  }
  status.textContent = `Endast läsning. Senast förberedd ${new Date(snapshot.savedAt).toLocaleString('sv-SE')}. Lokal åtkomst upphör ${new Date(snapshot.expiresAt).toLocaleString('sv-SE')}.`
  if (unsupported) {
    content.append(node('p', 'Den här adminsidan finns inte offline. Välj en av de tillgängliga läsvyerna ovan.'))
    return
  }
  for (const button of nav.querySelectorAll('button')) button.setAttribute('aria-current', String(button.dataset.view === view))
  content.append(node('h2', labels[view]))
  if (view === 'analytics') {
    const selector = node('div')
    selector.setAttribute('aria-label', 'Statistikintervall')
    for (const [key, label] of Object.entries(ranges)) {
      const button = node('button', label)
      button.dataset.range = key
      button.setAttribute('aria-pressed', String(range === key))
      selector.append(button, ' ')
    }
    content.append(selector)
    const item = snapshot.analyticsRanges?.[range]
    if (!item) {
      content.append(node('p', 'Ingen giltig kopia för detta intervall finns. Hämta intervallet i statistikvyn online och vänta på offlineförberedelsen.'))
      return
    }
    content.append(node('p', `Sammanfattning sparad ${new Date(item.savedAt).toLocaleString('sv-SE')}. Siffrorna uppdateras inte offline.`))
    const grid = node('div', null, 'grid')
    for (const [key, label] of Object.entries({ visitors: 'Unika besökare', pageviews: 'Sidvisningar', lyricsViews: 'Låttextvisningar', jukeboxPlays: 'Jukeboxspelningar' })) {
      const card = node('div', null, 'card')
      card.append(node('h3', label), node('p', item.data[key]))
      grid.append(card)
    }
    content.append(grid)
    return
  }
  const dataset = snapshot.datasets[view]
  if (!dataset?.available) {
    content.append(node('p', 'Denna information kunde inte förberedas. Anslut och försök igen.'))
    return
  }
  if (view === 'gallery') {
    const images = snapshot.thumbnailStatus
    content.append(node('p', images ? `Miniatyrer: ${images.saved} av ${images.total} bilder tillgängliga. Övriga bilder kunde inte förberedas eller ryms inte i lagringen.` : 'Miniatyrer har inte förberetts eller är inte tillgängliga.'))
  }
  const items = dataset.data
  if (!Array.isArray(items) || !items.length) { content.append(node('p', 'Inga poster i den sparade kopian.')); return }
  const grid = node('div', null, 'grid')
  for (const item of items) {
    const card = node('article', null, 'card')
    if (view === 'songs') {
      card.append(node('h3', item.title), node('p', item.originalArtist || (item.isOriginal ? 'Egen låt' : '')))
      for (const [key, label] of [['lyrics', 'Text'], ['lyricsEn', 'Engelsk text'], ['chords', 'Ackord']]) {
        if (!item[key]) continue
        const details = node('details'); details.append(node('summary', label), node('p', item[key], 'lyrics')); card.append(details)
      }
    } else if (view === 'setlist') {
      card.append(node('h3', item.title), node('p', [item.artist, item.setName].filter(Boolean).join(' · ')))
      if (item.notes) card.append(node('p', item.notes, 'lyrics'))
    } else if (view === 'gigs') {
      card.append(node('h3', [item.venue, item.city].filter(Boolean).join(' · ')), node('p', [date(item.date), item.status].filter(Boolean).join(' · ')))
      if (item.notesSv) card.append(node('p', item.notesSv, 'lyrics'))
    } else {
      if (item.thumbnail instanceof Blob) {
        const image = node('img')
        image.src = URL.createObjectURL(item.thumbnail)
        imageUrls.push(image.src)
        image.alt = item.alt || item.caption || 'Galleribild'
        image.loading = 'lazy'
        card.append(image)
      } else if (item.category === 'photo') card.append(node('p', 'Miniatyr saknas offline.'))
      card.append(node('h3', item.caption || item.alt || 'Galleriobjekt'), node('p', [item.category, date(item.takenAt)].filter(Boolean).join(' · ')))
    }
    grid.append(card)
  }
  content.append(grid)
}
async function refresh() {
  try { snapshot = await read() } catch { snapshot = null; status.textContent = 'Lokal lagring är inte tillgänglig.' }
  clearTimeout(expiryTimer)
  if (snapshot) {
    const expiries = Object.values(snapshot.analyticsRanges || {}).map(item => item.expiresAt)
    expiryTimer = setTimeout(refresh, Math.max(1, Math.min(2147483647, snapshot.expiresAt - Date.now(), ...expiries.map(time => time - Date.now()))))
  }
  render()
}
nav.addEventListener('click', event => {
  const button = event.target.closest('button[data-view]')
  if (!button || !labels[button.dataset.view]) return
  view = button.dataset.view; unsupported = false; refresh()
})
content.addEventListener('click', event => {
  const button = event.target.closest('button[data-range]')
  if (!button || !Object.hasOwn(ranges, button.dataset.range)) return
  range = button.dataset.range
  refresh()
})
if ('BroadcastChannel' in globalThis) new BroadcastChannel('gunget-admin-offline').onmessage = refresh
window.addEventListener('focus', refresh)
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh() })
setInterval(refresh, 30000)
refresh()