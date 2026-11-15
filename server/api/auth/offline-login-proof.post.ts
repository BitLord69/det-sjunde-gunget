import { consumeOfflineLoginProof } from '../../utils/social-auth'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const body = await readBody<{ nonce?: unknown }>(event)
  return { verified: await consumeOfflineLoginProof(event, body?.nonce) }
})