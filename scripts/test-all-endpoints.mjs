/**
 * Det 7:e Gunget - Fullständig API Testsvit för Spara & Uppdatera Endpoints
 * 
 * Testar ALLA tillgängliga spara- och uppdaterings-endpoints:
 * - Autentisering & sessioner
 * - Bandmedlemmar (Band Lore, bios, instrument)
 * - Spelningar / Gigs (skapa & uppdatera)
 * - Låtar & diskografi (skapa & uppdatera)
 * - Galleri (skapa & uppdatera)
 * - Setlist / Repertoar (skapa & uppdatera)
 * - Sajtinställningar (settings)
 * - Hashtaggar & sociala taggar
 * - Meddelanden / bokningar (status & adminanteckningar)
 * - Adminanvändare (skapa & behörighet)
 * - EPK Dokument (skapa & toggle aktiv)
 * - EPK Galleri-toggle
 * - Fan Central (granskning & e-postspärr)
 * - Låt-idéer / Voice Memos (skapa & uppdatera)
 * - Adminprofil (uppdatera namn & avatar)
 * - Publika formulär (Kontakt/Bokning, Nyhetsbrev)
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createClient } from '@libsql/client'
import 'dotenv/config'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

const dbClient = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

let passed = 0
let failed = 0
const results = []
let spawnedServerProcess = null

async function ensureServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/band`, { signal: AbortSignal.timeout(1500) })
    if (res.status === 200) {
      return
    }
  } catch (_) {
    // Server is not running
  }

  console.log(`ℹ Ingen aktiv server svarade på ${BASE_URL}. Startar temporär server för testkörning...`)
  const isWindows = process.platform === 'win32'
  const hasProdBuild = existsSync('.output/server/index.mjs')

  if (hasProdBuild) {
    spawnedServerProcess = spawn('node', ['.output/server/index.mjs'], {
      env: { ...process.env, PORT: '3000' },
      stdio: 'ignore',
      shell: isWindows,
    })
  } else {
    spawnedServerProcess = spawn('node', ['./node_modules/nuxt/bin/nuxt.mjs', 'dev', '--port', '3000'], {
      env: { ...process.env, PORT: '3000' },
      stdio: 'ignore',
      shell: isWindows,
    })
  }

  const maxAttempts = 35
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    try {
      const res = await fetch(`${BASE_URL}/api/band`, { signal: AbortSignal.timeout(1000) })
      if (res.status === 200) {
        console.log(`✓ Test-server är igång och svarar på ${BASE_URL}.\n`)
        return
      }
    } catch (_) {}
  }
  throw new Error(`Kunde inte få kontakt med test-servern på ${BASE_URL} inom 35s.`)
}

function assert(condition, name, details = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
    results.push({ name, status: 'PASS', details })
  } else {
    failed++
    console.error(`  ✕ ${name} - ${details}`)
    results.push({ name, status: 'FAIL', details })
  }
}

async function run() {
  console.log('\n============================================================')
  console.log('🎸 DET 7:E GUNGET - TESTSVIT FÖR ALLA SPARA & UPPDATERA ENDPOINTS')
  console.log(`Mål-server: ${BASE_URL}`)
  console.log('============================================================\n')

  await ensureServer()

  const startTime = Date.now()

  // 1. AUTENTISERING
  console.log('▶ [1/17] Autentisering (POST /api/auth/login)')
  let sessionCookie = ''
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'janis', password: 'gunget2026!' }),
    })
    const loginData = await loginRes.json()
    const setCookie = loginRes.headers.get('set-cookie')
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0]
    }
    assert(loginRes.status === 200 && loginData.success, 'Inloggning som Janis lyckades (200 OK)')
    assert(sessionCookie.startsWith('gunget_session='), 'Korrekt sessions-kaka mottagen (gunget_session)')
  } catch (err) {
    assert(false, 'Inloggning kraschade', err.message)
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: sessionCookie,
  }

  // 2. BANDMEDLEMMAR (POST /api/admin/band)
  console.log('\n▶ [2/17] Bandmedlemmar (POST /api/admin/band)')
  try {
    // Hämta befintlig medlemsdata för Janis
    const currentRes = await fetch(`${BASE_URL}/api/band`, { headers: { 'Cache-Control': 'no-cache' } })
    const members = await currentRes.json()
    const janis = members.find((m) => m.id === 'member-janis') || members[0]
    const testStamp = Date.now()
    const newBioSv = `Frontman & munspelskung. Test-uppdatering ${testStamp}`

    const updateRes = await fetch(`${BASE_URL}/api/admin/band`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: janis.id,
        name: janis.name,
        role: janis.role,
        bioSv: newBioSv,
        bioEn: janis.bioEn || '',
        photoUrl: janis.photoUrl || '',
        gearSv: 'Hohner Marine Band Deluxe',
        gearEn: janis.gearEn || '',
        favoriteChord: 'A7',
        weaknessSv: 'Munstyckeskaffe',
        coffeeConsumption: '4 koppar',
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'POST /api/admin/band returnerar 200 OK och success:true')

    // Verifiera i databasen direkt
    const dbCheck = await dbClient.execute({
      sql: 'SELECT bio_sv, gear_sv FROM band_members WHERE id = ?',
      args: [janis.id],
    })
    assert(dbCheck.rows[0]?.bio_sv === newBioSv, 'Databasen har uppdaterats med den nya biografin')

    // Verifiera att GET /api/band returnerar no-cache för administratör
    const fetchAgain = await fetch(`${BASE_URL}/api/band`, { headers: authHeaders })
    const reloadedMembers = await fetchAgain.json()
    const reloadedJanis = reloadedMembers.find((m) => m.id === janis.id)
    assert(reloadedJanis?.bioSv === newBioSv, 'GET /api/band returnerar omedelbart den färska biografin för inloggad admin')
    assert(fetchAgain.headers.get('cache-control')?.includes('no-store'), 'GET /api/band skickar no-store/no-cache header för admin')
  } catch (err) {
    assert(false, 'Bandmedlems-test misslyckades', err.message)
  }

  // 3. GIGS / SPELNINGAR (POST /api/admin/gigs)
  console.log('\n▶ [3/17] Spelningar / Gigs (POST /api/admin/gigs)')
  let testGigId = ''
  try {
    // Skapa ny spelning (utan id i payload för att trigga skapande)
    const createRes = await fetch(`${BASE_URL}/api/admin/gigs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        venue: 'Katalin Blues Club',
        city: 'Uppsala',
        date: new Date(Date.now() + 86400000 * 30).toISOString(),
        ticketUrl: 'https://katalin.com/tickets',
        status: 'upcoming',
        notesSv: 'Testspelning inför fulla hus',
        setlistItems: [{ title: 'Stormy Monday', artist: 'T-Bone Walker', setName: 'Set 1' }],
      }),
    })
    const createData = await createRes.json()
    testGigId = createData.id
    assert(createRes.status === 200 && createData.success && Boolean(testGigId), 'Skapa spelning (POST /api/admin/gigs) lyckades (200)')

    // Uppdatera spelningen
    const updateRes = await fetch(`${BASE_URL}/api/admin/gigs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: testGigId,
        venue: 'Katalin Blues Club & Bar',
        city: 'Uppsala',
        date: new Date(Date.now() + 86400000 * 30).toISOString(),
        status: 'sold_out',
        notesSv: 'Uppdaterat: Slutsålt!',
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'Uppdatera spelning lyckades (200)')

    const dbGig = await dbClient.execute({ sql: 'SELECT venue, status FROM gigs WHERE id = ?', args: [testGigId] })
    assert(dbGig.rows[0]?.venue === 'Katalin Blues Club & Bar' && dbGig.rows[0]?.status === 'sold_out', 'Databasen har uppdaterats med spelningens nya status')
  } catch (err) {
    assert(false, 'Spelnings-test misslyckades', err.message)
  }

  // 4. LÅTAR / DISKOGRAFI (POST /api/admin/songs)
  console.log('\n▶ [4/17] Låtar / Diskografi (POST /api/admin/songs)')
  let testSongId = ''
  try {
    // Skapa låt
    const createRes = await fetch(`${BASE_URL}/api/admin/songs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Midnattsblues i G-moll',
        isOriginal: true,
        embedProvider: 'spotify',
        embedUrl: 'https://open.spotify.com/track/test1234',
        duration: 245,
        lyrics: 'När klockan slår tolv och regnet öser ner...',
        lyricsEn: 'When the clock strikes twelve...',
        chords: 'Gm - Cm - D7',
      }),
    })
    const createData = await createRes.json()
    testSongId = createData.id
    assert(createRes.status === 200 && createData.success && Boolean(testSongId), 'Skapa låt (POST /api/admin/songs) lyckades (200)')

    // Uppdatera låt
    const updateRes = await fetch(`${BASE_URL}/api/admin/songs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: testSongId,
        title: 'Midnattsblues i G-moll (Remaster)',
        isOriginal: true,
        embedProvider: 'spotify',
        embedUrl: 'https://open.spotify.com/track/test1234',
        duration: 250,
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'Uppdatera låt lyckades (200)')

    const dbSong = await dbClient.execute({ sql: 'SELECT title FROM songs WHERE id = ?', args: [testSongId] })
    assert(dbSong.rows[0]?.title === 'Midnattsblues i G-moll (Remaster)', 'Databasen har uppdaterats med ny låttitel')
  } catch (err) {
    assert(false, 'Låt-test misslyckades', err.message)
  }

  // 5. GALLERI (POST /api/admin/gallery)
  console.log('\n▶ [5/17] Galleri (POST /api/admin/gallery)')
  let testGalId = ''
  try {
    // Skapa galleribild
    const createRes = await fetch(`${BASE_URL}/api/admin/gallery`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'photo',
        mediaUrl: '/media/gallery/test-live.jpg',
        frameStyle: 'polaroid',
        captionSv: 'Från giget på Fasching',
        captionEn: 'Live at Fasching',
        altTextSv: 'Det 7:e Gunget live',
        altTextEn: 'Det 7:e Gunget performing live',
        isEpk: false,
      }),
    })
    const createData = await createRes.json()
    testGalId = createData.id
    assert(createRes.status === 200 && createData.success && Boolean(testGalId), 'Skapa galleribild (POST /api/admin/gallery) lyckades (200)')

    // Uppdatera galleribild
    const updateRes = await fetch(`${BASE_URL}/api/admin/gallery`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: testGalId,
        mediaUrl: '/media/gallery/test-live.jpg',
        frameStyle: 'wood',
        captionSv: 'Uppdaterad: Fantastisk konsert på Fasching!',
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'Uppdatera galleribild lyckades (200)')

    const dbGal = await dbClient.execute({ sql: 'SELECT frame_style, caption_sv FROM gallery_items WHERE id = ?', args: [testGalId] })
    assert(dbGal.rows[0]?.frame_style === 'wood', 'Databasen har uppdaterats med ny ramstil')
  } catch (err) {
    assert(false, 'Galleri-test misslyckades', err.message)
  }

  // 6. SETLIST / REPERTOAR (POST /api/admin/setlist)
  console.log('\n▶ [6/17] Setlist / Repertoar (POST /api/admin/setlist)')
  let testSetId = ''
  try {
    // Skapa setlist-låt
    const createRes = await fetch(`${BASE_URL}/api/admin/setlist`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Crossroads',
        artist: 'Robert Johnson',
        isOriginal: false,
        setName: 'Set 2',
        sortOrder: 1,
        notes: 'Snabbt tempo, trumsolo i slutet',
      }),
    })
    const createData = await createRes.json()
    testSetId = createData.id
    assert(createRes.status === 200 && createData.success && Boolean(testSetId), 'Skapa setlist-låt (POST /api/admin/setlist) lyckades (200)')

    // Uppdatera setlist-låt
    const updateRes = await fetch(`${BASE_URL}/api/admin/setlist`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: testSetId,
        title: 'Crossroads (Extended)',
        artist: 'Cream / Robert Johnson',
        isOriginal: false,
        setName: 'Extranummer',
        sortOrder: 99,
        notes: 'Dubbla munspelsdueller',
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'Uppdatera setlist-låt lyckades (200)')

    const dbSet = await dbClient.execute({ sql: 'SELECT title, set_name FROM setlist_items WHERE id = ?', args: [testSetId] })
    assert(dbSet.rows[0]?.title === 'Crossroads (Extended)' && dbSet.rows[0]?.set_name === 'Extranummer', 'Databasen har uppdaterats med rätt setnamn')
  } catch (err) {
    assert(false, 'Setlist-test misslyckades', err.message)
  }

  // 7. INSTÄLLNINGAR (POST /api/admin/settings)
  console.log('\n▶ [7/17] Sajtinställningar (POST /api/admin/settings)')
  try {
    const updateRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        newsletterEnabled: true,
        landingSongCount: 6,
        landingMerchCount: 4,
        discordNotifyBookings: true,
        discordNotifyFanPhotos: false,
        discordNotifyGuestbook: true,
        socialMockMode: true,
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'POST /api/admin/settings returnerar 200 OK')

    const dbSettings = await dbClient.execute({
      sql: "SELECT value FROM site_settings WHERE key = 'landing_song_count'",
    })
    assert(dbSettings.rows[0]?.value === '6', 'Inställningen landing_song_count sparades korrekt till databasen')
  } catch (err) {
    assert(false, 'Inställnings-test misslyckades', err.message)
  }

  // 8. HASHTAGGAR (POST /api/admin/hashtags)
  console.log('\n▶ [8/17] Sociala Hashtaggar (POST /api/admin/hashtags)')
  let testTagId = ''
  try {
    const createRes = await fetch(`${BASE_URL}/api/admin/hashtags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tag: '#StockholmBlues',
        categories: ['gigs', 'social'],
        isActive: true,
        sortOrder: 5,
      }),
    })
    const createData = await createRes.json()
    testTagId = createData.id
    assert(createRes.status === 200 && createData.success && Boolean(testTagId), 'Skapa hashtag (POST /api/admin/hashtags) lyckades (200)')

    const updateRes = await fetch(`${BASE_URL}/api/admin/hashtags`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: testTagId,
        tag: '#StockholmBluesLive',
        categories: ['all'],
        isActive: false,
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'Uppdatera hashtag lyckades (200)')

    const dbTag = await dbClient.execute({ sql: 'SELECT tag, is_active FROM social_hashtags WHERE id = ?', args: [testTagId] })
    assert(dbTag.rows[0]?.tag === '#StockholmBluesLive' && dbTag.rows[0]?.is_active === 0, 'Hashtag uppdaterad och avaktiverad i databasen')
  } catch (err) {
    assert(false, 'Hashtag-test misslyckades', err.message)
  }

  // 9. MEDDELANDEN / BOKNINGSSTATUS (PATCH /api/admin/messages)
  console.log('\n▶ [9/17] Meddelanden & Bokningsstatus (PATCH /api/admin/messages)')
  const testMsgId = `test-msg-${Date.now()}`
  try {
    // Lägg till ett meddelande direkt för test
    await dbClient.execute({
      sql: 'INSERT INTO messages (id, name, email, event_type, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [testMsgId, 'Bokare Testsson', 'bokare@test.se', 'Festival', 'Vill boka er för festival', 'unread', Date.now()],
    })

    const patchRes = await fetch(`${BASE_URL}/api/admin/messages`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        id: testMsgId,
        status: 'accepted',
        adminNotes: 'Bokning bekräftad via telefon',
      }),
    })
    const patchData = await patchRes.json()
    assert(patchRes.status === 200 && patchData.success, 'PATCH /api/admin/messages uppdaterade status (200)')

    const dbMsg = await dbClient.execute({ sql: 'SELECT status, admin_notes FROM messages WHERE id = ?', args: [testMsgId] })
    assert(dbMsg.rows[0]?.status === 'accepted' && dbMsg.rows[0]?.admin_notes === 'Bokning bekräftad via telefon', 'Bokningsstatus och adminnotering sparad i databasen')
  } catch (err) {
    assert(false, 'Meddelande-test misslyckades', err.message)
  }

  // 10. ADMINANVÄNDARE (POST /api/admin/users)
  console.log('\n▶ [10/17] Adminanvändare (POST /api/admin/users)')
  const testAdminEmail = `test-tech-${Date.now()}@det7egunget.se`
  let createdAdminId = ''
  try {
    const createRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Ljudtekniker Niklas',
        email: testAdminEmail,
        username: `tech_${Date.now()}`,
        role: 'Ljudtekniker',
        password: 'TechPassword2026!',
      }),
    })
    const createData = await createRes.json()
    createdAdminId = createData.id
    assert(createRes.status === 200 && createData.success, 'Skapa admin (POST /api/admin/users) lyckades (200)')

    const dbAdmin = await dbClient.execute({ sql: 'SELECT name, role FROM admins WHERE email = ?', args: [testAdminEmail] })
    assert(dbAdmin.rows[0]?.name === 'Ljudtekniker Niklas', 'Ny adminanvändare skapad i databasen')
  } catch (err) {
    assert(false, 'Adminanvändar-test misslyckades', err.message)
  }

  // 11. EPK DOKUMENT (POST /api/admin/epk/documents & toggle)
  console.log('\n▶ [11/17] EPK Dokumenthanterare (POST /api/admin/epk/documents)')
  let testDocId = ''
  try {
    const createRes = await fetch(`${BASE_URL}/api/admin/epk/documents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleSv: 'Teknisk Rider 2026',
        titleEn: 'Technical Rider 2026',
        fileUrl: '/epk/rider.pdf',
        fileType: 'pdf',
        fileSize: '1.2 MB',
        category: 'rider',
        sortOrder: 1,
        isActive: true,
      }),
    })
    const createData = await createRes.json()
    testDocId = createData.id
    assert(createRes.status === 200 && createData.success && Boolean(testDocId), 'Skapa EPK-dokument lyckades (200)')

    // Toggle active state
    const toggleRes = await fetch(`${BASE_URL}/api/admin/epk/documents/toggle-active`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ id: testDocId }),
    })
    const toggleData = await toggleRes.json()
    assert(toggleRes.status === 200 && toggleData.isActive === false, 'Toggle EPK-dokument inaktivt lyckades (200)')

    const dbDoc = await dbClient.execute({ sql: 'SELECT is_active FROM epk_documents WHERE id = ?', args: [testDocId] })
    assert(dbDoc.rows[0]?.is_active === 0, 'EPK-dokumentets aktiva status uppdaterad i databasen')
  } catch (err) {
    assert(false, 'EPK-dokument test misslyckades', err.message)
  }

  // 12. EPK GALLERI TOGGLE (POST /api/admin/gallery/toggle-epk)
  console.log('\n▶ [12/17] EPK Galleri-toggle (POST /api/admin/gallery/toggle-epk)')
  try {
    const toggleRes = await fetch(`${BASE_URL}/api/admin/gallery/toggle-epk`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ id: testGalId, resolution: '3000x2000' }),
    })
    const toggleData = await toggleRes.json()
    assert(toggleRes.status === 200 && toggleData.isEpk === true, 'Galleribild markerad som EPK-pressbild (200)')

    const dbGal = await dbClient.execute({ sql: 'SELECT is_epk FROM gallery_items WHERE id = ?', args: [testGalId] })
    assert(dbGal.rows[0]?.is_epk === 1, 'Databasen har uppdaterat is_epk till 1')
  } catch (err) {
    assert(false, 'Galleri EPK toggle misslyckades', err.message)
  }

  // 13. FAN CENTRAL GRANSKNING & SPÄRR (POST /api/admin/fan-central/review & ban-email)
  console.log('\n▶ [13/17] Fan Central Granskning & Spärr')
  const testSubId = `test-sub-${Date.now()}`
  const spammerEmail = `spammer-${Date.now()}@testbad.com`
  try {
    // Lägg in en submissionspost direkt
    await dbClient.execute({
      sql: 'INSERT INTO fan_submissions (id, media_url, uploader_name, uploader_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [testSubId, '/media/fans/bad.jpg', 'Spam Bot', spammerEmail, 'pending', Date.now(), Date.now()],
    })

    // Godkänn
    const approveRes = await fetch(`${BASE_URL}/api/admin/fan-central/review`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ id: testSubId, action: 'approve', caption: 'Superbild!', fastenerType: 'tape' }),
    })
    const approveData = await approveRes.json()
    assert(approveRes.status === 200 && approveData.success, 'Godkänn fan-foto (POST /api/admin/fan-central/review) lyckades (200)')

    // Spärra e-post
    const banRes = await fetch(`${BASE_URL}/api/admin/fan-central/ban-email`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: spammerEmail, reason: 'Olämpligt spam-innehåll' }),
    })
    const banData = await banRes.json()
    assert(banRes.status === 200 && banData.success, 'Spärra e-post (POST /api/admin/fan-central/ban-email) lyckades (200)')

    const dbBan = await dbClient.execute({ sql: 'SELECT email FROM banned_emails WHERE email = ?', args: [spammerEmail] })
    assert(dbBan.rows[0]?.email === spammerEmail, 'E-post spärrad i databasen')
  } catch (err) {
    assert(false, 'Fan Central review test misslyckades', err.message)
  }

  // 14. LÅT-IDÉER / VOICE MEMOS (POST & PUT /api/admin/ideas)
  console.log('\n▶ [14/17] Låt-idéer & Voice Memos (POST & PUT /api/admin/ideas)')
  const testIdeaId = `test-idea-${Date.now()}`
  try {
    // Skapa idé
    const createRes = await fetch(`${BASE_URL}/api/admin/ideas`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        id: testIdeaId,
        title: 'Akustiskt shuffle-riff',
        audioUrl: '/audio/ideas/shuffle-riff.mp3',
        bpm: 116,
        key: 'E-dur',
        tags: 'intro, acoustic, shuffle',
        notes: 'Inspelat på telefonen i replokalen',
      }),
    })
    const createData = await createRes.json()
    assert(createRes.status === 200 && createData.success, 'Skapa låtidé (POST /api/admin/ideas) lyckades (200)')

    // Uppdatera idé
    const putRes = await fetch(`${BASE_URL}/api/admin/ideas/${testIdeaId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Akustiskt shuffle-riff (Nytt tempo)',
        bpm: 124,
        key: 'E-dur',
        tags: 'intro, acoustic, shuffle, ready',
        notes: 'Ökat BPM till 124',
      }),
    })
    const putData = await putRes.json()
    assert(putRes.status === 200 && putData.success, `Uppdatera låtidé (PUT /api/admin/ideas/${testIdeaId}) lyckades (200)`)

    const dbIdea = await dbClient.execute({ sql: 'SELECT title, bpm FROM voice_memos WHERE id = ?', args: [testIdeaId] })
    assert(dbIdea.rows[0]?.title === 'Akustiskt shuffle-riff (Nytt tempo)' && dbIdea.rows[0]?.bpm === 124, 'Låtidé uppdaterad i databasen med nytt tempo')
  } catch (err) {
    assert(false, 'Låtidé test misslyckades', err.message)
  }

  // 15. ADMINPROFIL (PUT /api/auth/profile)
  console.log('\n▶ [15/17] Adminprofil (PUT /api/auth/profile)')
  try {
    const updateRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Janis (Lead Vocals)',
        email: 'janis_k@hotmail.com',
        avatarUrl: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg',
      }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200 && updateData.success, 'Uppdatera adminprofil (PUT /api/auth/profile) lyckades (200)')

    // Återställ namnet till rent Janis
    await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Janis', email: 'janis_k@hotmail.com' }),
    })
  } catch (err) {
    assert(false, 'Adminprofil test misslyckades', err.message)
  }

  // 16. PUBLIK BOKNINGSFÖRFRÅGAN (POST /api/contact)
  console.log('\n▶ [16/17] Publikt Bokningsformulär (POST /api/contact)')
  try {
    const contactRes = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Testbokare Festival',
        email: 'bokning@festivaltest.se',
        phone: '070-1234567',
        eventType: 'Festival',
        venue: 'Parkfestivalen',
        city: 'Göteborg',
        message: 'Hej! Vi vill gärna boka Det 7:e Gunget för en spelning i augusti!',
      }),
    })
    const contactData = await contactRes.json()
    assert(contactRes.status === 200 && contactData.success, 'Skicka bokningsförfrågan (POST /api/contact) lyckades (200)')

    const dbInquiry = await dbClient.execute({
      sql: 'SELECT id, name FROM messages WHERE email = ?',
      args: ['bokning@festivaltest.se'],
    })
    assert(dbInquiry.rows.length > 0, 'Bokningsförfrågan sparades i tabellen messages')
    if (dbInquiry.rows[0]?.id) {
      await dbClient.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [dbInquiry.rows[0].id] })
    }
  } catch (err) {
    assert(false, 'Bokningsformulär test misslyckades', err.message)
  }

  // 17. PUBLIKT NYHETSBREV (POST /api/newsletter)
  console.log('\n▶ [17/17] Publikt Nyhetsbrev (POST /api/newsletter)')
  const testSubEmail = `fan-${Date.now()}@gungetfans.se`
  try {
    const subRes = await fetch(`${BASE_URL}/api/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testSubEmail }),
    })
    const subData = await subRes.json()
    assert(subRes.status === 200 && subData.success, 'Prenumerera på nyhetsbrev (POST /api/newsletter) lyckades (200)')

    const dbSub = await dbClient.execute({ sql: 'SELECT email FROM subscribers WHERE email = ?', args: [testSubEmail] })
    assert(dbSub.rows[0]?.email === testSubEmail, 'Prenumerant sparades i tabellen subscribers')
    await dbClient.execute({ sql: 'DELETE FROM subscribers WHERE email = ?', args: [testSubEmail] })
  } catch (err) {
    assert(false, 'Nyhetsbrev test misslyckades', err.message)
  }

  // --- STÄDNING AV TESTDATA ---
  console.log('\n🧹 Städning av testposter...')
  try {
    if (testGigId) await dbClient.execute({ sql: 'DELETE FROM gigs WHERE id = ?', args: [testGigId] })
    if (testSongId) await dbClient.execute({ sql: 'DELETE FROM songs WHERE id = ?', args: [testSongId] })
    if (testGalId) await dbClient.execute({ sql: 'DELETE FROM gallery_items WHERE id = ?', args: [testGalId] })
    if (testSetId) await dbClient.execute({ sql: 'DELETE FROM setlist_items WHERE id = ?', args: [testSetId] })
    if (testTagId) await dbClient.execute({ sql: 'DELETE FROM social_hashtags WHERE id = ?', args: [testTagId] })
    await dbClient.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [testMsgId] })
    if (testDocId) await dbClient.execute({ sql: 'DELETE FROM epk_documents WHERE id = ?', args: [testDocId] })
    await dbClient.execute({ sql: 'DELETE FROM fan_submissions WHERE id = ?', args: [testSubId] })
    await dbClient.execute({ sql: 'DELETE FROM banned_emails WHERE email = ?', args: [spammerEmail] })
    await dbClient.execute({ sql: 'DELETE FROM voice_memos WHERE id = ?', args: [testIdeaId] })
    if (createdAdminId) {
      await dbClient.execute({ sql: 'DELETE FROM admins WHERE id = ?', args: [createdAdminId] })
    }
    console.log('  ✓ Alla tillfälliga testposter raderades framgångsrikt.')
  } catch (err) {
    console.error('  ! Städning gav varning:', err.message)
  } finally {
    if (spawnedServerProcess) {
      console.log('🛑 Stänger ner temporär test-server...')
      spawnedServerProcess.kill()
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log('\n============================================================')
  console.log(`SLUTRESULTAT: ${passed} godkända, ${failed} felaktiga (${durationSec} sekunder)`)
  console.log('============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((e) => {
  if (spawnedServerProcess) {
    spawnedServerProcess.kill()
  }
  console.error('Testsvit kraschade:', e)
  process.exit(1)
})
