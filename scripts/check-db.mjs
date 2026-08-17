import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

const result = await client.execute(
  "select name from sqlite_master where type = 'table' order by name",
)

console.log(result.rows.map((row) => row.name).join(', '))
