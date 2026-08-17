import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { admins, adminSessions } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireAdminAuth(event)
  const body = await readBody(event)
  const idToDelete = body.id

  if (!idToDelete) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'ID krävs för borttagning',
    })
  }

  // Guard: Cannot delete self
  if (idToDelete === currentAdmin.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Du kan inte ta bort ditt eget administratörskonto',
    })
  }

  // Guard: Cannot delete if only 1 admin remains
  const allAdmins = await db.select().from(admins)
  if (allAdmins.length <= 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Det måste finnas minst en administratör kvar i systemet',
    })
  }

  // Clean up sessions and remove admin
  await db.delete(adminSessions).where(eq(adminSessions.userId, idToDelete))
  await db.delete(admins).where(eq(admins.id, idToDelete))

  return {
    success: true,
    message: 'Administratören har tagits bort',
  }
})
