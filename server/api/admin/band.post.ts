import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { bandMembers } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.id || !body.name || !body.role) {
    throw createError({ statusCode: 400, message: 'ID, name and role are required' })
  }

  await db
    .update(bandMembers)
    .set({
      name: body.name,
      role: body.role,
      bioSv: body.bioSv || '',
      bioEn: body.bioEn || '',
      photoUrl: body.photoUrl || null,
      gearSv: body.gearSv || null,
      gearEn: body.gearEn || null,
      favoriteChord: body.favoriteChord || null,
      weaknessSv: body.weaknessSv || null,
      coffeeConsumption: body.coffeeConsumption || null,
      updatedAt: new Date(),
    })
    .where(eq(bandMembers.id, body.id))

  return { success: true, id: body.id, updated: true }
})
