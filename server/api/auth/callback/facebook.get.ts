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

  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || ''
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET || ''

  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/facebook`

  try {
    await ensureAdminAccountsTable()

    // 1. Exchange authorization code for access token
    const tokenResponse: any = await $fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      },
    })

    const accessToken = tokenResponse.access_token

    // 2. Fetch Facebook user profile
    const fbUser: any = await $fetch('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    })

    const email = (fbUser.email || '').toLowerCase().trim()
    const name = fbUser.name || 'Facebook Admin'
    const picture = fbUser.picture?.data?.url || null
    const providerAccountId = String(fbUser.id)

    // Check if the user is already logged in (CONNECT ACTION)
    const loggedInAdmin = await getAdminFromSession(event)

    if (loggedInAdmin || stateObj.action === 'connect') {
      const targetAdminId = loggedInAdmin?.id
      if (targetAdminId) {
        // Remove existing facebook link for this admin if any
        await db
          .delete(adminAccounts)
          .where(
            and(
              eq(adminAccounts.adminId, targetAdminId),
              eq(adminAccounts.provider, 'facebook')
            )
          )

        // Insert new connected account link
        const now = new Date()
        await db.insert(adminAccounts).values({
          id: `acc-${nanoid(8)}`,
          adminId: targetAdminId,
          provider: 'facebook',
          providerAccountId,
          email: email || null,
          name,
          avatarUrl: picture,
          createdAt: now,
          updatedAt: now,
        })

        return sendRedirect(event, '/admin/profile?connected=facebook')
      }
    }

    // LOGIN ACTION:
    // 1. Look up existing link in admin_accounts
    const linkedAccounts = await db
      .select()
      .from(adminAccounts)
      .where(
        and(
          eq(adminAccounts.provider, 'facebook'),
          or(
            eq(adminAccounts.providerAccountId, providerAccountId),
            email ? sql`lower(${adminAccounts.email}) = ${email}` : sql`1=0`
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

    // 2. If not in admin_accounts, check admins by email
    if (!targetAdmin && email) {
      const matchingAdmins = await db
        .select()
        .from(admins)
        .where(sql`lower(${admins.email}) = ${email}`)
        .limit(1)

      if (matchingAdmins.length > 0) {
        targetAdmin = matchingAdmins[0]

        // Link to admin_accounts for future logins
        const now = new Date()
        await db.insert(adminAccounts).values({
          id: `acc-${nanoid(8)}`,
          adminId: targetAdmin.id,
          provider: 'facebook',
          providerAccountId,
          email: email || null,
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
        email: email || `${providerAccountId}@facebook.user`,
        username: `fb_${nanoid(6)}`,
        role: 'Administratör',
        provider: 'facebook',
        avatarUrl: picture,
        createdAt: now,
        updatedAt: now,
      })

      await db.insert(adminAccounts).values({
        id: `acc-${nanoid(8)}`,
        adminId: id,
        provider: 'facebook',
        providerAccountId,
        email: email || null,
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
    console.error('Facebook OAuth Callback Error:', err)
    return sendRedirect(event, `/admin/login?error=facebook_auth_failed`)
  }
})
