import { requireAdminAuth } from '../../utils/auth'
import { getAdminHome } from '../../utils/admin-home'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminAuth(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return getAdminHome(admin.id)
})