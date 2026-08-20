# Database Migrations & Schema Verification Rule

Whenever updating `server/db/schema.ts` or migrating data to Turso Cloud:

1. **Keep Migration Scripts in Sync with Schema**:
   - Every column added or altered in `server/db/schema.ts` must have a corresponding definition in `scripts/sync-database.mjs` (both in `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN` try-catch blocks, as well as the batch `INSERT` field list).

2. **Automated Verification Step**:
   - Always run `node scripts/sync-database.mjs` to ensure the remote Turso Cloud database is synchronized.
   - Run a test query verifying table row counts and Drizzle `select()` execution on both local and Turso Cloud database instances.

3. **Verify API Endpoints & Relations**:
   - Ensure all endpoints using relational queries (such as `gigSetlistItems.findMany({ with: ... })`) have error handling and that child tables exist remotely with proper foreign keys.
