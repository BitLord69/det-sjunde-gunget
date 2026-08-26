import crypto from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db, tursoClient } from '../../db/client'
import { admins, verification } from '../../db/schema'
import { sendTransactionalEmail } from '../../utils/brevo'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = (body.email || '').trim().toLowerCase()

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Vänligen ange din e-postadress',
    })
  }

  // Ensure verification table exists
  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )
    `)
  } catch {
    // Ignore if table exists
  }

  // Find admin user
  const userList = await db
    .select()
    .from(admins)
    .where(sql`lower(${admins.email}) = ${email}`)
    .limit(1)

  const admin = userList[0]

  // If user doesn't exist, return success message anyway to prevent user enumeration
  if (!admin) {
    return {
      success: true,
      message: 'Om e-postadressen finns registrerad har en återställningslänk skickats.',
    }
  }

  // Generate secure reset token (valid for 1 hour)
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  const identifier = `password-reset:${admin.id}`

  // Delete previous reset tokens for this admin
  await db
    .delete(verification)
    .where(eq(verification.identifier, identifier))

  // Save new reset token
  await db.insert(verification).values({
    id: `ver-${nanoid(8)}`,
    identifier,
    value: token,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Build reset link
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const resetUrl = `${protocol}://${host}/admin/reset-password?token=${token}`

  // HTML Email Template
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #f5f5f5; border: 1px solid #e2bd72; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #1c1c1c; padding: 24px; text-align: center; border-bottom: 2px solid #e2bd72;">
        <h1 style="color: #e2bd72; margin: 0; font-size: 24px; letter-spacing: 1px;">Det 7:e Gunget</h1>
        <p style="color: #a0a0a0; margin: 6px 0 0 0; font-size: 13px;">Återställning av lösenord för Admin</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; margin-top: 0;">Hej <strong>${admin.name}</strong>,</p>
        <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
          Du har begärt att återställa lösenordet till ditt administratörskonto på <strong>Det 7:e Gunget</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #e2bd72; color: #121212; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 9999px; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(226, 189, 114, 0.3);">
            Återställ mitt lösenord →
          </a>
        </div>
        <p style="color: #888888; font-size: 12px; line-height: 1.5;">
          Länken är giltig i <strong>60 minuter</strong>. Om du inte begärt denna återställning kan du tryggt bortse från detta meddelande; ditt befintliga lösenord fortsätter att gälla.
        </p>
        <div style="border-top: 1px solid #2a2a2a; margin-top: 24px; padding-top: 16px;">
          <p style="color: #666666; font-size: 11px; margin: 0;">
            Om knappen ovan inte fungerar, kopiera och klistra in följande länk i din webbläsare:<br />
            <a href="${resetUrl}" style="color: #e2bd72; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
      <div style="background-color: #181818; padding: 16px; text-align: center; border-top: 1px solid #2a2a2a;">
        <p style="color: #666666; font-size: 11px; margin: 0;">Det 7:e Gunget — Keep on bluesin'</p>
      </div>
    </div>
  `

  console.log(`[Auth] Password reset link for ${email}: ${resetUrl}`)

  // Send transactional email
  await sendTransactionalEmail({
    to: [{ email: admin.email, name: admin.name }],
    subject: 'Återställ ditt lösenord — Det 7:e Gunget',
    htmlContent: emailHtml,
  })

  return {
    success: true,
    message: 'Om e-postadressen finns registrerad har en återställningslänk skickats.',
    devResetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
  }
})
