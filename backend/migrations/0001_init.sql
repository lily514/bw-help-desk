-- Schema per PLAN.md 2.1. Timestamps are ISO 8601 UTC strings.

CREATE TABLE parents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  child_name TEXT NOT NULL,
  room TEXT NOT NULL,
  is_demo INTEGER NOT NULL,
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  citations TEXT,
  staff_name TEXT,
  staff_role TEXT,
  inquiry_id TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX messages_parent_created ON messages (parent_id, created_at);

CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  route TEXT NOT NULL,
  reason TEXT NOT NULL,
  scores TEXT NOT NULL,
  router TEXT NOT NULL,
  suggested_role TEXT NOT NULL,
  topic TEXT NOT NULL,
  answerable INTEGER NOT NULL,
  status TEXT NOT NULL,
  forwarded_to TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX inquiries_parent ON inquiries (parent_id, created_at);
CREATE INDEX inquiries_created ON inquiries (created_at);

CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  from_parent_question INTEGER NOT NULL DEFAULT 0,
  source_inquiry_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE test_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  scenario_num INTEGER NOT NULL,
  question TEXT NOT NULL,
  expected TEXT NOT NULL,
  actual TEXT NOT NULL,
  passed INTEGER NOT NULL,
  unsafe_miss INTEGER NOT NULL,
  learned INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX test_results_run ON test_results (run_id, scenario_num);
