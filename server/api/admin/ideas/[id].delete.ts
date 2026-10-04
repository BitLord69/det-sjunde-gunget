import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { voiceMemos } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'ID saknas.' })
  }

  try {
    await db.delete(voiceMemos).where(eq(voiceMemos.id, id))

    return {
      success: true,
      id,
    }
  } catch (error: unknown) {
    console.error('[Ideas API] Error deleting voice memo:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Kunde inte radera röstmemot.',
    })
  }
})
