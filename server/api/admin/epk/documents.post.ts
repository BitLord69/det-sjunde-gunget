import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../../../db/client'
import { epkDocuments } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

const documentSchema = z.object({
  id: z.string().optional(),
  titleSv: z.string().min(1, 'Titel på svenska krävs'),
  titleEn: z.string().optional().nullable(),
  descriptionSv: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  fileUrl: z.string().min(1, 'Fil-URL eller sökväg krävs'),
  fileType: z.string().default('pdf'),
  fileSize: z.string().optional().nullable(),
  category: z.string().default('poster'),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)
  const validated = documentSchema.parse(body)

  if (validated.id) {
    // Update existing document
    await db
      .update(epkDocuments)
      .set({
        titleSv: validated.titleSv,
        titleEn: validated.titleEn || null,
        descriptionSv: validated.descriptionSv || null,
        descriptionEn: validated.descriptionEn || null,
        fileUrl: validated.fileUrl,
        fileType: validated.fileType || 'pdf',
        fileSize: validated.fileSize || null,
        category: validated.category || 'poster',
        sortOrder: validated.sortOrder || 0,
        isActive: validated.isActive,
        updatedAt: new Date(),
      })
      .where(eq(epkDocuments.id, validated.id))

    return { success: true, id: validated.id }
  }

  // Insert new document
  const id = `doc-${nanoid(8)}`
  await db.insert(epkDocuments).values({
    id,
    titleSv: validated.titleSv,
    titleEn: validated.titleEn || null,
    descriptionSv: validated.descriptionSv || null,
    descriptionEn: validated.descriptionEn || null,
    fileUrl: validated.fileUrl,
    fileType: validated.fileType || 'pdf',
    fileSize: validated.fileSize || null,
    category: validated.category || 'poster',
    sortOrder: validated.sortOrder || 0,
    isActive: validated.isActive,
  })

  return { success: true, id }
})
