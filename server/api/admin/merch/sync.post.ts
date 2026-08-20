import { requireAdminAuth } from '../../../utils/auth'
import { syncMerchFromSpreadshop } from '../../../utils/merchSync'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const result = await syncMerchFromSpreadshop()

  return {
    success: result.success,
    totalItems: result.totalItems,
    syncedAt: result.syncedAt,
    error: result.error,
  }
})
