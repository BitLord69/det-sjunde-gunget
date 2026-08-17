import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../server/db/client'
import { admins } from '../../../server/db/schema'
import { createAdminSession } from '../../../server/utils/auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  if (!code) {
    return sendRedirect(event, '/admin/login?error=missing_code')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || '462278567234-thghbfbq5k2akhr8cj6fpr618g7qmise.apps.googleusercontent.com'
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''

  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`

  try {
    // 1. Exchange authorization code for access token
    const tokenResponse: any = await $fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const accessToken = tokenResponse.access_token

    // 2. Fetch Google user profile
    const googleUser: any = await $fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const email = (googleUser.email || '').toLowerCase().trim()
    const name = googleUser.name || 'Google Admin'
    const picture = googleUser.picture || null

    if (!email) {
      return sendRedirect(event, '/admin/login?error=no_email_from_google')
    }

    // 3. Find registered admin by email
    const existingAdmins = await db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${email}`)
      .limit(1)

    let targetAdmin = existingAdmins[0]

    // If matching admin exists, update avatar if available and proceed
    if (targetAdmin) {
      if (picture && !targetAdmin.avatarUrl) {
        await db.update(admins).set({ avatarUrl: picture }).where(eq(admins.id, targetAdmin.id))
      }
    } else {
      // If user is a band admin or authorized Google user, register them
      const id = `admin-${nanoid(8)}`
      const now = new Date()
      await db.insert(admins).values({
        id,
        name,
        email,
        username: email.split('@')[0] || `google_${nanoid(4)}`,
        role: 'Administratör',
        provider: 'google',
        avatarUrl: picture,
        createdAt: now,
        updatedAt: now,
      })

      const newlyCreated = await db.select().from(admins).where(eq(admins.id, id)).limit(1)
      targetAdmin = newlyCreated[0]
    }

    // 4. Create session and redirect to admin dashboard
    await createAdminSession(targetAdmin.id, event)
    return sendRedirect(event, '/admin')
  } catch (err: any) {
    console.error('Google OAuth Callback Error:', err)
    return sendRedirect(event, `/admin/login?error=google_auth_failed`)
  }
})
