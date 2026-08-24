import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { voiceMemos } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID saknas.' })
  }

  try {
    await db.delete(voiceMemos).where(eq(voiceMemos.id, id))

    return {
      success: true,
      id,
    }
  } catch (error: any) {
    console.error('[Ideas API] Error deleting voice memo:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte radera röstmemot.',
    })
  }
})
