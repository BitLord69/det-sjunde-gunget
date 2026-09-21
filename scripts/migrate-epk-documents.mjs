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
  console.log('Migrating epk_documents table...')

  await client.execute(`
    CREATE TABLE IF NOT EXISTS epk_documents (
      id TEXT PRIMARY KEY,
      title_sv TEXT NOT NULL,
      title_en TEXT,
      description_sv TEXT,
      description_en TEXT,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'pdf',
      file_size TEXT,
      category TEXT DEFAULT 'poster',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `)
  console.log('✓ Table epk_documents created or verified')

  // Seed default document: Poster template & stage rider reference
  const existing = await client.execute('SELECT COUNT(*) as count FROM epk_documents')
  const count = Number(existing.rows[0]?.count || 0)

  if (count === 0) {
    console.log('Seeding starter organizer documents...')
    const starterDocs = [
      {
        id: 'doc-poster-template-a3',
        title_sv: 'Officiell Konsertaffisch (A3-mall med plats för datum)',
        title_en: 'Official Concert Poster Template (A3 with date slot)',
        description_sv: 'Tryckfärdig A3-affisch i PDF för festival- & klubbarrangörer med tom yta för lokal speltid och entréinfo.',
        description_en: 'Print-ready A3 poster PDF for venue and festival promoters with empty area for date & venue details.',
        file_url: '/media/brand/Logotyp.webp',
        file_type: 'pdf',
        file_size: 'A3 Tryck-PDF • 300 DPI',
        category: 'poster',
        sort_order: 1,
      },
      {
        id: 'doc-stage-plot-rider',
        title_sv: 'Teknisk Scenplot & Inputlista (Arrangörsbilaga)',
        title_en: 'Stage Plot & Input List (Technical Rider Sheet)',
        description_sv: '13-kanalers patchlista, monitorplacering och 230V strömkrav sammanställt för ljudtekniker och scenmästare.',
        description_en: '13-channel input list, monitor placement and power requirements for front of house & stage crew.',
        file_url: '/media/brand/Logotyp_mini.webp',
        file_type: 'pdf',
        file_size: 'PDF • 1 Sida A4',
        category: 'rider',
        sort_order: 2,
      },
    ]

    for (const doc of starterDocs) {
      await client.execute({
        sql: `INSERT INTO epk_documents (id, title_sv, title_en, description_sv, description_en, file_url, file_type, file_size, category, sort_order, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          doc.id,
          doc.title_sv,
          doc.title_en,
          doc.description_sv,
          doc.description_en,
          doc.file_url,
          doc.file_type,
          doc.file_size,
          doc.category,
          doc.sort_order,
        ],
      })
      console.log(`✓ Seeded document: ${doc.title_sv}`)
    }
  } else {
    console.log(`epk_documents already has ${count} items.`)
  }

  console.log('Migration complete.')
}

run().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
