import { createClient } from '@libsql/client'
import 'dotenv/config'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

console.log('Testing Brevo API key & Database tables...')

// 1. Check Brevo API Key
if (process.env.BREVO_API_KEY) {
  console.log('✓ BREVO_API_KEY detected:', process.env.BREVO_API_KEY.slice(0, 15) + '...')
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const acc = await res.json()
      console.log(`✓ Brevo Account connected: ${acc.email} (${acc.companyName || 'Det 7:e Gunget'})`)
    } else {
      console.warn(`! Brevo API returned status ${res.status}:`, await res.text())
    }
  } catch (err) {
    console.error('! Brevo connection error:', err.message)
  }
} else {
  console.warn('! No BREVO_API_KEY in .env')
}

// 2. Check Database Tables
const tables = ['songs', 'messages', 'subscribers', 'gigs', 'band_members', 'admins']
for (const table of tables) {
  try {
    const countRes = await client.execute(`SELECT count(*) as count FROM ${table}`)
    console.log(`✓ Table [${table}] exists, rows:`, countRes.rows[0].count)
  } catch (err) {
    console.error(`! Table [${table}] error:`, err.message)
  }
}

console.log('\nAll checks completed!')
