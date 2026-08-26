import { and, eq, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../db/client'
import { adminAccounts, admins } from '../../../db/schema'
import { createAdminSession, ensureAdminAccountsTable, getAdminFromSession } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const rawState = query.state as string

  let stateObj: { action?: string } = {}
  try {
    if (rawState) {
      stateObj = JSON.parse(decodeURIComponent(rawState))
    }
  } catch {
    // Ignore invalid state JSON
  }

  if (!code) {
    return sendRedirect(event, '/admin/login?error=missing_code')
  }

  const clientId = process.env.GITHUB_CLIENT_ID || ''
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || ''

  try {
    await ensureAdminAccountsTable()

    // 1. Exchange code for access token
    const tokenResponse: any = await $fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      headers: {
        Accept: 'application/json',
      },
    })

    const accessToken = tokenResponse.access_token

    // 2. Fetch GitHub user profile
    const githubUser: any = await $fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Det-Sjunde-Gunget-App',
      },
    })

    let email = githubUser.email

    if (!email) {
      const emails: any = await $fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Det-Sjunde-Gunget-App',
        },
      })
      const primary = emails.find((e: any) => e.primary && e.verified)
      email = primary ? primary.email : emails[0]?.email
    }

    const normalizedEmail = (email || '').toLowerCase().trim()
    const name = githubUser.name || githubUser.login || 'GitHub Admin'
    const picture = githubUser.avatar_url || null
    const providerAccountId = String(githubUser.id)

    // Check if the user is already logged in (CONNECT ACTION)
    const loggedInAdmin = await getAdminFromSession(event)

    if (loggedInAdmin || stateObj.action === 'connect') {
      const targetAdminId = loggedInAdmin?.id
      if (targetAdminId) {
        // Remove existing github link for this admin if any
        await db
          .delete(adminAccounts)
          .where(
            and(
              eq(adminAccounts.adminId, targetAdminId),
              eq(adminAccounts.provider, 'github')
            )
          )

        // Insert new connected account link
        const now = new Date()
        await db.insert(adminAccounts).values({
          id: `acc-${nanoid(8)}`,
          adminId: targetAdminId,
          provider: 'github',
          providerAccountId,
          email: normalizedEmail || null,
          username: githubUser.login || null,
          name,
          avatarUrl: picture,
          createdAt: now,
          updatedAt: now,
        })

        return sendRedirect(event, '/admin/profile?connected=github')
      }
    }

    // LOGIN ACTION:
    // 1. Look up existing link in admin_accounts
    const linkedAccounts = await db
      .select()
      .from(adminAccounts)
      .where(
        and(
          eq(adminAccounts.provider, 'github'),
          or(
            eq(adminAccounts.providerAccountId, providerAccountId),
            normalizedEmail ? sql`lower(${adminAccounts.email}) = ${normalizedEmail}` : sql`1=0`
          )
        )
      )
      .limit(1)

    let targetAdmin: any = null
    const firstLinked = linkedAccounts[0]

    if (firstLinked) {
      const adminRows = await db
        .select()
        .from(admins)
        .where(eq(admins.id, firstLinked.adminId))
        .limit(1)
      targetAdmin = adminRows[0]
    }

    // 2. If not found in admin_accounts, check admins by email or username
    if (!targetAdmin) {
      const matchingAdmins = await db
        .select()
        .from(admins)
        .where(
          or(
            normalizedEmail ? sql`lower(${admins.email}) = ${normalizedEmail}` : sql`1=0`,
            sql`lower(${admins.username}) = ${githubUser.login.toLowerCase()}`
          )
        )
        .limit(1)

      if (matchingAdmins.length > 0) {
        targetAdmin = matchingAdmins[0]

        // Link to admin_accounts for future logins
        const now = new Date()
        await db.insert(adminAccounts).values({
          id: `acc-${nanoid(8)}`,
          adminId: targetAdmin.id,
          provider: 'github',
          providerAccountId,
          email: normalizedEmail || null,
          username: githubUser.login || null,
          name,
          avatarUrl: picture,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    // 3. If still not found, create new admin
    if (!targetAdmin) {
      const id = `admin-${nanoid(8)}`
      const now = new Date()
      await db.insert(admins).values({
        id,
        name,
        email: normalizedEmail || `${githubUser.login}@github.user`,
        username: githubUser.login || `github_${nanoid(4)}`,
        role: 'Administratör',
        provider: 'github',
        avatarUrl: picture,
        createdAt: now,
        updatedAt: now,
      })

      await db.insert(adminAccounts).values({
        id: `acc-${nanoid(8)}`,
        adminId: id,
        provider: 'github',
        providerAccountId,
        email: normalizedEmail || null,
        username: githubUser.login || null,
        name,
        avatarUrl: picture,
        createdAt: now,
        updatedAt: now,
      })

      const newlyCreated = await db.select().from(admins).where(eq(admins.id, id)).limit(1)
      targetAdmin = newlyCreated[0]
    }

    if (!targetAdmin) {
      throw new Error('Admin account could not be found or initialized.')
    }

    // 4. Create session and redirect to admin dashboard
    await createAdminSession(targetAdmin.id, event)
    return sendRedirect(event, '/admin')
  } catch (err: any) {
    console.error('GitHub OAuth Callback Error:', err)
    return sendRedirect(event, `/admin/login?error=github_auth_failed`)
  }
})
