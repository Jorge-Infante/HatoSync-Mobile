import { getDb } from './index'

const sid = (v) => (v == null ? null : String(v))
const parse = (rows) => rows.map((r) => JSON.parse(r.data))

// --- Writes (download / cache) ---------------------------------------------

// Replace the whole animals snapshot for a farm (lean list). Resets full_synced.
export async function saveAnimals(farmId, animals) {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM animals WHERE farm_id = ?', [sid(farmId)])
    for (const a of animals) {
      await db.runAsync(
        'INSERT OR REPLACE INTO animals (id, farm_id, name, sex, data, full_synced) VALUES (?,?,?,?,?,0)',
        [sid(a.id), sid(farmId), a.name ?? '', a.sex ?? '', JSON.stringify(a)]
      )
    }
  })
}

// Persist the heavy parts of an animal's /full/ dossier (events + photos) and
// mark it as fully synced. The lean fields already live in the animals row.
export async function saveAnimalFull(farmId, full) {
  const db = await getDb()
  const animalId = sid(full.id)
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM reproductive_events WHERE animal_id = ?', [animalId])
    for (const ev of full.reproductive_events || []) {
      await db.runAsync(
        'INSERT OR REPLACE INTO reproductive_events (id, animal_id, farm_id, date, data) VALUES (?,?,?,?,?)',
        [sid(ev.id), animalId, sid(farmId), ev.date ?? '', JSON.stringify(ev)]
      )
    }
    await db.runAsync('DELETE FROM animal_photos WHERE animal_id = ?', [animalId])
    for (const ph of full.photos || []) {
      await db.runAsync(
        'INSERT OR REPLACE INTO animal_photos (id, animal_id, image, caption, data) VALUES (?,?,?,?,?)',
        [sid(ph.id), animalId, ph.image ?? '', ph.caption ?? '', JSON.stringify(ph)]
      )
    }
    await db.runAsync('DELETE FROM weight_records WHERE animal_id = ?', [animalId])
    for (const w of full.weight_records || []) {
      await db.runAsync(
        'INSERT OR REPLACE INTO weight_records (id, animal_id, farm_id, date, data) VALUES (?,?,?,?,?)',
        [sid(w.id), animalId, sid(farmId), w.date ?? '', JSON.stringify(w)]
      )
    }
    await db.runAsync('UPDATE animals SET full_synced = 1 WHERE id = ?', [animalId])
  })
}

async function replaceScoped(table, farmId, list) {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM ${table} WHERE farm_id = ?`, [sid(farmId)])
    for (const item of list) {
      await db.runAsync(`INSERT OR REPLACE INTO ${table} (id, farm_id, data) VALUES (?,?,?)`, [
        sid(item.id),
        sid(farmId),
        JSON.stringify(item),
      ])
    }
  })
}

export const saveBreeds = (farmId, list) => replaceScoped('breeds', farmId, list)
export const saveIdentificationTypes = (farmId, list) => replaceScoped('identification_types', farmId, list)
export const saveMembers = (farmId, list) => replaceScoped('farm_members', farmId, list)

export async function saveFarms(list) {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM farms')
    for (const f of list) {
      await db.runAsync('INSERT OR REPLACE INTO farms (id, data) VALUES (?,?)', [sid(f.id), JSON.stringify(f)])
    }
  })
}

// The device DB is shared by whoever logs in on this phone. When a DIFFERENT
// account signs in, wipe everything cached (including the previous account's
// outbox and sync_meta) so their farms/animals never hydrate into the new session.
export async function clearLocalData() {
  const db = await getDb()
  const tables = [
    'animals',
    'reproductive_events',
    'animal_photos',
    'weight_records',
    'breeds',
    'identification_types',
    'farms',
    'farm_members',
    'outbox',
    'sync_meta',
  ]
  await db.withTransactionAsync(async () => {
    for (const t of tables) await db.runAsync(`DELETE FROM ${t}`)
  })
}

// --- Reads (hydration / offline queries) -----------------------------------

export async function getAnimals(farmId) {
  const db = await getDb()
  const rows = await db.getAllAsync('SELECT data FROM animals WHERE farm_id = ? AND _deleted = 0 ORDER BY name COLLATE NOCASE', [sid(farmId)])
  return parse(rows)
}

export const getBreeds = async (farmId) => parse(await (await getDb()).getAllAsync('SELECT data FROM breeds WHERE farm_id = ?', [sid(farmId)]))
export const getIdentificationTypes = async (farmId) => parse(await (await getDb()).getAllAsync('SELECT data FROM identification_types WHERE farm_id = ?', [sid(farmId)]))
export const getFarms = async () => parse(await (await getDb()).getAllAsync('SELECT data FROM farms'))
export const getMembers = async (farmId) => parse(await (await getDb()).getAllAsync('SELECT data FROM farm_members WHERE farm_id = ?', [sid(farmId)]))

export async function getEventsLocal(animalId) {
  const db = await getDb()
  const rows = await db.getAllAsync('SELECT data FROM reproductive_events WHERE animal_id = ? ORDER BY date DESC', [sid(animalId)])
  return parse(rows)
}

export async function getWeightsLocal(animalId) {
  const db = await getDb()
  const rows = await db.getAllAsync('SELECT data FROM weight_records WHERE animal_id = ? ORDER BY date DESC', [sid(animalId)])
  return parse(rows)
}

async function getPhotosLocal(animalId) {
  const db = await getDb()
  return parse(await db.getAllAsync('SELECT data FROM animal_photos WHERE animal_id = ?', [sid(animalId)]))
}

async function getAnimalRow(animalId) {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT data FROM animals WHERE id = ?', [sid(animalId)])
  return row ? JSON.parse(row.data) : null
}

// Derive offspring from the cached herd (children whose mother/father == id)
async function getOffspringLocal(animalId, farmId) {
  const id = sid(animalId)
  const herd = await getAnimals(farmId)
  return herd
    .filter((a) => sid(a.mother) === id || sid(a.father) === id)
    .map((a) => ({ id: a.id, name: a.name, sex: a.sex, sex_display: a.sex_display, birth_date: a.birth_date }))
}

// Assemble the full dossier from local tables (offline equivalent of /full/)
export async function getAnimalFullLocal(animalId, farmId) {
  const animal = await getAnimalRow(animalId)
  if (!animal) return null
  const fid = farmId ?? animal.farm
  const [reproductive_events, photos, offspring, weight_records] = await Promise.all([
    getEventsLocal(animalId),
    getPhotosLocal(animalId),
    getOffspringLocal(animalId, fid),
    getWeightsLocal(animalId),
  ])
  return { ...animal, reproductive_events, photos, offspring, weight_records }
}

// Build the ancestor tree locally from the cached herd's mother/father links
export async function buildGenealogyLocal(animalId, farmId, depth = 3) {
  const herd = await getAnimals(farmId)
  const map = new Map(herd.map((a) => [sid(a.id), a]))

  const toNode = (a, gen) => {
    const node = {
      id: a.id,
      name: a.name,
      sex: a.sex,
      sex_display: a.sex_display,
      birth_date: a.birth_date,
      photo: a.primary_photo || null,
      is_active: a.is_active !== false,
      mother: null,
      father: null,
    }
    const hasParents = a.mother != null || a.father != null
    if (gen >= depth) {
      if (hasParents) node.has_more_ancestors = true
      return node
    }
    const mother = a.mother != null ? map.get(sid(a.mother)) : null
    const father = a.father != null ? map.get(sid(a.father)) : null
    node.mother = mother ? toNode(mother, gen + 1) : null
    node.father = father ? toNode(father, gen + 1) : null
    return node
  }

  const root = map.get(sid(animalId))
  return root ? toNode(root, 0) : null
}

// Which animals still need their /full/ dossier (for resumable download)
export async function getPendingFullIds(farmId) {
  const db = await getDb()
  const rows = await db.getAllAsync('SELECT id FROM animals WHERE farm_id = ? AND full_synced = 0', [sid(farmId)])
  return rows.map((r) => r.id)
}

// --- Single-item cache writes (offline writes / sync reconciliation) --------

const SCOPED_TABLE = {
  'configuration/breeds': 'breeds',
  'configuration/identificationTypes': 'identification_types',
  'farms/members': 'farm_members',
}

// Upsert one item into its local table (used by optimistic offline writes and
// when reconciling the server's canonical version after a successful sync).
export async function cacheUpsertItem(module, nameState, farmId, obj) {
  const db = await getDb()
  const key = `${module}/${nameState}`
  // Externals (genética externa) share the animals table; their JSON carries
  // is_external and hydration splits them back out of the herd.
  if (key === 'livestock/animals' || key === 'livestock/externals') {
    await db.runAsync(
      'INSERT OR REPLACE INTO animals (id, farm_id, name, sex, data, full_synced) VALUES (?,?,?,?,?,COALESCE((SELECT full_synced FROM animals WHERE id = ?), 0))',
      [sid(obj.id), sid(farmId), obj.name ?? '', obj.sex ?? '', JSON.stringify(obj), sid(obj.id)]
    )
    return
  }
  if (key === 'farms/farms') {
    await db.runAsync('INSERT OR REPLACE INTO farms (id, data) VALUES (?,?)', [sid(obj.id), JSON.stringify(obj)])
    return
  }
  const table = SCOPED_TABLE[key]
  if (table) {
    await db.runAsync(`INSERT OR REPLACE INTO ${table} (id, farm_id, data) VALUES (?,?,?)`, [
      sid(obj.id),
      sid(farmId),
      JSON.stringify(obj),
    ])
  }
}

export async function cacheDeleteItem(module, nameState, id) {
  const db = await getDb()
  const key = `${module}/${nameState}`
  const map = { ...SCOPED_TABLE, 'livestock/animals': 'animals', 'livestock/externals': 'animals', 'farms/farms': 'farms' }
  const table = map[key]
  if (table) await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [sid(id)])
}

// Upsert a reproductive event into the local cache (offline event creation)
export async function cacheUpsertEvent(farmId, animalId, event) {
  const db = await getDb()
  await db.runAsync(
    'INSERT OR REPLACE INTO reproductive_events (id, animal_id, farm_id, date, data) VALUES (?,?,?,?,?)',
    [sid(event.id), sid(animalId), sid(farmId), event.date ?? '', JSON.stringify(event)]
  )
}

// Upsert a weight record into the local cache (offline weight creation)
export async function cacheUpsertWeight(farmId, animalId, record) {
  const db = await getDb()
  await db.runAsync(
    'INSERT OR REPLACE INTO weight_records (id, animal_id, farm_id, date, data) VALUES (?,?,?,?,?)',
    [sid(record.id), sid(animalId), sid(farmId), record.date ?? '', JSON.stringify(record)]
  )
}

export async function cacheDeleteWeight(weightId) {
  const db = await getDb()
  await db.runAsync('DELETE FROM weight_records WHERE id = ?', [sid(weightId)])
}

export async function countAnimals(farmId) {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT COUNT(*) AS n FROM animals WHERE farm_id = ?', [sid(farmId)])
  return row ? row.n : 0
}
