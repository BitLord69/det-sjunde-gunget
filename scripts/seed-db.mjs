import crypto from 'node:crypto'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

const now = Date.now()

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

const defaultPassword = 'gunget2026!'

const admins = [
  {
    id: 'admin-janis',
    name: 'Janis',
    email: 'janis@det7egunget.se',
    username: 'janis',
    role: 'Sång & munspel',
    salt: 'salt_janis_7e_gunget_2026',
    passwordHash: hashPassword(defaultPassword, 'salt_janis_7e_gunget_2026'),
    provider: 'credentials',
    avatarUrl: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg',
  },
  {
    id: 'admin-bosse',
    name: 'Bosse',
    email: 'bosse@det7egunget.se',
    username: 'bosse',
    role: 'Bas & sång',
    salt: 'salt_bosse_7e_gunget_2026',
    passwordHash: hashPassword(defaultPassword, 'salt_bosse_7e_gunget_2026'),
    provider: 'credentials',
    avatarUrl: '/media/band/20..7de Gunget photoshoot1 21-6 26-7.jpg',
  },
  {
    id: 'admin-marcus',
    name: 'Marcus',
    email: 'marcus@det7egunget.se',
    username: 'marcus',
    role: 'Gitarr & sång',
    salt: 'salt_marcus_7e_gunget_2026',
    passwordHash: hashPassword(defaultPassword, 'salt_marcus_7e_gunget_2026'),
    provider: 'credentials',
    avatarUrl: '/media/band/25..7de Gunget photoshoot1 21-6 26-12.jpg',
  },
  {
    id: 'admin-jonas',
    name: 'Jonas',
    email: 'jonas@det7egunget.se',
    username: 'jonas',
    role: 'Trummor',
    salt: 'salt_jonas_7e_gunget_2026',
    passwordHash: hashPassword(defaultPassword, 'salt_jonas_7e_gunget_2026'),
    provider: 'credentials',
    avatarUrl: '/media/band/27..7de Gunget photoshoot1 21-6 26-14.jpg',
  },
]

// Ensure tables exist
await client.execute(`
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

await client.execute(`
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

await client.execute(`
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

try {
  await client.execute('DROP TABLE IF EXISTS songs')
} catch (_) {}

await client.execute(`
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

await client.execute(`
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

await client.execute(`
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
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS social_hashtags (
    id text PRIMARY KEY NOT NULL,
    tag text NOT NULL,
    category text DEFAULT 'all' NOT NULL,
    is_active integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
    updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
  )
`)

await client.execute(`
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

await client.execute(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id text PRIMARY KEY NOT NULL,
    token text UNIQUE NOT NULL,
    user_id text NOT NULL,
    expires_at integer NOT NULL,
    created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE CASCADE
  )
`)

// Clean up existing data to prevent unique constraint conflicts
try {
  await client.execute('DELETE FROM admin_sessions')
  await client.execute('DELETE FROM admins')
  await client.execute('DELETE FROM gigs')
  await client.execute('DELETE FROM band_members')
  await client.execute('DELETE FROM gallery_items')
  await client.execute('DELETE FROM songs')
  await client.execute('DELETE FROM social_hashtags')
} catch (e) {
  console.log('Error cleaning tables:', e.message)
}

const gigs = [
  {
    id: 'gig-premiar-2026',
    date: new Date('2026-09-12T19:30:00+02:00').getTime(),
    venue: 'Kulturhuset Svängen',
    city: 'Ängelholm',
    status: 'upcoming',
    notesSv: 'Dörrarna öppnar 18:30. Ta med dansskorna, vi bjuder på tungt gung på hemmaplan!',
    notesEn: 'Doors open 18:30. Bring your dancing shoes for a night of heavy blues-rock at our home turf!',
    ticketUrl: 'https://billetto.se',
  },
  {
    id: 'gig-helsingborg-2026',
    date: new Date('2026-10-03T20:00:00+02:00').getTime(),
    venue: 'The Tivoli',
    city: 'Helsingborg',
    status: 'upcoming',
    notesSv: 'En helkväll med egna låtar, gamla favoriter och tveksamt mellansnack.',
    notesEn: 'An evening of originals, classics, and questionable stage banter.',
    ticketUrl: '#',
  },
  {
    id: 'gig-hoganas-2026',
    date: new Date('2026-11-14T21:00:00+01:00').getTime(),
    venue: 'Garage Bar',
    city: 'Höganäs',
    status: 'free',
    notesSv: 'Fri entré! Trångt, svettigt, burgare och bra öl i kranarna.',
    notesEn: 'Free entry! Cozy, energetic, great food and cold beer.',
    ticketUrl: '',
  },
  {
    id: 'gig-malmo-2026',
    date: new Date('2026-05-16T20:00:00+02:00').getTime(),
    venue: 'Medley',
    city: 'Malmö',
    status: 'completed',
    notesSv: 'Fullt ös, lapp på luckan och allsång till sista tonen.',
    notesEn: 'Packed venue, sold out show, and singalongs to the very last chord.',
    ticketUrl: '',
  },
]

const members = [
  {
    id: 'member-janis',
    name: 'Janis',
    role: 'Sång & munspel',
    bioSv: 'Frontman med munspel i bältet och sång som känns i maggropen. Sjunger hellre med hjärta än med skönsång och har alltid minst fem olika munspel i jackfickan.',
    bioEn: 'Frontman with a harmonica belt and vocals from the gut. Believes in singing with soul and keeps at least five harps in his coat pockets.',
    photoUrl: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg',
    gearSv: "Hohner Marine Band, Shure 55SH 'Elvis-mick' & vintage rörstärkare",
    gearEn: "Hohner Marine Band, Shure 55SH 'Elvis mic' & vintage tube amp",
    favoriteChord: 'A7 (eller vad som helst som svänger)',
    weaknessSv: 'Kan inte sluta prata mellan låtarna',
    coffeeConsumption: '3 koppar svart & en kanelbulle per rep',
    sortOrder: 1,
  },
  {
    id: 'member-bosse',
    name: 'Bosse',
    role: 'Bas & sång',
    bioSv: 'Gungar fram grunden med bastoner som får kaffekopparna att vibrera. Sjunger stämmor och ser till att bandet inte spårar ur helt i tempo.',
    bioEn: 'Lays down the low end with bass lines that rattle the coffee cups. Sings harmony and keeps the rhythm on track.',
    photoUrl: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg',
    gearSv: "Fender Precision Bass '78 & Ampeg rörtopp",
    gearEn: "Fender Precision Bass '78 & Ampeg tube head",
    favoriteChord: 'Grundtonen (det räcker långt)',
    weaknessSv: 'Hävdar att basen aldrig hörs i monitorn',
    coffeeConsumption: 'Termos med Gevalia Mellanrost',
    sortOrder: 2,
  },
  {
    id: 'member-marcus',
    name: 'Marcus',
    role: 'Gitarr & sång',
    bioSv: 'Riffmästare med känsla för både skitig chicagoblues och melodiska solon. Tror stenhårt på att volymen på förstärkaren ska stå på 11.',
    bioEn: 'Riff master with a feel for gritty Chicago blues and melodic solos. Firmly believes amp volume knobs are made to go to 11.',
    photoUrl: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg',
    gearSv: 'Gibson Les Paul Goldtop, Fender Tweed Deluxe & Tube Screamer',
    gearEn: 'Gibson Les Paul Goldtop, Fender Tweed Deluxe & Tube Screamer',
    favoriteChord: 'E7#9 (Hendrix-ackordet)',
    weaknessSv: 'Köper en ny gitarrpedal varje tisdag',
    coffeeConsumption: 'Dubbel espresso (minst två per set)',
    sortOrder: 3,
  },
  {
    id: 'member-jonas',
    name: 'Jonas',
    role: 'Trummor',
    bioSv: 'Maskinrummet bakom trumsetet. Håller takten bergfast och ser till att svänget i Det 7:e Gunget rullar på som ett ånglok.',
    bioEn: 'The engine room behind the kit. Keeps time rock solid and ensures the groove rolls like a steam locomotive.',
    photoUrl: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg',
    gearSv: "Vintage Ludwig '69 & Zildjian K cymbaler",
    gearEn: "Vintage Ludwig '69 & Zildjian K cymbals",
    favoriteChord: 'Virvelkagge på 2 och 4',
    weaknessSv: 'Tappar alltid en trumpinne under snabba shuffles',
    coffeeConsumption: 'En hel kanna under soundcheck',
    sortOrder: 4,
  },
]

const gallery = [
  {
    id: 'gal-band-full',
    category: 'photo',
    mediaUrl: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg',
    frameStyle: 'polaroid',
    rotation: -1,
    captionSv: 'Hela gänget samlat inför sommarsäsongen.',
    captionEn: 'The whole gang ready for the summer gigs.',
    altTextSv: 'Det 7:e Gunget bandfoto',
    altTextEn: 'Det 7:e Gunget band portrait',
  },
  {
    id: 'gal-studio-focus',
    category: 'photo',
    mediaUrl: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg',
    frameStyle: 'taped',
    rotation: 1,
    captionSv: 'Fokus, stämning och rörglöd i studion.',
    captionEn: 'Focus, vibes, and tube glow in the studio.',
    altTextSv: 'Bandmedlemmar i replokalen',
    altTextEn: 'Band members in rehearsal room',
  },
  {
    id: 'gal-serious-fun',
    category: 'photo',
    mediaUrl: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg',
    frameStyle: 'grunge',
    rotation: -2,
    captionSv: 'Fyra herrar som tar musiken – men inte sig själva – på största allvar.',
    captionEn: 'Four guys who take the music – but not themselves – seriously.',
    altTextSv: 'Det 7:e Gunget live porträtt',
    altTextEn: 'Det 7:e Gunget live portrait',
  },
  {
    id: 'gal-fan-real',
    category: 'fan_central',
    mediaUrl: '/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp',
    frameStyle: 'polaroid',
    rotation: 2,
    captionSv: 'Vårt mest trogna fan i publiken – sjunger med i varje refräng!',
    captionEn: 'Our most loyal fan in the crowd – singing along to every chorus!',
    altTextSv: 'Leende fan på konsert',
    altTextEn: 'Smiling fan at concert',
  },
  {
    id: 'gal-fan-electric',
    category: 'fan_central',
    mediaUrl: '/media/fan-central/fanpic.png',
    frameStyle: 'taped',
    rotation: -1,
    captionSv: 'Andersson 45W bordsfläkt – håller trummisen sval under svettiga 12-taktare.',
    captionEn: 'Andersson 45W desk fan – keeping the drummer cool during sweaty shuffles.',
    altTextSv: 'Elektrisk bordsfläkt på scen',
    altTextEn: 'Electric desk fan on stage',
  },
]

const songs = [
  {
    id: 'song-det-sjunde-gunget',
    title: 'Det Sjunde Gunget',
    isOriginal: 1,
    originalArtist: null,
    embedProvider: 'spotify',
    embedUrl: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT',
    audioUrl: null,
    duration: 214,
    sortOrder: 1,
  },
  {
    id: 'song-hoochie-coochie',
    title: 'Hoochie Coochie Man',
    isOriginal: 0,
    originalArtist: 'Muddy Waters',
    embedProvider: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/e_l6A76NulA',
    audioUrl: null,
    duration: 185,
    sortOrder: 2,
  },
  {
    id: 'song-born-under-bad-sign',
    title: 'Born Under a Bad Sign',
    isOriginal: 0,
    originalArtist: 'Albert King',
    embedProvider: 'spotify',
    embedUrl: 'https://open.spotify.com/embed/track/303W6xRzNqXJvHchW9bW19',
    audioUrl: null,
    duration: 168,
    sortOrder: 3,
  },
  {
    id: 'song-svang-i-kallaren',
    title: 'Sväng i Källaren',
    isOriginal: 1,
    originalArtist: null,
    embedProvider: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    audioUrl: null,
    duration: 195,
    sortOrder: 4,
  },
]

const defaultHashtags = [
  { id: 'tag-1', tag: '#DetSjundeGunget', category: 'all', sortOrder: 1 },
  { id: 'tag-2', tag: '#BluesRock', category: 'all', sortOrder: 2 },
  { id: 'tag-3', tag: '#SvenskBlues', category: 'all', sortOrder: 3 },
  { id: 'tag-4', tag: '#BluesSverige', category: 'all', sortOrder: 4 },
  { id: 'tag-5', tag: '#LiveMusik', category: 'gig', sortOrder: 5 },
  { id: 'tag-6', tag: '#GigsSverige', category: 'gig', sortOrder: 6 },
  { id: 'tag-7', tag: '#BluesBand', category: 'gig', sortOrder: 7 },
  { id: 'tag-8', tag: '#KlubbSpelning', category: 'gig', sortOrder: 8 },
  { id: 'tag-9', tag: '#SkåneBlues', category: 'gig', sortOrder: 9 },
  { id: 'tag-10', tag: '#NyMusik', category: 'song', sortOrder: 10 },
  { id: 'tag-11', tag: '#BluesLåt', category: 'song', sortOrder: 11 },
  { id: 'tag-12', tag: '#SpotifySverige', category: 'song', sortOrder: 12 },
  { id: 'tag-13', tag: '#BluesShuffle', category: 'song', sortOrder: 13 },
  { id: 'tag-14', tag: '#BandNytt', category: 'news', sortOrder: 14 },
  { id: 'tag-15', tag: '#TurnéNyheter', category: 'news', sortOrder: 15 },
  { id: 'tag-16', tag: '#StudioLiv', category: 'news', sortOrder: 16 },
  { id: 'tag-17', tag: '#ScenBilder', category: 'photo', sortOrder: 17 },
  { id: 'tag-18', tag: '#Backstage', category: 'photo', sortOrder: 18 },
  { id: 'tag-19', tag: '#FanCentral', category: 'photo', sortOrder: 19 },
]

await client.batch(
  [
    ...gigs.map((g) => ({
      sql: `insert into gigs (id, date, venue, city, status, notes_sv, notes_en, ticket_url, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [g.id, g.date, g.venue, g.city, g.status, g.notesSv, g.notesEn, g.ticketUrl, now, now],
    })),
    ...members.map((m) => ({
      sql: `insert into band_members (id, name, role, bio_sv, bio_en, photo_url, gear_sv, gear_en, favorite_chord, weakness_sv, coffee_consumption, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        m.id,
        m.name,
        m.role,
        m.bioSv,
        m.bioEn,
        m.photoUrl,
        m.gearSv,
        m.gearEn,
        m.favoriteChord,
        m.weaknessSv,
        m.coffeeConsumption,
        m.sortOrder,
        now,
        now,
      ],
    })),
    ...gallery.map((g) => ({
      sql: `insert into gallery_items (id, category, media_url, frame_style, rotation, caption_sv, caption_en, alt_text_sv, alt_text_en, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        g.id,
        g.category,
        g.mediaUrl,
        g.frameStyle,
        g.rotation,
        g.captionSv,
        g.captionEn,
        g.altTextSv,
        g.altTextEn,
        now,
        now,
      ],
    })),
    ...songs.map((s) => ({
      sql: `insert into songs (id, title, is_original, original_artist, embed_provider, embed_url, audio_url, duration, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.id,
        s.title,
        s.isOriginal,
        s.originalArtist,
        s.embedProvider,
        s.embedUrl,
        s.audioUrl,
        s.duration,
        s.sortOrder,
        now,
        now,
      ],
    })),
    ...admins.map((a) => ({
      sql: `insert into admins (id, name, email, username, role, password_hash, salt, provider, avatar_url, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        a.id,
        a.name,
        a.email,
        a.username,
        a.role,
        a.passwordHash,
        a.salt,
        a.provider,
        a.avatarUrl,
        now,
        now,
      ],
    })),
    ...defaultHashtags.map((h) => ({
      sql: `insert into social_hashtags (id, tag, category, is_active, sort_order, created_at, updated_at)
        values (?, ?, ?, 1, ?, ?, ?)`,
      args: [h.id, h.tag, h.category, h.sortOrder, now, now],
    })),
  ],
  'write',
)

console.log(`Seeded ${admins.length} admins, ${gigs.length} gigs, ${members.length} band members, ${gallery.length} gallery items, ${songs.length} songs, and ${defaultHashtags.length} hashtags.`)