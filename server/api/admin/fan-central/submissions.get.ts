import { desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { fanSubmissions } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const submissions = await db
    .select()
    .from(fanSubmissions)
    .orderBy(desc(fanSubmissions.createdAt))

  const pendingCount = submissions.filter((s) => s.status === 'pending').length
  const approvedCount = submissions.filter((s) => s.status === 'approved').length
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length

  return {
    submissions,
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: submissions.length,
    },
  }
})
