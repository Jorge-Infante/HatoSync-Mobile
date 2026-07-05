import * as SQLite from 'expo-sqlite'

/**
 * Local SQLite database — the offline source of truth (Fase 1: read cache).
 * Rows are stored as JSON in a `data` column + a few indexed columns for
 * filtering. Everything is scoped by `farm_id` (the active farm at download time).
 */
let dbPromise = null

export function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('hatosync.db')
  return dbPromise
}

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS animals (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  name TEXT,
  sex TEXT,
  data TEXT,
  full_synced INTEGER DEFAULT 0,
  updated_at TEXT,
  _dirty INTEGER DEFAULT 0,
  _deleted INTEGER DEFAULT 0,
  _synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_animals_farm ON animals(farm_id);

CREATE TABLE IF NOT EXISTS reproductive_events (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  farm_id TEXT,
  date TEXT,
  data TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_animal ON reproductive_events(animal_id);

CREATE TABLE IF NOT EXISTS animal_photos (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  image TEXT,
  caption TEXT,
  data TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_animal ON animal_photos(animal_id);

CREATE TABLE IF NOT EXISTS weight_records (
  id TEXT PRIMARY KEY,
  animal_id TEXT,
  farm_id TEXT,
  date TEXT,
  data TEXT
);
CREATE INDEX IF NOT EXISTS idx_weights_animal ON weight_records(animal_id);

CREATE TABLE IF NOT EXISTS breeds ( id TEXT PRIMARY KEY, farm_id TEXT, data TEXT );
CREATE TABLE IF NOT EXISTS identification_types ( id TEXT PRIMARY KEY, farm_id TEXT, data TEXT );
CREATE TABLE IF NOT EXISTS farms ( id TEXT PRIMARY KEY, data TEXT );
CREATE TABLE IF NOT EXISTS farm_members ( id TEXT PRIMARY KEY, farm_id TEXT, data TEXT );
CREATE TABLE IF NOT EXISTS sync_meta ( key TEXT PRIMARY KEY, value TEXT );

CREATE TABLE IF NOT EXISTS outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT,
  name_state TEXT,
  method TEXT,
  url TEXT,
  body TEXT,
  entity_id TEXT,
  status TEXT DEFAULT 'pending',
  retries INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT
);
`

let initialized = false

export async function initDb() {
  if (initialized) return
  const db = await getDb()
  await db.execAsync(SCHEMA)
  initialized = true
}
