PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS midad_users (
  uid TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','teacher','admin')),
  subject TEXT,
  recovery_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_midad_users_username ON midad_users(username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS midad_invites (
  code TEXT PRIMARY KEY NOT NULL,
  created_by TEXT NOT NULL,
  subject TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK(used IN (0,1)),
  used_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_midad_invites_expiry ON midad_invites(expires_at,used);

CREATE TABLE IF NOT EXISTS midad_resources (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL CHECK(resource_type IN ('lesson','book','summary','other')),
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_midad_resources_public ON midad_resources(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_midad_resources_owner ON midad_resources(owner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS midad_ratings (
  uid TEXT PRIMARY KEY NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS midad_discussions (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_midad_discussions_created ON midad_discussions(created_at DESC);

CREATE TABLE IF NOT EXISTS midad_discussion_posts (
  id TEXT PRIMARY KEY NOT NULL,
  discussion_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(discussion_id) REFERENCES midad_discussions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_midad_posts_discussion ON midad_discussion_posts(discussion_id,created_at);
