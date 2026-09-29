import { requireAdminAuth } from '../../../utils/auth'
import { syncMerchFromSpreadshop } from '../../../utils/merchSync'
import { invalidateMerchServerCache } from '../../merch.get'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const result = await syncMerchFromSpreadshop()
  invalidateMerchServerCache()

  return {
    success: result.success,
    count: result.totalItems,
    totalItems: result.totalItems,
    syncedAt: result.syncedAt,
    error: result.error,
  }
})
