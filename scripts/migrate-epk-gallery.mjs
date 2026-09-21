import { createClient } from '@libsql/client'
import 'dotenv/config'

const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN

console.log(`Connecting to database at: ${url}`)
const client = createClient({
  url,
  ...(authToken ? { authToken } : {}),
})

async function run() {
  console.log('Migrating gallery_items for EPK resources...')

  // 1. Add columns to gallery_items
  try {
    await client.execute('ALTER TABLE gallery_items ADD COLUMN is_epk integer DEFAULT 0 NOT NULL')
    console.log('✓ Added column is_epk')
  } catch (e) {
    console.log('is_epk column already exists or:', e.message)
  }

  try {
    await client.execute('ALTER TABLE gallery_items ADD COLUMN epk_title_sv text')
    console.log('✓ Added column epk_title_sv')
  } catch (e) {
    console.log('epk_title_sv column already exists or:', e.message)
  }

  try {
    await client.execute('ALTER TABLE gallery_items ADD COLUMN epk_title_en text')
    console.log('✓ Added column epk_title_en')
  } catch (e) {
    console.log('epk_title_en column already exists or:', e.message)
  }

  try {
    await client.execute('ALTER TABLE gallery_items ADD COLUMN epk_resolution text')
    console.log('✓ Added column epk_resolution')
  } catch (e) {
    console.log('epk_resolution column already exists or:', e.message)
  }

  // 2. Initial press photoshoot assets to seed into gallery_items
  const epkPhotos = [
    {
      id: 'epk-photo-full-band',
      mediaUrl: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg',
      captionSv: 'Hela gänget samlat inför sommarsäsongen.',
      captionEn: 'The whole gang ready for the summer season.',
      altTextSv: 'Det 7:e Gunget fullt bandfoto',
      altTextEn: 'Det 7:e Gunget full band photo',
      isEpk: 1,
      epkTitleSv: 'Det 7:e Gunget — Fullt band (Liggande)',
      epkTitleEn: 'Det 7:e Gunget — Full Band (Landscape)',
      epkResolution: '300 DPI • 3.2 MB • Liggande',
    },
    {
      id: 'epk-photo-janis',
      mediaUrl: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg',
      captionSv: 'Janis – sång och munspel.',
      captionEn: 'Janis – lead vocals & harmonica.',
      altTextSv: 'Janis sång & munspel porträtt',
      altTextEn: 'Janis lead vocals & harmonica portrait',
      isEpk: 1,
      epkTitleSv: 'Janis — Sång & Munspel',
      epkTitleEn: 'Janis — Lead Vocals & Harmonica',
      epkResolution: '300 DPI • 3.8 MB • Stående',
    },
    {
      id: 'epk-photo-bosse',
      mediaUrl: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg',
      captionSv: 'Bosse – bas och körsång.',
      captionEn: 'Bosse – bass & backing vocals.',
      altTextSv: 'Bosse bas & sång porträtt',
      altTextEn: 'Bosse bass & vocals portrait',
      isEpk: 1,
      epkTitleSv: 'Bosse — Bas & Sång',
      epkTitleEn: 'Bosse — Bass & Backing Vocals',
      epkResolution: '300 DPI • 4.3 MB • Stående',
    },
    {
      id: 'epk-photo-marcus',
      mediaUrl: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg',
      captionSv: 'Marcus – elgitarr och stämsång.',
      captionEn: 'Marcus – electric guitar & backing vocals.',
      altTextSv: 'Marcus elgitarr porträtt',
      altTextEn: 'Marcus electric guitar portrait',
      isEpk: 1,
      epkTitleSv: 'Marcus — Gitarr & Sång',
      epkTitleEn: 'Marcus — Guitar & Backing Vocals',
      epkResolution: '300 DPI • 2.6 MB • Stående',
    },
    {
      id: 'epk-photo-jonas',
      mediaUrl: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg',
      captionSv: 'Jonas – maskinrummet bakom trummorna.',
      captionEn: 'Jonas – the engine room behind the drums.',
      altTextSv: 'Jonas trumset porträtt',
      altTextEn: 'Jonas drum kit portrait',
      isEpk: 1,
      epkTitleSv: 'Jonas — Trumset',
      epkTitleEn: 'Jonas — Drums',
      epkResolution: '300 DPI • 3.5 MB • Stående',
    },
    {
      id: 'epk-photo-rehearsal',
      mediaUrl: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg',
      captionSv: 'Replokal, fokus och rörglöd.',
      captionEn: 'Rehearsal space, focus and tube glow.',
      altTextSv: 'Replokalsbild Det 7:e Gunget',
      altTextEn: 'Rehearsal photo Det 7:e Gunget',
      isEpk: 1,
      epkTitleSv: 'Replokal & Rörglöd',
      epkTitleEn: 'Rehearsal Vibes & Tube Glow',
      epkResolution: '300 DPI • 5.3 MB • Liggande',
    },
    {
      id: 'epk-photo-live',
      mediaUrl: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg',
      captionSv: 'Fyra herrar som tar musiken – men inte sig själva – på allvar.',
      captionEn: 'Four guys who take the music – but never themselves – seriously.',
      altTextSv: 'Det 7:e Gunget scenporträtt',
      altTextEn: 'Det 7:e Gunget stage portrait',
      isEpk: 1,
      epkTitleSv: 'Det 7:e Gunget — Liveporträtt',
      epkTitleEn: 'Det 7:e Gunget — Live Stage Portrait',
      epkResolution: '300 DPI • 2.9 MB • Liggande',
    },
  ]

  for (const item of epkPhotos) {
    // Check if item exists by id or mediaUrl
    const res = await client.execute({
      sql: 'SELECT id FROM gallery_items WHERE id = ? OR media_url = ?',
      args: [item.id, item.mediaUrl],
    })

    const now = Date.now()

    if (res.rows.length > 0) {
      const existingId = res.rows[0].id
      await client.execute({
        sql: `UPDATE gallery_items SET 
          is_epk = 1,
          epk_title_sv = ?,
          epk_title_en = ?,
          epk_resolution = ?,
          updated_at = ?
        WHERE id = ?`,
        args: [item.epkTitleSv, item.epkTitleEn, item.epkResolution, now, existingId],
      })
      console.log(`✓ Updated existing gallery item ${existingId} as EPK`)
    } else {
      await client.execute({
        sql: `INSERT INTO gallery_items (
          id, category, media_url, frame_style, rotation, caption_sv, caption_en,
          alt_text_sv, alt_text_en, is_epk, epk_title_sv, epk_title_en, epk_resolution,
          created_at, updated_at
        ) VALUES (?, 'photo', ?, 'polaroid', 0, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.mediaUrl,
          item.captionSv,
          item.captionEn,
          item.altTextSv,
          item.altTextEn,
          item.epkTitleSv,
          item.epkTitleEn,
          item.epkResolution,
          now,
          now,
        ],
      })
      console.log(`✓ Inserted new EPK item ${item.id}`)
    }
  }

  console.log('✅ EPK Gallery migration complete!')
}

run().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
