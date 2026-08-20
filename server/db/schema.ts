import { relations, sql } from 'drizzle-orm'
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
}

export const admins = sqliteTable('admins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  role: text('role').notNull(),
  passwordHash: text('password_hash'),
  salt: text('salt'),
  provider: text('provider').notNull().default('credentials'),
  avatarUrl: text('avatar_url'),
  ...timestamps,
})

export const adminSessions = sqliteTable('admin_sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => admins.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  ...timestamps,
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  ...timestamps,
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ...timestamps,
})

export const gigs = sqliteTable('gigs', {
  id: text('id').primaryKey(),
  date: integer('date', { mode: 'timestamp_ms' }).notNull(),
  venue: text('venue').notNull(),
  city: text('city').notNull(),
  ticketUrl: text('ticket_url'),
  status: text('status', {
    enum: ['upcoming', 'sold_out', 'free', 'cancelled', 'completed'],
  }).default('upcoming'),
  notesSv: text('notes_sv'),
  notesEn: text('notes_en'),
  setlist: text('setlist'),
  ...timestamps,
})

export const bandMembers = sqliteTable('band_members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  bioSv: text('bio_sv').notNull(),
  bioEn: text('bio_en'),
  photoUrl: text('photo_url'),
  gearSv: text('gear_sv'),
  gearEn: text('gear_en'),
  favoriteChord: text('favorite_chord'),
  weaknessSv: text('weakness_sv'),
  coffeeConsumption: text('coffee_consumption'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  isOriginal: integer('is_original', { mode: 'boolean' }).notNull().default(false),
  originalArtist: text('original_artist'),
  embedProvider: text('embed_provider', {
    enum: ['spotify', 'bandcamp', 'youtube'],
  }).notNull(),
  embedUrl: text('embed_url').notNull(),
  audioUrl: text('audio_url'),
  duration: integer('duration'),
  lyrics: text('lyrics'),
  lyricsEn: text('lyrics_en'),
  chords: text('chords'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const galleryItems = sqliteTable('gallery_items', {
  id: text('id').primaryKey(),
  category: text('category', {
    enum: ['photo', 'video', 'fan_central'],
  }).notNull(),
  mediaUrl: text('media_url').notNull(),
  frameStyle: text('frame_style', {
    enum: ['polaroid', 'taped', 'grunge', 'wood'],
  }).default('polaroid'),
  rotation: integer('rotation').default(0),
  captionSv: text('caption_sv'),
  captionEn: text('caption_en'),
  altTextSv: text('alt_text_sv').notNull(),
  altTextEn: text('alt_text_en'),
  takenAt: integer('taken_at', { mode: 'timestamp_ms' }),
  ...timestamps,
})

export const newsPosts = sqliteTable('news_posts', {
  id: text('id').primaryKey(),
  titleSv: text('title_sv').notNull(),
  titleEn: text('title_en'),
  bodySv: text('body_sv').notNull(),
  bodyEn: text('body_en'),
  coverImageUrl: text('cover_image_url'),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  ...timestamps,
})

export const subscribers = sqliteTable(
  'subscribers',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    status: text('status', { enum: ['subscribed', 'unsubscribed'] })
      .notNull()
      .default('subscribed'),
    brevoContactId: text('brevo_contact_id'),
    subscribedAt: integer('subscribed_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (table) => [uniqueIndex('subscribers_email_idx').on(table.email)],
)

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  eventType: text('event_type'),
  eventDate: text('event_date'),
  location: text('location'),
  body: text('body').notNull(),
  status: text('status', { enum: ['unread', 'read', 'archived'] })
    .notNull()
    .default('unread'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  readAt: integer('read_at', { mode: 'timestamp_ms' }),
})

export const socialHashtags = sqliteTable('social_hashtags', {
  id: text('id').primaryKey(),
  tag: text('tag').notNull(),
  category: text('category').notNull().default('all'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const setlistItems = sqliteTable('setlist_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist'),
  isOriginal: integer('is_original', { mode: 'boolean' }).notNull().default(false),
  setName: text('set_name').notNull().default('Set 1'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...timestamps,
})

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))