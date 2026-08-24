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
    setlist text,
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
    lyrics text,
    lyrics_en text,
    chords text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
    updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
  )
`)

try {
  await client.execute('ALTER TABLE gigs ADD COLUMN setlist text')
} catch (_) {}

try {
  await client.execute('ALTER TABLE songs ADD COLUMN audio_url text')
} catch (_) {}
try {
  await client.execute('ALTER TABLE songs ADD COLUMN duration integer')
} catch (_) {}
try {
  await client.execute('ALTER TABLE songs ADD COLUMN lyrics text')
} catch (_) {}
try {
  await client.execute('ALTER TABLE songs ADD COLUMN lyrics_en text')
} catch (_) {}
try {
  await client.execute('ALTER TABLE songs ADD COLUMN chords text')
} catch (_) {}

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

await client.execute(`
  CREATE TABLE IF NOT EXISTS site_settings (
    key text PRIMARY KEY NOT NULL,
    value text NOT NULL,
    created_at integer DEFAULT (unixepoch() * 1000) NOT NULL,
    updated_at integer DEFAULT (unixepoch() * 1000) NOT NULL
  )
`)

await client.execute(`
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
  await client.execute('DELETE FROM setlist_items')
  await client.execute('DELETE FROM site_settings')
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
    setlist: JSON.stringify([
      { title: 'Det Sjunde Gunget', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 1: Klubbstart', notes: 'Gungig bluesrock-öppnare' },
      { title: 'Hoochie Coochie Man', artist: 'Muddy Waters', isOriginal: false, setName: 'Set 1: Klubbstart', notes: 'Klassisk Chicago-blues & munspel' },
      { title: 'Born Under a Bad Sign', artist: 'Albert King', isOriginal: false, setName: 'Set 1: Klubbstart', notes: 'Tungt gung & gitarriff' },
      { title: 'The Thrill is Gone', artist: 'B.B. King', isOriginal: false, setName: 'Set 1: Klubbstart', notes: 'Melodiskt och dynamiskt gitarrsolo' },
      { title: 'Sväng i Källaren', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 2: Svettigt ös', notes: 'Rå replokalsenergi' },
      { title: 'Sweet Home Chicago', artist: 'Robert Johnson', isOriginal: false, setName: 'Set 2: Svettigt ös', notes: 'Upptempo shuffle & allsång' },
      { title: 'Pride and Joy', artist: 'Stevie Ray Vaughan', isOriginal: false, setName: 'Set 2: Svettigt ös', notes: 'Texas blues med fullt ställ' },
      { title: 'Got My Mojo Working', artist: 'Muddy Waters', isOriginal: false, setName: 'Set 2: Svettigt ös', notes: 'Snabb shuffle & munspelsduell' },
      { title: 'Rock Me Baby', artist: 'B.B. King', isOriginal: false, setName: 'Extranummer / Encores', notes: 'Långt jammigt avslut' },
    ]),
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
    setlist: JSON.stringify([
      { title: 'Det Sjunde Gunget', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 1: Klubbstart' },
      { title: 'Hoochie Coochie Man', artist: 'Muddy Waters', isOriginal: false, setName: 'Set 1: Klubbstart' },
      { title: 'Sväng i Källaren', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 2: Svettigt ös' },
      { title: 'Got My Mojo Working', artist: 'Muddy Waters', isOriginal: false, setName: 'Set 2: Svettigt ös' },
    ]),
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
    setlist: null,
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
    setlist: JSON.stringify([
      { title: 'Det Sjunde Gunget', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 1' },
      { title: 'Born Under a Bad Sign', artist: 'Albert King', isOriginal: false, setName: 'Set 1' },
      { title: 'Sväng i Källaren', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 2' },
      { title: 'Rock Me Baby', artist: 'B.B. King', isOriginal: false, setName: 'Extranummer' },
    ]),
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
    lyrics: `[Vers 1]
Klockan slår tolv i en skånsk källarlokal
Rören i stärkaren glöder så sval
Marcus trampar igång sin gamla overdrive
Bosse sätter basen – nu är vi vid liv!

[Refräng]
För när klockan slår och kaffet tar slut
Finns det bara en sak som får oss att stå ut
Rulla upp volymen, låt munspelen sjunga
Känn hur hela huset börjar gunga!
Det är det sjunde gunget – blues i varje ton!
Det sjunde gunget – rockens revolution!

[Vers 2]
Janis drar ett riff på sin Marine Band harp
Tonen är skitig, rå och skarp
Jonas räknar in på virvel två och fyra
Hela Skåne känner svängets yra!

[Refräng]
För när klockan slår och kaffet tar slut
Finns det bara en sak som får oss att stå ut
Rulla upp volymen, låt munspelen sjunga
Känn hur hela huset börjar gunga!
Det är det sjunde gunget – blues i varje ton!
Det sjunde gunget – rockens revolution!

[Stick / Solo]
Tolvtakters blues i nattens dimma
Här ska ingen sova en enda timma!

[Outro]
Det 7:e Gunget rullar på...
Ja, det 7:e Gunget rullar på!
Tills sista strängen brister!`,
    lyricsEn: `[Verse 1]
Midnight strikes in a cellar in the South
Tube glow warming from the speaker's mouth
Marcus stomps on his trusty overdrive
Bosse locks the bass line – we are alive!

[Chorus]
When the night gets late and the coffee runs dry
There's only one thing keeping spirits high
Crank up the volume, let the harmonica ring
Feel the foundation start to swing!
It's the Seventh Groove – blues in every vein!
The Seventh Groove – rolling like a train!

[Verse 2]
Janis blows a riff on his Marine Band harp
Gritty and soulful, loud and sharp
Jonas lays the backbeat on two and four
Shaking the rafters right down through the floor!

[Chorus]
When the night gets late and the coffee runs dry
There's only one thing keeping spirits high
Crank up the volume, let the harmonica ring
Feel the foundation start to swing!
It's the Seventh Groove – blues in every vein!
The Seventh Groove – rolling like a train!

[Outro]
The Seventh Groove rolls on...
Until the last string breaks!`,
    chords: `Intro: A7 - D7 - A7 - E7 - D7 - A7 - E7
Vers: A7 | A7 | A7 | A7 | D7 | D7 | A7 | A7 | E7 | D7 | A7 | E7
Refräng: A7 | D7 | A7 | E7 | D7 | A7
Solo: 12-bar blues in A7`,
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
    lyrics: `[Verse 1]
The gypsy woman told my mother
Before I was born
I got a boy child's comin'
He's gonna be a son of a gun
He gonna make pretty wimmens
Jump and shout
Then the world wanna know
What this all about

[Chorus]
'Cause you know I'm him
Everybody knows I'm him
Well you know I'm the hoochie coochie man
Everybody knows I'm him`,
    lyricsEn: null,
    chords: `Key: A (Stop-time blues in A7)`,
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
    lyrics: `[Verse 1]
Born under a bad sign
Been down since I began to crawl
If it wasn't for bad luck
I wouldn't have no luck at all

[Verse 2]
Hard luck and trouble
Been my only friend
I've been on my own
Ever since I was ten`,
    lyricsEn: null,
    chords: `Key: C#m / Db blues`,
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
    lyrics: `[Vers 1]
Det droppar från ett rör i taket
Men här nere är vi klarvaket
Två gitarrer och en gammal bas
Kaffekoppar som går i kras!

[Refräng]
Det är sväng i källaren, rök och glöd
Bluesen håller oss borta från nöd
Höj upp till elva, stampa i golvet nu
Sväng i källaren – jag och du!

[Vers 2]
Grannarna bankar i elementet ovanpå
Men vi har ett groove som inte går att slå
En tolva i E med ett jävla drag
Här spelar vi till gryningens behag!

[Refräng]
Det är sväng i källaren, rök och glöd
Bluesen håller oss borta från nöd
Höj upp till elva, stampa i golvet nu
Sväng i källaren – jag och du!

[Outro]
Stampa takten!
Sväng i källaren!
Det 7:e Gunget!`,
    lyricsEn: `[Verse 1]
Water dripping from the cellar ceiling
Down here we've got that midnight feeling
Two vintage guitars and a heavy bass
Coffee cups rattling all over the place!

[Chorus]
Groove in the basement, smoke and glow
The blues will save us wherever we go
Turn it up to eleven, stomp the floor
Groove in the basement, give us more!`,
    chords: `Intro: E7 - A7 - E7 - B7 - A7 - E7
Vers/Refräng: 12-takt i E7`,
    sortOrder: 4,
  },
  {
    id: 'song-thrill-is-gone',
    title: 'The Thrill Is Gone',
    isOriginal: 0,
    originalArtist: 'B.B. King',
    embedProvider: 'spotify',
    embedUrl: 'https://open.spotify.com/embed/track/4gRAHQ59znhduunTW22DYG',
    audioUrl: null,
    duration: 324,
    lyrics: `The thrill is gone, the thrill is gone away\nThe thrill is gone baby, the thrill is gone away\nYou done me wrong baby, and you'll be sorry some day`,
    lyricsEn: null,
    chords: `Key: Bm / Slow blues`,
    sortOrder: 5,
  },
  {
    id: 'song-pride-and-joy',
    title: 'Pride and Joy',
    isOriginal: 0,
    originalArtist: 'Stevie Ray Vaughan',
    embedProvider: 'spotify',
    embedUrl: 'https://open.spotify.com/embed/track/25S627W9GF4utbkhCo672D',
    audioUrl: null,
    duration: 219,
    lyrics: `Well, she's my sweet little thang, she's my pride and joy\nShe's my sweet little baby, I'm her little lover boy`,
    lyricsEn: null,
    chords: `Key: Eb Texas Blues Shuffle`,
    sortOrder: 6,
  },
  {
    id: 'song-sweet-home-chicago',
    title: 'Sweet Home Chicago',
    isOriginal: 0,
    originalArtist: 'Robert Johnson',
    embedProvider: 'spotify',
    embedUrl: 'https://open.spotify.com/embed/track/10i2zUa5j2eQ3c1pI4oF0H',
    audioUrl: null,
    duration: 180,
    lyrics: `Come on, baby don't you want to go\nBack to that same old place, sweet home Chicago`,
    lyricsEn: null,
    chords: `Key: E Blues Shuffle`,
    sortOrder: 7,
  },
  {
    id: 'song-kaffe-och-ror',
    title: 'Kaffe & Rörförstärkare',
    isOriginal: 1,
    originalArtist: null,
    embedProvider: 'spotify',
    embedUrl: '#',
    audioUrl: null,
    duration: 240,
    lyrics: `[Vers 1]\nEn varm kopp kaffe och en Fender Twin\nNu börjar tonen kännas riktigt fin!\n\n[Refräng]\nKaffe och glödande rör,\nDet är det enda som vi behöver och hör!`,
    lyricsEn: null,
    chords: `Key: A7 Blues Rock`,
    sortOrder: 8,
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

const defaultSetlist = [
  { id: 'set-1', title: 'Det Sjunde Gunget', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 1: Klubbstart', notes: 'Gungig bluesrock-öppnare', sortOrder: 1 },
  { id: 'set-2', title: 'Hoochie Coochie Man', artist: 'Muddy Waters', isOriginal: false, setName: 'Set 1: Klubbstart', notes: 'Klassisk Chicago-blues & munspel', sortOrder: 2 },
  { id: 'set-3', title: 'Born Under a Bad Sign', artist: 'Albert King', isOriginal: false, setName: 'Set 1: Klubbstart', notes: 'Tungt gung & gitarriff', sortOrder: 3 },
  { id: 'set-4', title: 'The Thrill is Gone', artist: 'B.B. King', isOriginal: false, setName: 'Set 1: Klubbstart', notes: 'Melodiskt och dynamiskt gitarrsolo', sortOrder: 4 },
  { id: 'set-5', title: 'Sväng i Källaren', artist: 'Det 7:e Gunget', isOriginal: true, setName: 'Set 2: Svettigt ös', notes: 'Rå replokalsenergi', sortOrder: 5 },
  { id: 'set-6', title: 'Sweet Home Chicago', artist: 'Robert Johnson', isOriginal: false, setName: 'Set 2: Svettigt ös', notes: 'Upptempo shuffle & allsång', sortOrder: 6 },
  { id: 'set-7', title: 'Pride and Joy', artist: 'Stevie Ray Vaughan', isOriginal: false, setName: 'Set 2: Svettigt ös', notes: 'Texas blues med fullt ställ', sortOrder: 7 },
  { id: 'set-8', title: 'Got My Mojo Working', artist: 'Muddy Waters', isOriginal: false, setName: 'Set 2: Svettigt ös', notes: 'Snabb shuffle & munspelsduell', sortOrder: 8 },
  { id: 'set-9', title: 'Rock Me Baby', artist: 'B.B. King', isOriginal: false, setName: 'Extranummer / Encores', notes: 'Långt jammigt avslut med publikkontakt', sortOrder: 9 },
]

await client.batch(
  [
    ...gigs.map((g) => ({
      sql: `insert into gigs (id, date, venue, city, status, notes_sv, notes_en, ticket_url, setlist, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [g.id, g.date, g.venue, g.city, g.status, g.notesSv, g.notesEn, g.ticketUrl, g.setlist, now, now],
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
      sql: `insert into songs (id, title, is_original, original_artist, embed_provider, embed_url, audio_url, duration, lyrics, lyrics_en, chords, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.id,
        s.title,
        s.isOriginal,
        s.originalArtist,
        s.embedProvider,
        s.embedUrl,
        s.audioUrl,
        s.duration,
        s.lyrics,
        s.lyricsEn,
        s.chords,
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
    ...defaultSetlist.map((s) => ({
      sql: `insert into setlist_items (id, title, artist, is_original, set_name, notes, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.id, s.title, s.artist, s.isOriginal ? 1 : 0, s.setName, s.notes, s.sortOrder, now, now],
    })),
    {
      sql: `insert or replace into site_settings (key, value, created_at, updated_at) values (?, ?, ?, ?)`,
      args: ['newsletter_enabled', 'false', now, now],
    },
  ],
  'write',
)

console.log(`Seeded ${admins.length} admins, ${gigs.length} gigs, ${members.length} band members, ${gallery.length} gallery items, ${songs.length} songs, ${defaultHashtags.length} hashtags, and ${defaultSetlist.length} setlist tracks.`)