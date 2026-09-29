import 'dotenv/config'
import { createClient } from '@libsql/client'

const remoteUrl = process.env.TURSO_REMOTE_URL || (!process.env.TURSO_DATABASE_URL?.startsWith('file:') ? process.env.TURSO_DATABASE_URL : null)
const remoteAuthToken = process.env.TURSO_REMOTE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN

if (!remoteUrl) {
  console.error('❌ Ingen TURSO_REMOTE_URL eller fjärrdatabas konfigurerad.')
  console.log('Sätt dina inloggningsuppgifter i .env:')
  console.log('   TURSO_REMOTE_URL=libsql://det-sjunde-gunget-...turso.io')
  console.log('   TURSO_REMOTE_AUTH_TOKEN=...\n')
  process.exit(1)
}

console.log(`\n======================================================`)
console.log(`🛡️  SÄKER SCHEMA- & FUNKTIONSSYNK: Turso Cloud (Prod)`)
console.log(`======================================================`)
console.log(`Mål: ${remoteUrl.split('@').pop()}`)
console.log(`Regel: Befintlig data i produktion raderas eller skrivs ALDRIG över!\n`)

const remoteClient = createClient({
  url: remoteUrl,
  authToken: remoteAuthToken,
})

// Definition av alla tabeller och deras kolumner enligt server/db/schema.ts
const tables = [
  {
    name: 'admins',
    createSql: `
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
    `,
    columns: [
      { name: 'name', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'email', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'username', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'role', definition: 'text NOT NULL DEFAULT "Medlem"' },
      { name: 'password_hash', definition: 'text' },
      { name: 'salt', definition: 'text' },
      { name: 'provider', definition: 'text DEFAULT "credentials" NOT NULL' },
      { name: 'avatar_url', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'admin_sessions',
    createSql: `
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id text PRIMARY KEY NOT NULL,
        token text UNIQUE NOT NULL,
        user_id text NOT NULL,
        expires_at integer NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'token', definition: 'text UNIQUE NOT NULL DEFAULT ""' },
      { name: 'user_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'expires_at', definition: 'integer NOT NULL DEFAULT 0' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'admin_accounts',
    createSql: `
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id text PRIMARY KEY NOT NULL,
        admin_id text NOT NULL,
        provider text NOT NULL,
        provider_account_id text NOT NULL,
        email text,
        username text,
        name text,
        avatar_url text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'admin_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'provider', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'provider_account_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'email', definition: 'text' },
      { name: 'username', definition: 'text' },
      { name: 'name', definition: 'text' },
      { name: 'avatar_url', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'user',
    createSql: `
      CREATE TABLE IF NOT EXISTS user (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        email_verified integer DEFAULT 0 NOT NULL,
        image text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'name', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'email', definition: 'text UNIQUE NOT NULL DEFAULT ""' },
      { name: 'email_verified', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'image', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'session',
    createSql: `
      CREATE TABLE IF NOT EXISTS session (
        id text PRIMARY KEY NOT NULL,
        expires_at integer NOT NULL,
        token text UNIQUE NOT NULL,
        ip_address text,
        user_agent text,
        user_id text NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'expires_at', definition: 'integer NOT NULL DEFAULT 0' },
      { name: 'token', definition: 'text UNIQUE NOT NULL DEFAULT ""' },
      { name: 'ip_address', definition: 'text' },
      { name: 'user_agent', definition: 'text' },
      { name: 'user_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'account',
    createSql: `
      CREATE TABLE IF NOT EXISTS account (
        id text PRIMARY KEY NOT NULL,
        account_id text NOT NULL,
        provider_id text NOT NULL,
        user_id text NOT NULL,
        access_token text,
        refresh_token text,
        id_token text,
        access_token_expires_at integer,
        refresh_token_expires_at integer,
        scope text,
        password text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'account_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'provider_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'user_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'access_token', definition: 'text' },
      { name: 'refresh_token', definition: 'text' },
      { name: 'id_token', definition: 'text' },
      { name: 'access_token_expires_at', definition: 'integer' },
      { name: 'refresh_token_expires_at', definition: 'integer' },
      { name: 'scope', definition: 'text' },
      { name: 'password', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'verification',
    createSql: `
      CREATE TABLE IF NOT EXISTS verification (
        id text PRIMARY KEY NOT NULL,
        identifier text NOT NULL,
        value text NOT NULL,
        expires_at integer NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'identifier', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'value', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'expires_at', definition: 'integer NOT NULL DEFAULT 0' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'gigs',
    createSql: `
      CREATE TABLE IF NOT EXISTS gigs (
        id text PRIMARY KEY NOT NULL,
        date integer NOT NULL,
        venue text NOT NULL,
        city text NOT NULL,
        ticket_url text,
        status text DEFAULT 'upcoming',
        notes_sv text,
        notes_en text,
        setlist text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'date', definition: 'integer NOT NULL DEFAULT 0' },
      { name: 'venue', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'city', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'ticket_url', definition: 'text' },
      { name: 'status', definition: 'text DEFAULT "upcoming"' },
      { name: 'notes_sv', definition: 'text' },
      { name: 'notes_en', definition: 'text' },
      { name: 'setlist', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'band_members',
    createSql: `
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
    `,
    columns: [
      { name: 'name', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'role', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'bio_sv', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'bio_en', definition: 'text' },
      { name: 'photo_url', definition: 'text' },
      { name: 'gear_sv', definition: 'text' },
      { name: 'gear_en', definition: 'text' },
      { name: 'favorite_chord', definition: 'text' },
      { name: 'weakness_sv', definition: 'text' },
      { name: 'coffee_consumption', definition: 'text' },
      { name: 'sort_order', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'songs',
    createSql: `
      CREATE TABLE IF NOT EXISTS songs (
        id text PRIMARY KEY NOT NULL,
        title text NOT NULL,
        is_original integer DEFAULT 0 NOT NULL,
        original_artist text,
        embed_provider text NOT NULL,
        embed_url text NOT NULL,
        audio_url text,
        cover_image text,
        duration integer,
        lyrics text,
        lyrics_en text,
        chords text,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'title', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'is_original', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'original_artist', definition: 'text' },
      { name: 'embed_provider', definition: 'text NOT NULL DEFAULT "bandcamp"' },
      { name: 'embed_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'audio_url', definition: 'text' },
      { name: 'cover_image', definition: 'text' },
      { name: 'duration', definition: 'integer' },
      { name: 'lyrics', definition: 'text' },
      { name: 'lyrics_en', definition: 'text' },
      { name: 'chords', definition: 'text' },
      { name: 'sort_order', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'gallery_items',
    createSql: `
      CREATE TABLE IF NOT EXISTS gallery_items (
        id text PRIMARY KEY NOT NULL,
        category text NOT NULL,
        media_url text NOT NULL,
        frame_style text DEFAULT 'random',
        rotation integer DEFAULT 0,
        caption_sv text,
        caption_en text,
        alt_text_sv text NOT NULL,
        alt_text_en text,
        taken_at integer,
        is_epk integer DEFAULT 0 NOT NULL,
        epk_title_sv text,
        epk_title_en text,
        epk_resolution text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'category', definition: 'text NOT NULL DEFAULT "photo"' },
      { name: 'media_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'frame_style', definition: 'text DEFAULT "random"' },
      { name: 'rotation', definition: 'integer DEFAULT 0' },
      { name: 'caption_sv', definition: 'text' },
      { name: 'caption_en', definition: 'text' },
      { name: 'alt_text_sv', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'alt_text_en', definition: 'text' },
      { name: 'taken_at', definition: 'integer' },
      { name: 'is_epk', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'epk_title_sv', definition: 'text' },
      { name: 'epk_title_en', definition: 'text' },
      { name: 'epk_resolution', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'news_posts',
    createSql: `
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
    `,
    columns: [
      { name: 'title_sv', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'title_en', definition: 'text' },
      { name: 'body_sv', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'body_en', definition: 'text' },
      { name: 'cover_image_url', definition: 'text' },
      { name: 'published_at', definition: 'integer' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'subscribers',
    createSql: `
      CREATE TABLE IF NOT EXISTS subscribers (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL,
        status text DEFAULT 'subscribed' NOT NULL,
        brevo_contact_id text,
        subscribed_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        unsubscribed_at integer,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'email', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'status', definition: 'text DEFAULT "subscribed" NOT NULL' },
      { name: 'brevo_contact_id', definition: 'text' },
      { name: 'subscribed_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'unsubscribed_at', definition: 'integer' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'messages',
    createSql: `
      CREATE TABLE IF NOT EXISTS messages (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        email text NOT NULL,
        phone text,
        event_type text,
        event_date text,
        location text,
        body text NOT NULL,
        status text DEFAULT 'unread' NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        read_at integer
      )
    `,
    columns: [
      { name: 'name', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'email', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'phone', definition: 'text' },
      { name: 'event_type', definition: 'text' },
      { name: 'event_date', definition: 'text' },
      { name: 'location', definition: 'text' },
      { name: 'body', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'status', definition: 'text DEFAULT "unread" NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'read_at', definition: 'integer' },
    ],
  },
  {
    name: 'social_hashtags',
    createSql: `
      CREATE TABLE IF NOT EXISTS social_hashtags (
        id text PRIMARY KEY NOT NULL,
        tag text NOT NULL,
        category text DEFAULT 'all' NOT NULL,
        is_active integer DEFAULT 1 NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'tag', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'category', definition: 'text DEFAULT "all" NOT NULL' },
      { name: 'is_active', definition: 'integer DEFAULT 1 NOT NULL' },
      { name: 'sort_order', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'setlist_items',
    createSql: `
      CREATE TABLE IF NOT EXISTS setlist_items (
        id text PRIMARY KEY NOT NULL,
        title text NOT NULL,
        artist text,
        is_original integer DEFAULT 0 NOT NULL,
        set_name text DEFAULT 'Set 1' NOT NULL,
        notes text,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'title', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'artist', definition: 'text' },
      { name: 'is_original', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'set_name', definition: 'text DEFAULT "Set 1" NOT NULL' },
      { name: 'notes', definition: 'text' },
      { name: 'sort_order', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'merch_products',
    createSql: `
      CREATE TABLE IF NOT EXISTS merch_products (
        id text PRIMARY KEY NOT NULL,
        product_type_id text NOT NULL,
        name text DEFAULT 'Det 7:e gunget' NOT NULL,
        type_sv text NOT NULL,
        type_en text NOT NULL,
        category_sv text DEFAULT 'Kläder & Mode' NOT NULL,
        category_en text DEFAULT 'Apparel & Clothing' NOT NULL,
        price text NOT NULL,
        price_amount integer DEFAULT 0 NOT NULL,
        currency text DEFAULT 'SEK' NOT NULL,
        image_url text NOT NULL,
        product_url text NOT NULL,
        is_active integer DEFAULT 1 NOT NULL,
        last_synced_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'product_type_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'name', definition: 'text DEFAULT "Det 7:e gunget" NOT NULL' },
      { name: 'type_sv', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'type_en', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'category_sv', definition: 'text DEFAULT "Kläder & Mode" NOT NULL' },
      { name: 'category_en', definition: 'text DEFAULT "Apparel & Clothing" NOT NULL' },
      { name: 'price', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'price_amount', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'currency', definition: 'text DEFAULT "SEK" NOT NULL' },
      { name: 'image_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'product_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'is_active', definition: 'integer DEFAULT 1 NOT NULL' },
      { name: 'last_synced_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'site_settings',
    createSql: `
      CREATE TABLE IF NOT EXISTS site_settings (
        key text PRIMARY KEY NOT NULL,
        value text NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'value', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'gig_setlist_items',
    createSql: `
      CREATE TABLE IF NOT EXISTS gig_setlist_items (
        id text PRIMARY KEY NOT NULL,
        gig_id text NOT NULL,
        song_id text,
        title text NOT NULL,
        artist text,
        is_original integer DEFAULT 0 NOT NULL,
        set_name text DEFAULT 'Set 1' NOT NULL,
        notes text,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'gig_id', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'song_id', definition: 'text' },
      { name: 'title', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'artist', definition: 'text' },
      { name: 'is_original', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'set_name', definition: 'text DEFAULT "Set 1" NOT NULL' },
      { name: 'notes', definition: 'text' },
      { name: 'sort_order', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'voice_memos',
    createSql: `
      CREATE TABLE IF NOT EXISTS voice_memos (
        id text PRIMARY KEY NOT NULL,
        title text NOT NULL,
        audio_url text NOT NULL,
        duration integer DEFAULT 0 NOT NULL,
        key text,
        bpm integer,
        tags text,
        notes text,
        recorded_by text,
        linked_song_id text,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        FOREIGN KEY (linked_song_id) REFERENCES songs(id) ON DELETE SET NULL
      )
    `,
    columns: [
      { name: 'title', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'audio_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'duration', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'key', definition: 'text' },
      { name: 'bpm', definition: 'integer' },
      { name: 'tags', definition: 'text' },
      { name: 'notes', definition: 'text' },
      { name: 'recorded_by', definition: 'text' },
      { name: 'linked_song_id', definition: 'text' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'fan_submissions',
    createSql: `
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
    `,
    columns: [
      { name: 'media_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'caption', definition: 'text' },
      { name: 'location', definition: 'text' },
      { name: 'taken_when', definition: 'text' },
      { name: 'uploader_email', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'uploader_name', definition: 'text' },
      { name: 'status', definition: 'text DEFAULT "pending" NOT NULL' },
      { name: 'rotation', definition: 'integer DEFAULT 0' },
      { name: 'fastener_type', definition: 'text DEFAULT "pin"' },
      { name: 'pin_color', definition: 'text DEFAULT "random"' },
      { name: 'is_machine_fan', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'reviewed_at', definition: 'integer' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'banned_emails',
    createSql: `
      CREATE TABLE IF NOT EXISTS banned_emails (
        id text PRIMARY KEY NOT NULL,
        email text UNIQUE NOT NULL,
        reason text,
        banned_by text,
        banned_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'email', definition: 'text UNIQUE NOT NULL DEFAULT ""' },
      { name: 'reason', definition: 'text' },
      { name: 'banned_by', definition: 'text' },
      { name: 'banned_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
  {
    name: 'epk_documents',
    createSql: `
      CREATE TABLE IF NOT EXISTS epk_documents (
        id text PRIMARY KEY NOT NULL,
        title_sv text NOT NULL,
        title_en text,
        description_sv text,
        description_en text,
        file_url text NOT NULL,
        file_type text DEFAULT 'pdf' NOT NULL,
        file_size text,
        category text DEFAULT 'poster',
        sort_order integer DEFAULT 0 NOT NULL,
        is_active integer DEFAULT 1 NOT NULL,
        created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
        updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
      )
    `,
    columns: [
      { name: 'title_sv', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'title_en', definition: 'text' },
      { name: 'description_sv', definition: 'text' },
      { name: 'description_en', definition: 'text' },
      { name: 'file_url', definition: 'text NOT NULL DEFAULT ""' },
      { name: 'file_type', definition: 'text DEFAULT "pdf" NOT NULL' },
      { name: 'file_size', definition: 'text' },
      { name: 'category', definition: 'text DEFAULT "poster"' },
      { name: 'sort_order', definition: 'integer DEFAULT 0 NOT NULL' },
      { name: 'is_active', definition: 'integer DEFAULT 1 NOT NULL' },
      { name: 'created_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
      { name: 'updated_at', definition: 'integer DEFAULT (unixepoch() * 1000) NOT NULL' },
    ],
  },
]

// Lista över kolumner som explicit ska tas bort om de finns (t.ex. vid refaktorisering)
const columnsToDrop = [
  // Exempel: { table: 'songs', column: 'deprecated_field' }
]

async function runSafeMigration() {
  console.log('1️⃣  Verifierar och skapar tabeller & fält i Turso Cloud...')

  for (const table of tables) {
    // 1. Skapa tabellen om den saknas
    await remoteClient.execute(table.createSql)

    // 2. Inspektera befintliga kolumner
    const info = await remoteClient.execute(`PRAGMA table_info("${table.name}")`)
    const existingCols = new Set(info.rows.map(r => r.name))

    // 3. Lägg till saknade kolumner
    for (const col of table.columns) {
      if (!existingCols.has(col.name)) {
        console.log(`  ➕ Lägger till ny kolumn [${col.name}] i tabell [${table.name}]...`)
        try {
          await remoteClient.execute(`ALTER TABLE "${table.name}" ADD COLUMN "${col.name}" ${col.definition}`)
          console.log(`     ✓ Kolumn [${col.name}] tillagd!`)
        } catch (err) {
          console.warn(`     ⚠️ Kunde inte lägga till [${col.name}]:`, err.message)
        }
      }
    }
  }

  // 4. Skapa unika index
  try {
    await remoteClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_idx ON subscribers (email)`)
  } catch {}
  try {
    await remoteClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS banned_emails_email_idx ON banned_emails (email)`)
  } catch {}

  // 5. Hantera eventuella kolumner som ska tas bort (DROP COLUMN)
  if (columnsToDrop.length > 0) {
    console.log('\n2️⃣  Kontrollerar förlegade kolumner att ta bort...')
    for (const item of columnsToDrop) {
      try {
        const info = await remoteClient.execute(`PRAGMA table_info("${item.table}")`)
        const exists = info.rows.some(r => r.name === item.column)
        if (exists) {
          console.log(`  🗑️  Tar bort kolumn [${item.column}] från tabell [${item.table}]...`)
          await remoteClient.execute(`ALTER TABLE "${item.table}" DROP COLUMN "${item.column}"`)
          console.log(`     ✓ Kolumn [${item.column}] borttagen!`)
        }
      } catch (err) {
        console.warn(`     ⚠️ Kunde inte ta bort [${item.column}]:`, err.message)
      }
    }
  }

  // 6. Kontrollera tabellernas status och initiera endast HELT NYA funktioner (om tabellen är tom)
  console.log('\n3️⃣  Kontrollerar produktionsdata per tabell (inga befintliga rader rörs):')

  for (const table of tables) {
    try {
      const countRes = await remoteClient.execute(`SELECT count(*) as count FROM "${table.name}"`)
      const count = Number(countRes.rows[0].count)

      if (count > 0) {
        console.log(`  🔒 [${table.name.padEnd(20)}]: ${count} rader bevaras helt orörda`)
      } else {
        console.log(`  ⚪ [${table.name.padEnd(20)}]: 0 rader (tom tabell i Prod)`)
      }
    } catch (err) {
      console.warn(`  ⚠️ Kunde inte läsa radantal för [${table.name}]:`, err.message)
    }
  }

  // 7. Säkerställ grundläggande nycklar i site_settings utan att skriva över befintliga
  const now = Date.now()
  const defaultSettings = [
    { key: 'newsletter_enabled', value: 'true' },
    { key: 'fan_central_enabled', value: 'true' },
    { key: 'merch_enabled', value: 'true' },
  ]
  for (const s of defaultSettings) {
    await remoteClient.execute({
      sql: `INSERT OR IGNORE INTO site_settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      args: [s.key, s.value, now, now],
    })
  }

  console.log('\n🎉 Säker schemamigrering slutförd framgångsrikt!')
  console.log('Ingen produktionsdata har raderats, modifierats eller skrivits över.\n')
}

runSafeMigration().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
