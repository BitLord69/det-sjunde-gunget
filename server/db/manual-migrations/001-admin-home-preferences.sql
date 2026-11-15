-- Apply deliberately to the intended Turso database; no existing rows are modified.
CREATE TABLE IF NOT EXISTS admin_home_preferences (
  admin_id TEXT PRIMARY KEY NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  home_path TEXT NOT NULL DEFAULT '/admin/songs'
);