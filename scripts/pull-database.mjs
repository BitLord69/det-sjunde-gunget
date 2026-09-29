import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@libsql/client'

const remoteUrl = process.env.TURSO_REMOTE_URL || (!process.env.TURSO_DATABASE_URL?.startsWith('file:') ? process.env.TURSO_DATABASE_URL : null)
const remoteAuthToken = process.env.TURSO_REMOTE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN

if (!remoteUrl) {
  console.error('❌ Ingen TURSO_REMOTE_URL eller fjärrdatabas konfigurerad i .env.')
  console.log('Kontrollera TURSO_REMOTE_URL och TURSO_REMOTE_AUTH_TOKEN.')
  process.exit(1)
}

const localDbFile = path.resolve(process.cwd(), 'local.db')

console.log(`\n======================================================`)
console.log(`📥 PULL DATABASE: Hämtar skarp data från Turso Cloud`)
console.log(`======================================================`)
console.log(`Källa (Remote): ${remoteUrl.split('@').pop()}`)
console.log(`Mål   (Lokal) : ${localDbFile}\n`)

// Säkerhetskopiera befintlig local.db om den finns
if (fs.existsSync(localDbFile)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.resolve(process.cwd(), `local.db.backup-${timestamp}`)
  fs.copyFileSync(localDbFile, backupFile)
  console.log(`🛡️  Säkerhetskopia skapad av local.db -> ${path.basename(backupFile)}`)
}

const remoteClient = createClient({
  url: remoteUrl,
  authToken: remoteAuthToken,
})

const localClient = createClient({
  url: 'file:local.db',
})

async function pullDatabase() {
  // 1. Hämta alla tabeller från Turso Cloud
  const tablesResult = await remoteClient.execute(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name"
  )

  if (!tablesResult.rows.length) {
    console.log('⚠️ Inga tabeller hittades i fjärrdatabasen.')
    return
  }

  console.log(`\nHittade ${tablesResult.rows.length} tabeller i fjärrdatabasen:`)

  // 2. Skapa tabellerna lokalt om de inte redan finns
  for (const table of tablesResult.rows) {
    if (table.sql) {
      try {
        const createSql = table.sql.replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
        await localClient.execute(createSql)
      } catch (e) {
        // Ignorera om tabellen redan finns
      }
    }
  }

  // Hämta även index
  const indexesResult = await remoteClient.execute(
    "SELECT sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL"
  )
  for (const idx of indexesResult.rows) {
    try {
      await localClient.execute(idx.sql)
    } catch {}
  }

  // Stäng av foreign keys lokalt under återställningen
  await localClient.execute('PRAGMA foreign_keys = OFF;')

  // 3. Kopiera rader tabell för tabell från Turso Cloud till local.db
  let totalRowsPulled = 0

  for (const table of tablesResult.rows) {
    const tableName = table.name
    try {
      // Synka eventuella saknade kolumner till local.db
      try {
        const remoteInfo = await remoteClient.execute(`PRAGMA table_info("${tableName}")`)
        const localInfo = await localClient.execute(`PRAGMA table_info("${tableName}")`)
        const localCols = new Set(localInfo.rows.map(r => r.name))
        for (const rCol of remoteInfo.rows) {
          if (!localCols.has(rCol.name)) {
            await localClient.execute(`ALTER TABLE "${tableName}" ADD COLUMN "${rCol.name}" ${rCol.type || 'TEXT'}`)
          }
        }
      } catch {}

      const remoteData = await remoteClient.execute(`SELECT * FROM "${tableName}"`)
      const rows = remoteData.rows

      // Rensa tabellen lokalt i local.db och infoga de skarpa raderna
      await localClient.execute(`DELETE FROM "${tableName}"`)

      if (rows.length > 0) {
        const columns = remoteData.columns
        const placeholders = columns.map(() => '?').join(', ')
        const colNames = columns.map(c => `"${c}"`).join(', ')
        const sql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`

        const statements = rows.map(row => ({
          sql,
          args: columns.map(col => row[col]),
        }))

        // Kör batch i portioner om 200 satser för att undvika gränser
        const CHUNK_SIZE = 200
        for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
          const chunk = statements.slice(i, i + CHUNK_SIZE)
          await localClient.batch(chunk, 'write')
        }

        console.log(`  ✓ ${tableName.padEnd(20)}: ${rows.length} rader kopierade`)
        totalRowsPulled += rows.length
      } else {
        console.log(`  - ${tableName.padEnd(20)}: 0 rader (tom i prod)`)
      }
    } catch (err) {
      console.error(`  ❌ Fel vid kopiering av tabell ${tableName}:`, err.message)
    }
  }

  console.log(`\n🎉 Klart! Totalt ${totalRowsPulled} rader hämtades från Turso Cloud till local.db.`)
  console.log(`Din lokala miljö speglar nu produktionen exakt, helt utan risk för Prod!\n`)
}

pullDatabase().catch((err) => {
  console.error('Kritiskt fel under pull-operationen:', err)
  process.exit(1)
})
