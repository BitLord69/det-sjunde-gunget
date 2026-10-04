import dotenv from 'dotenv'
import { createClient } from '@libsql/client'
dotenv.config()

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN
})

async function run() {
  const res = await client.execute('SELECT * FROM songs')
  console.log(JSON.stringify(res.rows.map(r => ({ id: r.id, title: r.title, original_artist: r.original_artist, is_original: r.is_original })), null, 2))
}

run()
