import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
})

const result = await client.execute(
  "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
)

console.log(`Database (${client.protocol === 'file:' ? 'Local' : client.url || 'Connected'}):`)
for (const row of result.rows) {
  try {
    const countRes = await client.execute(`SELECT count(*) as count FROM "${row.name}"`)
    console.log(`  - ${row.name}: ${countRes.rows[0].count} rows`)
  } catch (err) {
    console.log(`  - ${row.name}: error reading (${err.message})`)
  }
}
