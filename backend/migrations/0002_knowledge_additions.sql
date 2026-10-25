-- Tell handbook text apart from what Dana adds. Entries get a `source`; replies saved to an
-- existing entry become rows in `knowledge_additions` instead of text appended to its body.

ALTER TABLE knowledge_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'handbook';
UPDATE knowledge_entries SET source = 'reply' WHERE from_parent_question = 1;
ALTER TABLE knowledge_entries DROP COLUMN from_parent_question;

CREATE TABLE knowledge_additions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  text TEXT NOT NULL,
  source_inquiry_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX knowledge_additions_entry ON knowledge_additions (entry_id, created_at);
