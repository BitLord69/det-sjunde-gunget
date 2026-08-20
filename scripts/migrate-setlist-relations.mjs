import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import { nanoid } from 'nanoid'

config()

const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN || undefined

const client = createClient({ url, authToken })

async function runMigration() {
  console.log('--- Migrating Gig Setlists to Relational Table ---')

  // 1. Create table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS gig_setlist_items (
      id TEXT PRIMARY KEY,
      gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
      song_id TEXT REFERENCES songs(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      artist TEXT,
      is_original INTEGER NOT NULL DEFAULT 0,
      set_name TEXT NOT NULL DEFAULT 'Set 1',
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `)
  await client.execute(`CREATE INDEX IF NOT EXISTS gig_setlist_items_gig_id_idx ON gig_setlist_items(gig_id);`)
  await client.execute(`CREATE INDEX IF NOT EXISTS gig_setlist_items_song_id_idx ON gig_setlist_items(song_id);`)

  // 2. Fetch all songs for matching
  const songsRes = await client.execute(`SELECT id, title FROM songs;`)
  const songMap = new Map()
  for (const row of songsRes.rows) {
    if (row.title) {
      songMap.set(String(row.title).toLowerCase().trim(), String(row.id))
    }
  }

  // 3. Fetch gigs with setlist JSON
  const gigsRes = await client.execute(`SELECT id, setlist FROM gigs;`)
  let migratedCount = 0

  for (const gig of gigsRes.rows) {
    if (!gig.setlist) continue
    let items = []
    try {
      items = JSON.parse(gig.setlist)
    } catch {
      continue
    }

    if (!Array.isArray(items) || items.length === 0) continue

    // Check if already migrated for this gig
    const existing = await client.execute({
      sql: `SELECT COUNT(*) as cnt FROM gig_setlist_items WHERE gig_id = ?`,
      args: [gig.id],
    })

    if (Number(existing.rows[0]?.cnt) > 0) {
      console.log(`Gig ${gig.id} already has ${existing.rows[0]?.cnt} relational setlist items. Skipping.`)
      continue
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      const title = item.title || item.name || 'Namnlös låt'
      const matchedSongId = songMap.get(title.toLowerCase().trim()) || null
      const id = `gsi-${nanoid(8)}`
      const now = Date.now()

      await client.execute({
        sql: `
          INSERT INTO gig_setlist_items (
            id, gig_id, song_id, title, artist, is_original, set_name, notes, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          gig.id,
          matchedSongId,
          title,
          item.artist || item.originalArtist || null,
          item.isOriginal ? 1 : 0,
          item.setName || item.set || 'Set 1',
          item.notes || null,
          item.sortOrder !== undefined ? item.sortOrder : idx,
          now,
          now,
        ],
      })
      migratedCount++
    }
    console.log(`Migrated ${items.length} setlist items for gig ${gig.id}`)
  }

  console.log(`Migration complete! Total migrated items: ${migratedCount}`)
}

runMigration().catch(console.error)
