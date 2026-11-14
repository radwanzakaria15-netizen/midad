CREATE TABLE IF NOT EXISTS midad_workspaces (
  owner_id TEXT PRIMARY KEY NOT NULL,
  workspace_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS midad_students (
  student_code TEXT PRIMARY KEY NOT NULL CHECK(length(student_code)=6),
  owner_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_midad_students_owner ON midad_students(owner_id);