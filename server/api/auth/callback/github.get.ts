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

  const clientId = process.env.GITHUB_CLIENT_ID || ''
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || ''

  try {
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

    if (!normalizedEmail) {
      return sendRedirect(event, '/admin/login?error=no_email_from_github')
    }

    // 3. Find registered admin by email
    const existingAdmins = await db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${normalizedEmail}`)
      .limit(1)

    let targetAdmin = existingAdmins[0]

    if (targetAdmin) {
      if (picture && !targetAdmin.avatarUrl) {
        await db.update(admins).set({ avatarUrl: picture }).where(eq(admins.id, targetAdmin.id))
      }
    } else {
      const id = `admin-${nanoid(8)}`
      const now = new Date()
      await db.insert(admins).values({
        id,
        name,
        email: normalizedEmail,
        username: githubUser.login || `github_${nanoid(4)}`,
        role: 'Administratör',
        provider: 'github',
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
    console.error('GitHub OAuth Callback Error:', err)
    return sendRedirect(event, `/admin/login?error=github_auth_failed`)
  }
})
