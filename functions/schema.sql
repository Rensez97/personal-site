-- D1 schema for the contact form + event counter.
-- Apply with: wrangler d1 execute site-db --remote --file=functions/schema.sql

CREATE TABLE IF NOT EXISTS messages (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      TEXT NOT NULL,
  name    TEXT NOT NULL,
  email   TEXT NOT NULL,
  message TEXT NOT NULL,
  ip      TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  ts    TEXT NOT NULL,
  event TEXT NOT NULL
);
