/**
 * Helper to retrieve the active Vercel Blob Read/Write token.
 * Supports standard BLOB_READ_WRITE_TOKEN as well as Vercel's store-prefixed
 * environment variables (e.g. DetSjundeGunget_READ_WRITE_TOKEN or DetSjundeGunget_BLOB_READ_WRITE_TOKEN).
 */
export const getBlobToken = (): string | undefined => {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN
  }

  // Check any environment variable ending with READ_WRITE_TOKEN
  for (const [key, val] of Object.entries(process.env)) {
    if (key.endsWith('READ_WRITE_TOKEN') && val) {
      return val
    }
  }

  return undefined
}
