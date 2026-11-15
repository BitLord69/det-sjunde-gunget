import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db, tursoClient } from '../db/client'
import { adminAccounts, admins } from '../db/schema'
import { createAdminSession, ensureAdminAccountsTable, getAdminFromSession } from './auth'

export type SocialProvider = 'google' | 'github' | 'facebook'
type SocialAction = 'login' | 'connect'
type SocialState = { action: SocialAction; adminId: string | null; sessionHash: string | null; offlineChallenge?: string | null }
type SocialIdentity = { providerAccountId: string; email?: string | null; username?: string | null; name?: string | null; avatarUrl?: string | null }

const STATE_SECONDS = 10 * 60
const cookieName = (provider: SocialProvider) => `gunget_oauth_${provider}`
const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex')

async function ensureStateTable() {
  await tursoClient.execute(`CREATE TABLE IF NOT EXISTS admin_oauth_states (
    state_hash TEXT PRIMARY KEY, provider TEXT NOT NULL, action TEXT NOT NULL,
    admin_id TEXT, session_hash TEXT, expires_at INTEGER NOT NULL
  )`)
}

export async function beginSocialAuth(event: H3Event, provider: SocialProvider, action: SocialAction, challenge?: unknown): Promise<string | null> {
  const admin = action === 'connect' ? await getAdminFromSession(event) : null
  const session = action === 'connect' ? getCookie(event, 'gunget_session') : undefined
  if (action === 'connect' && (!admin || !session)) return null

  await ensureStateTable()
  await tursoClient.execute({ sql: 'DELETE FROM admin_oauth_states WHERE expires_at <= ?', args: [Date.now()] })
  const state = crypto.randomBytes(32).toString('hex')
  await tursoClient.execute({
    sql: 'INSERT INTO admin_oauth_states (state_hash, provider, action, admin_id, session_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [digest(state), provider, action, admin?.id ?? null, session ? digest(session) : action === 'login' && typeof challenge === 'string' && /^[a-f0-9]{64}$/.test(challenge) ? challenge : null, Date.now() + STATE_SECONDS * 1000],
  })
  setCookie(event, cookieName(provider), state, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: STATE_SECONDS,
  })
  return state
}

export async function consumeSocialState(event: H3Event, provider: SocialProvider, state: unknown): Promise<SocialState | null> {
  const cookie = getCookie(event, cookieName(provider))
  deleteCookie(event, cookieName(provider), { path: '/', secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax' })
  if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state) || !cookie || cookie !== state) return null

  await ensureStateTable()
  // DELETE ... RETURNING consumes the nonce atomically, including across serverless instances.
  const result = await tursoClient.execute({
    sql: 'DELETE FROM admin_oauth_states WHERE state_hash = ? AND provider = ? AND expires_at > ? RETURNING action, admin_id, session_hash',
    args: [digest(state), provider, Date.now()],
  })
  const row = result.rows[0]
  if (!row || (row.action !== 'login' && row.action !== 'connect')) return null
  if (row.action === 'connect') {
    const session = getCookie(event, 'gunget_session')
    if (!session || typeof row.session_hash !== 'string' || digest(session) !== row.session_hash) return null
    const admin = await getAdminFromSession(event)
    if (!admin || admin.id !== row.admin_id) return null
    return { action: 'connect', adminId: admin.id, sessionHash: row.session_hash }
  }
  return { action: 'login', adminId: null, sessionHash: null, offlineChallenge: typeof row.session_hash === 'string' ? row.session_hash : null }
}

export async function consumeOfflineLoginProof(event: H3Event, nonce: unknown): Promise<boolean> {
  const session = getCookie(event, 'gunget_session')
  if (!session || typeof nonce !== 'string' || !/^[a-f0-9]{64}$/.test(nonce)) return false
  const admin = await getAdminFromSession(event)
  if (!admin) return false
  await ensureStateTable()
  const result = await tursoClient.execute({
    sql: 'DELETE FROM admin_oauth_states WHERE state_hash = ? AND provider = ? AND action = ? AND admin_id = ? AND session_hash = ? AND expires_at > ? RETURNING state_hash',
    args: [digest(nonce), 'offline-proof', 'login', admin.id, digest(session), Date.now()],
  })
  return result.rows.length === 1
}

export async function completeSocialAuth(event: H3Event, provider: SocialProvider, state: SocialState, identity: SocialIdentity) {
  if (!identity.providerAccountId) throw new Error('Missing provider account ID')
  await ensureAdminAccountsTable()

  if (state.action === 'connect') {
    // Recheck the initiating session after the provider round trip and before writing.
    const session = getCookie(event, 'gunget_session')
    const admin = await getAdminFromSession(event)
    if (!session || !admin || admin.id !== state.adminId || digest(session) !== state.sessionHash) {
      return sendRedirect(event, '/admin/login?error=social_session_expired')
    }

    // Fail closed on legacy duplicates; these indexes also prevent concurrent linking races.
    await tursoClient.execute('CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_provider_identity_unique ON admin_accounts(provider, provider_account_id)')
    await tursoClient.execute('CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_admin_provider_unique ON admin_accounts(admin_id, provider)')
    const existing = await db.select().from(adminAccounts).where(and(eq(adminAccounts.provider, provider), eq(adminAccounts.providerAccountId, identity.providerAccountId))).limit(1)
    if (existing[0] && existing[0].adminId !== admin.id) return sendRedirect(event, '/admin/profile?error=social_conflict')
    const current = await db.select().from(adminAccounts).where(and(eq(adminAccounts.provider, provider), eq(adminAccounts.adminId, admin.id))).limit(1)
    if (current[0] && current[0].providerAccountId !== identity.providerAccountId) return sendRedirect(event, '/admin/profile?error=social_already_connected')
    if (!existing[0]) {
      const now = new Date()
      await db.insert(adminAccounts).values({ id: `acc-${nanoid(12)}`, adminId: admin.id, provider, ...identity, createdAt: now, updatedAt: now })
    }
    return sendRedirect(event, `/admin/profile?connected=${provider}`)
  }

  const matches = await db.select().from(adminAccounts).where(and(eq(adminAccounts.provider, provider), eq(adminAccounts.providerAccountId, identity.providerAccountId))).limit(2)
  if (matches.length !== 1 || !matches[0]) return sendRedirect(event, '/admin/login?error=social_not_linked')
  const target = await db.select().from(admins).where(eq(admins.id, matches[0].adminId)).limit(1)
  if (!target[0]) return sendRedirect(event, '/admin/login?error=social_not_linked')
  const session = await createAdminSession(target[0].id, event)
  if (state.offlineChallenge) {
    try {
      await tursoClient.execute({
        sql: 'INSERT INTO admin_oauth_states (state_hash, provider, action, admin_id, session_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [state.offlineChallenge, 'offline-proof', 'login', target[0].id, digest(session.token), Date.now() + STATE_SECONDS * 1000],
      })
      return sendRedirect(event, '/admin?offlineLogin=1')
    } catch { /* Social login must still work when offline preparation is unavailable. */ }
  }
  return sendRedirect(event, '/admin')
}