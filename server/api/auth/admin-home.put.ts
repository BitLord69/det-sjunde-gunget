import { requireAdminAuth } from '../../utils/auth'
import { saveAdminHome } from '../../utils/admin-home'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminAuth(event)
  const body = await readBody(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return saveAdminHome(admin.id, body?.homePath)
})