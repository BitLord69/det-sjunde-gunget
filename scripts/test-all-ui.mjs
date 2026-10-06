/**
 * Det 7:e Gunget - Fullständig UI/Browser E2E Testsvit för Spara & Uppdatera
 * 
 * Använder Playwright & Chrome för att automatiskt testa användargränssnittet i webbläsare:
 * 1. Autentiserad session (injicerad direkt i webbläsarkontexten)
 * 2. Bandmedlemmar (/admin/band) - Redigera profil, spara, kontrollera toast, omedelbar kort-uppdatering och persistens vid omladdning
 * 3. Spelningar (/admin/gigs) - Klicka "+ Nytt gig", fyll i formulär, klicka "Spara gig", verifiera att det syns i listan
 * 4. Låtar (/admin/songs) - Klicka "+ Ny låt", fyll i låt och länk, klicka "Spara låt", verifiera att den syns i listan
 * 5. Setlist (/admin/setlist) - Klicka "+ Ny låt i setlistan", fyll i titel, klicka "Spara i setlistan", verifiera tabell
 * 6. Inställningar (/admin/settings) - Klicka "Spara inställningar", verifiera toast och feedback
 * 7. Hashtaggar (/admin/hashtags) - Fyll i "#TestRock", klicka "+ Lägg till tagg", verifiera badge
 * 8. Publikt bokningsformulär (/contact) - Fyll i bokningsformuläret och verifiera bekräftelse
 * 9. Formulärskydd & In-App Dialog-navigering (/admin/gigs) - Verifiera in-app modal, stanna kvar, navigera och discard vid klick i menyn
 */

import { chromium } from 'playwright'
import { createClient } from '@libsql/client'
import crypto from 'node:crypto'
import 'dotenv/config'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

const dbClient = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

let passed = 0
let failed = 0
const results = []

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
  console.log('🎭 DET 7:E GUNGET - UI E2E TESTSVIT FÖR FORMULÄR & SPARA-FLÖDEN')
  console.log(`Mål-server: ${BASE_URL}`)
  console.log('Webbläsare: Google Chrome / Playwright')
  console.log('============================================================\n')

  const startTime = Date.now()

  // 1. Skapa en giltig session direkt i databasen för testning
  console.log('▶ [1/8] Admin Autentisering & Sessions-injicering')
  const sessionToken = crypto.randomBytes(32).toString('hex')
  const sessionId = `sess-ui-${Date.now()}`
  const now = Date.now()
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000

  try {
    await dbClient.execute({
      sql: 'INSERT INTO admin_sessions (id, token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [sessionId, sessionToken, 'admin-janis', expiresAt, now],
    })
    assert(true, 'Skapade aktiv admin session i databasen för Janis')
  } catch (err) {
    assert(false, 'Kunde inte skapa admin session i databasen', err.message)
  }

  let browser
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    browser = await chromium.launch({ headless: true })
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })

  // Injicera sessions-kakan i Playwright Context
  await context.addCookies([
    {
      name: 'gunget_session',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    },
  ])

  const page = await context.newPage()
  page.on('pageerror', (err) => console.log('  [Browser Error]:', err.message))
  page.on('response', (res) => {
    if (res.url().includes('/api/admin/')) {
      console.log(`    [API ${res.request().method()}] ${res.url()} -> ${res.status()}`)
    }
  })

  try {
    // 2. BANDMEDLEMMAR
    console.log('\n▶ [2/8] Bandmedlemmar & Presentationer (/admin/band)')
    await page.goto(`${BASE_URL}/admin/band`, { waitUntil: 'networkidle' })

    const editBtns = await page.$$('button:has-text("Redigera profil")')
    assert(editBtns.length >= 4, `Hittade ${editBtns.length} bandmedlemskort i gränssnittet`)

    await editBtns[0].click()
    await page.waitForSelector('text=Redigera profil för Janis')
    assert(true, 'Redigeringsformulär för Janis öppnades')

    const testBioText = `Sångare & munspelsvirtuos. Sparad i UI-test: ${Date.now()}`
    const bioTextarea = await page.$('textarea')
    await bioTextarea.fill(testBioText)

    const saveMemberBtn = await page.$('button:has-text("Spara ändringar")')
    await saveMemberBtn.click()

    const toast = await page.waitForSelector('.fixed.bottom-6, .animate-bounce', { timeout: 4000 }).catch(() => null)
    const toastText = toast ? await toast.innerText() : ''
    assert(toastText.includes('uppdaterats') || toastText.includes('Medlemsprofilen'), 'Framgångs-toast dök upp efter klick på Spara')

    // Kontrollera att kortet i listan visar den nya texten omedelbart
    const memberBiosNow = await page.$$eval('.stage-card p', (els) => els.map((e) => e.innerText))
    const bioVisibleDirectly = memberBiosNow.some((b) => b.includes(testBioText))
    assert(bioVisibleDirectly, 'Den nya biografin syns omedelbart på Janis profilkort utan omladdning')

    // Ladda om sidan och bekräfta att det kvarstår
    await page.reload({ waitUntil: 'networkidle' })
    const memberBiosAfterReload = await page.$$eval('.stage-card p', (els) => els.map((e) => e.innerText))
    const bioVisibleAfterReload = memberBiosAfterReload.some((b) => b.includes(testBioText))
    assert(bioVisibleAfterReload, 'Den uppdaterade biografin kvarstår efter omladdning (ingen cache-stale)')

    // 3. SPELNINGAR (GIGS)
    console.log('\n▶ [3/8] Spelningar UI (/admin/gigs)')
    await page.goto(`${BASE_URL}/admin/gigs`, { waitUntil: 'networkidle' })
    const testVenue = `Kulturhuset Live ${Date.now()}`

    const addGigBtn = await page.$('button:has-text("+ Nytt gig")')
    assert(Boolean(addGigBtn), 'Knappen "+ Nytt gig" hittades i gränssnittet')
    if (addGigBtn) {
      await addGigBtn.click()
      await page.waitForSelector('text=Lägg till nytt gig')

      // Fyll i formulär
      const venueInput = await page.$('input[placeholder*="Kulturhuset"], input[placeholder*="Spelplats"]')
      if (venueInput) await venueInput.fill(testVenue)

      const cityInput = await page.$('input[placeholder*="Ängelholm"], input[placeholder*="Stad"]')
      if (cityInput) await cityInput.fill('Helsingborg')

      const dateInput = await page.$('input[type="date"]')
      if (dateInput) await dateInput.fill('2026-12-15')

      const saveGigBtn = await page.$('button:has-text("Spara gig")')
      assert(Boolean(saveGigBtn), 'Knappen "Spara gig" hittades')
      if (saveGigBtn) {
        await saveGigBtn.click()
        await page.waitForTimeout(1500)
        const gToast = await page.$('.animate-bounce')
        if (gToast) console.log('    [Gig Toast]:', await gToast.innerText())
        const gigsTableText = await page.innerText('body')
        assert(gigsTableText.includes(testVenue), 'Det nyskapade giget syns i tabellen över spelningar')

        await dbClient.execute({ sql: 'DELETE FROM gigs WHERE venue = ?', args: [testVenue] })
      }
    }

    // 4. LÅTAR (SONGS)
    console.log('\n▶ [4/8] Låtar UI (/admin/songs)')
    await page.goto(`${BASE_URL}/admin/songs`, { waitUntil: 'networkidle' })
    const testSongTitle = `UI Ny Blueslåt ${Date.now()}`

    const addSongBtn = await page.$('button:has-text("+ Ny låt")')
    assert(Boolean(addSongBtn), 'Knappen "+ Ny låt" hittades i gränssnittet')
    if (addSongBtn) {
      await addSongBtn.click()
      await page.waitForSelector('text=Lägg till ny låt')

      const titleInput = await page.$('input[placeholder*="Det 7:e Gunget"], input[placeholder*="Låttitel"]')
      if (titleInput) await titleInput.fill(testSongTitle)

      const embedInput = await page.$('input[placeholder*="open.spotify"], input[placeholder*="länk"]')
      if (embedInput) await embedInput.fill('https://open.spotify.com/track/test-ui-låt-123')

      const saveSongBtn = await page.$('button:has-text("Spara låt")')
      assert(Boolean(saveSongBtn), 'Knappen "Spara låt" hittades')
      if (saveSongBtn) {
        await saveSongBtn.click()
        await page.waitForTimeout(1500)
        const sToast = await page.$('.animate-bounce')
        if (sToast) console.log('    [Song Toast]:', await sToast.innerText())
        const songsTableText = await page.innerText('body')
        assert(songsTableText.includes(testSongTitle), 'Den nyskapade låten syns i låtlistan')

        await dbClient.execute({ sql: 'DELETE FROM songs WHERE title = ?', args: [testSongTitle] })
      }
    }

    // 5. SETLIST / REPERTOAR
    console.log('\n▶ [5/8] Setlist UI (/admin/setlist)')
    await page.goto(`${BASE_URL}/admin/setlist`, { waitUntil: 'networkidle' })
    const testSetSong = `Got My Mojo Working ${Date.now()}`

    const addSetBtn = await page.$('button:has-text("+ Ny låt i setlistan")')
    assert(Boolean(addSetBtn), 'Knappen "+ Ny låt i setlistan" hittades')
    if (addSetBtn) {
      await addSetBtn.click()
      await page.waitForSelector('text=Lägg till låt i setlistan')

      const titleInput = await page.$('input[placeholder*="Hoochie Coochie"], input[placeholder*="Låttitel"]')
      if (titleInput) await titleInput.fill(testSetSong)

      const saveSetBtn = await page.$('button:has-text("Spara i setlistan")')
      assert(Boolean(saveSetBtn), 'Knappen "Spara i setlistan" hittades')
      if (saveSetBtn) {
        await saveSetBtn.click()
        await page.waitForTimeout(1500)
        const setlistTableText = await page.innerText('body')
        assert(setlistTableText.includes(testSetSong), 'Den tillagda repertoarlåten syns i setlist-tabellen')

        await dbClient.execute({ sql: 'DELETE FROM setlist_items WHERE title = ?', args: [testSetSong] })
      }
    }

    // 6. INSTÄLLNINGAR
    console.log('\n▶ [6/8] Inställningar UI (/admin/settings)')
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' })
    const saveSettingsBtn = await page.$('button:has-text("Spara inställningar"), button:has-text("Spara ändringar")')
    assert(Boolean(saveSettingsBtn), 'Knappen "Spara inställningar" hittades')
    if (saveSettingsBtn) {
      await saveSettingsBtn.click()
      await page.waitForTimeout(1000)
      const settingsToast = await page.$('.animate-bounce')
      const stText = settingsToast ? await settingsToast.innerText() : ''
      assert(stText.includes('sparats') || stText.includes('uppdaterats'), 'Inställningar sparades framgångsrikt via UI')
    }

    // 7. HASHTAGGAR
    console.log('\n▶ [7/8] Sociala Hashtaggar UI (/admin/hashtags)')
    await page.goto(`${BASE_URL}/admin/hashtags`, { waitUntil: 'networkidle' })
    const testTag = `#DeltaBlues${Date.now()}`

    const tagInput = await page.$('input[placeholder*="#DetSjundeGunget"], input[placeholder*="#"]')
    assert(Boolean(tagInput), 'Inmatningsfält för hashtag hittades')
    if (tagInput) {
      await tagInput.fill(testTag)
      const addTagBtn = await page.$('button:has-text("+ Lägg till tagg")')
      assert(Boolean(addTagBtn), 'Knappen "+ Lägg till tagg" hittades')
      if (addTagBtn) {
        await addTagBtn.click()
        await page.waitForTimeout(1200)
        const hashtagsText = await page.innerText('body')
        assert(hashtagsText.includes(testTag), 'Hashtaggen skapades via UI och visas i listan')

        await dbClient.execute({ sql: 'DELETE FROM social_hashtags WHERE tag = ?', args: [testTag] })
      }
    }

    // 8. PUBLIKT BOKNINGSFORMULÄR
    console.log('\n▶ [8/8] Publikt Bokningsformulär (/contact)')
    await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle' })
    const testBookingEmail = `bokning-ui-${Date.now()}@festivalen.se`

    const nameField = await page.$('input[type="text"][required]')
    const emailField = await page.$('input[type="email"][required]')
    const msgField = await page.$('textarea')

    assert(Boolean(nameField && emailField && msgField), 'Alla obligatoriska formulärfält i bokningsformuläret hittades')
    if (nameField && emailField && msgField) {
      await nameField.fill('Festivalarrangör Eva')
      await emailField.fill(testBookingEmail)
      await msgField.fill('Hej! Vi vill boka er för festivalscenen lördag kväll!')

      const submitContactBtn = await page.$('button[type="submit"]')
      if (submitContactBtn) {
        await submitContactBtn.click()
        await page.waitForTimeout(2000)
        const contactPageText = await page.innerText('body')
        assert(
          contactPageText.includes('Tack för') || contactPageText.includes('skickat') || contactPageText.includes('mottagen'),
          'Publikt bokningsformulär skickades framgångsrikt och visade bekräftelse'
        )

        await dbClient.execute({ sql: 'DELETE FROM messages WHERE email = ?', args: [testBookingEmail] })
      }
    }

    // 9. FORMULÄRSKYDD & DIALOG-NAVIGERING VID OSPARADE ÄNDRINGAR
    console.log('\n▶ [9/9] Formulärskydd & In-App Dialog-navigering (/admin/gigs)')
    await page.goto(`${BASE_URL}/admin/gigs`, { waitUntil: 'networkidle' })

    const newGigBtn = await page.$('button:has-text("+ Nytt gig")')
    assert(Boolean(newGigBtn), 'Knappen "+ Nytt gig" hittades för formulärskyddstest')
    if (newGigBtn) {
      await newGigBtn.click()
      await page.waitForSelector('text=Lägg till nytt gig')
      assert(true, 'Gigformulär öppnades och markerades som aktivt/dirty')

      // A. Klicka på "Gig" i navbaren (samma sektion)
      const gigsNavBtn = await page.$('nav button:has-text("Gig")')
      assert(Boolean(gigsNavBtn), 'Hittade "Gig"-knappen i admin-menyn')
      if (gigsNavBtn) {
        await gigsNavBtn.click()
        await page.waitForSelector('[role="dialog"]')
        const modalText = await page.innerText('[role="dialog"]')
        assert(
          modalText.includes('Osparade ändringar') && modalText.includes('Stänger formuläret och återgår till listan'),
          'In-app bekräftelsedialog visades med korrekt information för samma sektion'
        )

        // B. Klicka "Stanna kvar & spara"
        const stayBtn = await page.$('[role="dialog"] button:has-text("Stanna kvar")')
        assert(Boolean(stayBtn), 'Knappen "Stanna kvar & spara" hittades i modalen')
        if (stayBtn) {
          await stayBtn.click()
          await page.waitForTimeout(500)
          const isModalVisible = await page.$('[role="dialog"]')
          const isFormVisible = await page.$('text=Lägg till nytt gig')
          assert(!isModalVisible && Boolean(isFormVisible), 'Klick på "Stanna kvar" stängde modalen och behöll formuläret öppet')
        }

        // C. Klicka på "Låtar" i navbaren (annan sektion)
        const songsNavBtn = await page.$('nav button:has-text("Låtar")')
        if (songsNavBtn) {
          await songsNavBtn.click()
          await page.waitForSelector('[role="dialog"]')
          const modalTextLeave = await page.innerText('[role="dialog"]')
          assert(
            modalTextLeave.includes('Osparade ändringar') && modalTextLeave.includes('Låtar'),
            'In-app bekräftelsedialog visades med målinformation för navigering till Låtar'
          )

          // D. Klicka "Ja, lämna formuläret" och verifiera att webbläsaren navigerar
          const leaveBtn = await page.$('[role="dialog"] button:has-text("Ja, lämna formuläret")')
          assert(Boolean(leaveBtn), 'Knappen "Ja, lämna formuläret" hittades i modalen')
          if (leaveBtn) {
            await leaveBtn.click()
            await page.waitForURL('**/admin/songs')
            assert(page.url().includes('/admin/songs'), 'Webbläsaren navigerade framgångsrikt till /admin/songs efter godkännande')
          }
        }

        // E. Navigera tillbaka till /admin/gigs och testa stängning på samma sida
        await page.goto(`${BASE_URL}/admin/gigs`, { waitUntil: 'networkidle' })
        const newGigAgainBtn = await page.$('button:has-text("+ Nytt gig")')
        if (newGigAgainBtn) {
          await newGigAgainBtn.click()
          await page.waitForSelector('text=Lägg till nytt gig')
          const gigsNavBtnAgain = await page.$('nav button:has-text("Gig")')
          if (gigsNavBtnAgain) {
            await gigsNavBtnAgain.click()
            await page.waitForSelector('[role="dialog"]')
            const leaveAgainBtn = await page.$('[role="dialog"] button:has-text("Ja, lämna formuläret")')
            if (leaveAgainBtn) {
              await leaveAgainBtn.click()
              await page.waitForTimeout(600)
              const formAfterDiscard = await page.$('text=Lägg till nytt gig')
              assert(!formAfterDiscard, 'Formuläret stängdes och nollställdes när användaren godkände discard på samma sida')
            }
          }
        }
      }
    }
  } catch (err) {
    assert(false, 'Oväntat fel i UI-testflödet', err.message)
  } finally {
    // Städning av session
    await dbClient.execute({ sql: 'DELETE FROM admin_sessions WHERE id = ?', args: [sessionId] })
    await browser.close()
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log('\n============================================================')
  console.log(`SLUTRESULTAT UI-TESTER: ${passed} godkända, ${failed} felaktiga (${durationSec} sekunder)`)
  console.log('============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('UI-testsvit kraschade:', e)
  process.exit(1)
})
