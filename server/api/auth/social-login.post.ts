import { eq, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { admins } from '../../db/schema'
import { createAdminSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const provider = body.provider || 'google' // 'google' | 'github' | 'band_quick'
  const memberId = body.memberId // e.g. 'admin-janis' or 'admin-bosse'
  const email = (body.email || '').trim().toLowerCase()
  const name = body.name || ''

  let targetAdmin: any = null

  if (memberId) {
    const list = await db.select().from(admins).where(eq(admins.id, memberId)).limit(1)
    targetAdmin = list[0]
  } else if (email) {
    const list = await db
      .select()
      .from(admins)
      .where(sql`lower(${admins.email}) = ${email}`)
      .limit(1)
    targetAdmin = list[0]
  }

  if (!targetAdmin && name && email) {
    // Register new admin via social provider if allowed
    const id = `admin-${nanoid(8)}`
    const now = new Date()
    await db.insert(admins).values({
      id,
      name,
      email,
      username: email.split('@')[0] || `admin_${nanoid(4)}`,
      role: 'Administratör',
      provider,
      avatarUrl: body.avatarUrl || null,
      createdAt: now,
      updatedAt: now,
    })

    const list = await db.select().from(admins).where(eq(admins.id, id)).limit(1)
    targetAdmin = list[0]
  }

  if (!targetAdmin) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Ingen administratör hittades för denna inloggning',
    })
  }

  await createAdminSession(targetAdmin.id, event)

  return {
    success: true,
    user: {
      id: targetAdmin.id,
      name: targetAdmin.name,
      email: targetAdmin.email,
      username: targetAdmin.username,
      role: targetAdmin.role,
      provider: targetAdmin.provider,
      avatarUrl: targetAdmin.avatarUrl,
    },
  }
})
