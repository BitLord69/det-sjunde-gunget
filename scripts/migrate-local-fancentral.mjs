import { createClient } from '@libsql/client'

const client = createClient({
  url: 'file:local.db',
})

async function run() {
  console.log('Migrating local.db for Fan Central...')

  await client.execute(`
    CREATE TABLE IF NOT EXISTS fan_submissions (
      id text PRIMARY KEY NOT NULL,
      media_url text NOT NULL,
      caption text,
      location text,
      taken_when text,
      uploader_email text NOT NULL,
      uploader_name text,
      status text DEFAULT 'pending' NOT NULL,
      rotation integer DEFAULT 0,
      fastener_type text DEFAULT 'pin',
      pin_color text DEFAULT 'random',
      is_machine_fan integer DEFAULT 0 NOT NULL,
      reviewed_at integer,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS banned_emails (
      id text PRIMARY KEY NOT NULL,
      email text UNIQUE NOT NULL,
      reason text,
      banned_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  // Check if we need to seed initial approved photos
  const existing = await client.execute('SELECT COUNT(*) as cnt FROM fan_submissions')
  if (existing.rows[0].cnt === 0) {
    console.log('Seeding initial fan photos...')
    await client.batch([
      {
        sql: `INSERT INTO fan_submissions (
          id, media_url, caption, location, taken_when, uploader_email, uploader_name, status, rotation, fastener_type, pin_color, is_machine_fan, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'fan-real-1',
          '/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp',
          'Vårt mest trogna fan i publiken – sjunger med i varje refräng!',
          'Konsertscenen',
          'Sommaren 2024',
          'bandet@det7egunget.se',
          'Det 7:e Gunget',
          'approved',
          2,
          'pin',
          'gold',
          0,
          Date.now() - 86400000 * 5,
          Date.now() - 86400000 * 5,
        ],
      },
      {
        sql: `INSERT INTO fan_submissions (
          id, media_url, caption, location, taken_when, uploader_email, uploader_name, status, rotation, fastener_type, pin_color, is_machine_fan, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'fan-electric-1',
          '/media/fan-central/fanpic.png',
          'Andersson 45W bordsfläkt – håller trummisen sval under svettiga 12-taktare.',
          'Scengolvet bredvid hi-haten',
          'Alltid på gig',
          'bandet@det7egunget.se',
          'Bandets eltekniker',
          'approved',
          -2,
          'tape',
          'random',
          1,
          Date.now() - 86400000 * 2,
          Date.now() - 86400000 * 2,
        ],
      },
    ], 'write')
    console.log('✓ Initial fan photos seeded!')
  }

  console.log('✓ Migration finished!')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
