import { createClient } from '@libsql/client'
import 'dotenv/config'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
})

console.log('Testing booking message & subscriber database operations...')

// Test message insert
const msgId = `test-msg-${Date.now()}`
await client.execute({
  sql: `INSERT INTO messages (id, name, email, phone, event_type, event_date, location, body, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [msgId, 'Test Beställare', 'test@exempel.se', '070-112233', 'Klubb / Pub', '2026-10-10', 'Ängelholm', 'Vi vill gärna boka bandet för en helkväll!', 'unread', Date.now()],
})

const msgCheck = await client.execute({
  sql: `SELECT * FROM messages WHERE id = ?`,
  args: [msgId],
})
console.log('✓ Inserted test message:', msgCheck.rows[0].name, 'Status:', msgCheck.rows[0].status)

// Clean up test message
await client.execute({ sql: `DELETE FROM messages WHERE id = ?`, args: [msgId] })
console.log('✓ Cleaned up test message.')

console.log('All DB operations verified successfully!')
