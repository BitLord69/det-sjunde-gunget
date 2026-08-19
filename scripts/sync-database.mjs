import 'dotenv/config'
import { createClient } from '@libsql/client'

const remoteUrl = process.env.TURSO_REMOTE_URL || (!process.env.TURSO_DATABASE_URL?.startsWith('file:') ? process.env.TURSO_DATABASE_URL : null)
const remoteAuthToken = process.env.TURSO_REMOTE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN

if (!remoteUrl) {
  console.error('⚠️  TURSO_REMOTE_URL or remote TURSO_DATABASE_URL is not configured.')
  console.log('To migrate to Turso Cloud, set your credentials in .env:')
  console.log('   TURSO_REMOTE_URL=libsql://your-db-name.turso.io')
  console.log('   TURSO_REMOTE_AUTH_TOKEN=your-token-here\n')
  process.exit(1)
}

console.log(`Connecting to Turso Cloud at: ${remoteUrl.split('@').pop()}`)

const remoteClient = createClient({
  url: remoteUrl,
  authToken: remoteAuthToken,
})

async function runMigration() {
  console.log('Creating & updating production tables in Turso Cloud...')

  // 1. Gigs table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS gigs (
      id text PRIMARY KEY NOT NULL,
      date integer NOT NULL,
      venue text NOT NULL,
      city text NOT NULL,
      ticket_url text,
      status text DEFAULT 'upcoming',
      notes_sv text,
      notes_en text,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  // 2. Band members table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS band_members (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      role text NOT NULL,
      bio_sv text NOT NULL,
      bio_en text,
      photo_url text,
      gear_sv text,
      gear_en text,
      favorite_chord text,
      weakness_sv text,
      coffee_consumption text,
      sort_order integer DEFAULT 0 NOT NULL,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  // 3. Gallery items table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS gallery_items (
      id text PRIMARY KEY NOT NULL,
      category text NOT NULL,
      media_url text NOT NULL,
      frame_style text DEFAULT 'polaroid',
      rotation integer DEFAULT 0,
      caption_sv text,
      caption_en text,
      alt_text_sv text NOT NULL,
      alt_text_en text,
      taken_at integer,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  // 4. Songs table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS songs (
      id text PRIMARY KEY NOT NULL,
      title text NOT NULL,
      is_original integer DEFAULT 0 NOT NULL,
      original_artist text,
      embed_provider text NOT NULL,
      embed_url text NOT NULL,
      audio_url text,
      duration integer,
      sort_order integer DEFAULT 0 NOT NULL,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  // Auto-migrate missing columns on songs if table existed before
  try {
    await remoteClient.execute('ALTER TABLE songs ADD COLUMN audio_url text')
  } catch {}
  try {
    await remoteClient.execute('ALTER TABLE songs ADD COLUMN duration integer')
  } catch {}

  // 5. Admins table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      username text UNIQUE NOT NULL,
      role text NOT NULL,
      password_hash text,
      salt text,
      provider text DEFAULT 'credentials' NOT NULL,
      avatar_url text,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  // 6. Admin sessions table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id text PRIMARY KEY NOT NULL,
      token text UNIQUE NOT NULL,
      user_id text NOT NULL,
      expires_at integer NOT NULL,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `)

  // 7. News & Messages & Subscribers
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS news_posts (
      id text PRIMARY KEY NOT NULL,
      title_sv text NOT NULL,
      title_en text,
      body_sv text NOT NULL,
      body_en text,
      cover_image_url text,
      published_at integer,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id text PRIMARY KEY NOT NULL,
      email text UNIQUE NOT NULL,
      status text DEFAULT 'subscribed' NOT NULL,
      brevo_contact_id text,
      subscribed_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      unsubscribed_at integer,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `)

  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text NOT NULL,
      body text NOT NULL,
      created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
      read_at integer
    )
  `)

  // 8. Social Hashtags table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS social_hashtags (
      id text PRIMARY KEY NOT NULL,
      tag text NOT NULL,
      category text NOT NULL DEFAULT 'all',
      is_active integer NOT NULL DEFAULT 1,
      sort_order integer NOT NULL DEFAULT 0,
      created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `)

  // 9. Setlist Items table
  await remoteClient.execute(`
    CREATE TABLE IF NOT EXISTS setlist_items (
      id text PRIMARY KEY NOT NULL,
      title text NOT NULL,
      artist text,
      is_original integer NOT NULL DEFAULT 0,
      set_name text NOT NULL DEFAULT 'Set 1',
      notes text,
      sort_order integer NOT NULL DEFAULT 0,
      created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `)

  console.log('✓ All database tables & columns successfully verified in Turso Cloud!')

  // Check if data should be synced from local SQLite
  const localClient = createClient({ url: 'file:local.db' })
  try {
    const localGigs = await localClient.execute('SELECT * FROM gigs')
    const localAdmins = await localClient.execute('SELECT * FROM admins')
    const localMembers = await localClient.execute('SELECT * FROM band_members')
    const localGallery = await localClient.execute('SELECT * FROM gallery_items')
    const localSongs = await localClient.execute('SELECT * FROM songs')
    const localHashtags = await localClient.execute('SELECT * FROM social_hashtags')
    const localSetlist = await localClient.execute('SELECT * FROM setlist_items')

    console.log(`\nSyncing data from local database:`)
    console.log(`- ${localAdmins.rows.length} admins`)
    console.log(`- ${localGigs.rows.length} gigs`)
    console.log(`- ${localMembers.rows.length} band members`)
    console.log(`- ${localGallery.rows.length} gallery items`)
    console.log(`- ${localSongs.rows.length} songs`)
    console.log(`- ${localHashtags.rows.length} social hashtags`)
    console.log(`- ${localSetlist.rows.length} setlist tracks`)

    // Clean remote tables before insert
    await remoteClient.batch([
      { sql: 'DELETE FROM admin_sessions', args: [] },
      { sql: 'DELETE FROM admins', args: [] },
      { sql: 'DELETE FROM gigs', args: [] },
      { sql: 'DELETE FROM band_members', args: [] },
      { sql: 'DELETE FROM gallery_items', args: [] },
      { sql: 'DELETE FROM songs', args: [] },
      { sql: 'DELETE FROM social_hashtags', args: [] },
      { sql: 'DELETE FROM setlist_items', args: [] },
    ], 'write')

    // Batch insert into remote
    const batchStatements = [
      ...localAdmins.rows.map((row) => ({
        sql: `INSERT INTO admins (id, name, email, username, role, password_hash, salt, provider, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.name, row.email, row.username, row.role, row.password_hash, row.salt, row.provider, row.avatar_url, row.created_at, row.updated_at],
      })),
      ...localGigs.rows.map((row) => ({
        sql: `INSERT INTO gigs (id, date, venue, city, ticket_url, status, notes_sv, notes_en, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.date, row.venue, row.city, row.ticket_url, row.status, row.notes_sv, row.notes_en, row.created_at, row.updated_at],
      })),
      ...localMembers.rows.map((row) => ({
        sql: `INSERT INTO band_members (id, name, role, bio_sv, bio_en, photo_url, gear_sv, gear_en, favorite_chord, weakness_sv, coffee_consumption, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.name, row.role, row.bio_sv, row.bio_en, row.photo_url, row.gear_sv, row.gear_en, row.favorite_chord, row.weakness_sv, row.coffee_consumption, row.sort_order, row.created_at, row.updated_at],
      })),
      ...localGallery.rows.map((row) => ({
        sql: `INSERT INTO gallery_items (id, category, media_url, frame_style, rotation, caption_sv, caption_en, alt_text_sv, alt_text_en, taken_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.category, row.media_url, row.frame_style, row.rotation, row.caption_sv, row.caption_en, row.alt_text_sv, row.alt_text_en, row.taken_at, row.created_at, row.updated_at],
      })),
      ...localSongs.rows.map((row) => ({
        sql: `INSERT INTO songs (id, title, is_original, original_artist, embed_provider, embed_url, audio_url, duration, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.title, row.is_original, row.original_artist, row.embed_provider, row.embed_url, row.audio_url || null, row.duration || null, row.sort_order, row.created_at, row.updated_at],
      })),
      ...localHashtags.rows.map((row) => ({
        sql: `INSERT INTO social_hashtags (id, tag, category, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.tag, row.category, row.is_active, row.sort_order, row.created_at, row.updated_at],
      })),
      ...localSetlist.rows.map((row) => ({
        sql: `INSERT INTO setlist_items (id, title, artist, is_original, set_name, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.id, row.title, row.artist, row.is_original, row.set_name, row.notes, row.sort_order, row.created_at, row.updated_at],
      })),
    ]

    if (batchStatements.length > 0) {
      await remoteClient.batch(batchStatements, 'write')
      console.log('✓ All local data successfully migrated to Turso Cloud!')
    }
  } catch (err) {
    console.error('Error during data transfer:', err.message)
  }
}

runMigration().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
