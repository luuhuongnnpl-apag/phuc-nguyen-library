PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT NOT NULL UNIQUE,
  github_login TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  expires_at INTEGER,
  max_uses INTEGER NOT NULL DEFAULT 20,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS code_courses (
  code_id INTEGER NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  PRIMARY KEY(code_id, course_slug)
);
CREATE TABLE IF NOT EXISTS code_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  UNIQUE(code_id, device_hash)
);
CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  used_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_codes_lookup ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_devices_code ON code_devices(code_id);
CREATE INDEX IF NOT EXISTS idx_usage_code_time ON usage_events(code_id, used_at);
