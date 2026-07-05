import apiClient from '@/api/client'
import { setMeta, getMeta } from '@/db/meta'
import {
  saveAnimals,
  saveAnimalFull,
  saveBreeds,
  saveIdentificationTypes,
  saveFarms,
  saveMembers,
  getPendingFullIds,
} from '@/db/repositories'

const FULL_CONCURRENCY = 6

// Run `worker` over items with a bounded number of concurrent tasks.
async function mapWithConcurrency(items, limit, worker) {
  let index = 0
  async function runner() {
    while (index < items.length) {
      const current = items[index++]
      await worker(current)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner))
}

const LAST_DOWNLOAD_KEY = 'lastDownload'
export const getLastDownload = () => getMeta(LAST_DOWNLOAD_KEY)

/**
 * Downloads everything needed to work the active farm offline (Fase 1).
 * 3 tiers: metadata → herd list → per-animal full dossiers (resumable).
 *
 * onProgress({ phase, done, total }) is called as it advances:
 *   phase: 'meta' | 'list' | 'full' | 'done'
 */
export async function downloadFarmData({ farmId, onProgress = () => {} }) {
  // Tier 1 — metadata (fast, parallel)
  onProgress({ phase: 'meta', done: 0, total: 0 })
  const [farms, members, breeds, idTypes] = await Promise.all([
    apiClient.get('/farms/').then((r) => r.data),
    apiClient.get('/farms/members/').then((r) => r.data).catch(() => []),
    apiClient.get('/configuration/breeds/').then((r) => r.data).catch(() => []),
    apiClient.get('/configuration/identification-types/').then((r) => r.data).catch(() => []),
  ])
  await saveFarms(farms)
  await saveMembers(farmId, members)
  await saveBreeds(farmId, breeds)
  await saveIdentificationTypes(farmId, idTypes)

  // Tier 2 — herd list + external genetics (the list becomes usable offline
  // right after this). Externals share the animals table (their JSON carries
  // is_external); hydration splits them so they never show in the herd.
  const [herd, externals] = await Promise.all([
    apiClient.get('/livestock/animals/').then((r) => r.data),
    apiClient.get('/livestock/animals/', { params: { external: true } }).then((r) => r.data).catch(() => []),
  ])
  const animals = [...herd, ...externals]
  await saveAnimals(farmId, animals)
  onProgress({ phase: 'list', done: 0, total: animals.length })

  // Tier 3 — per-animal full dossier (events + photos), resumable + bounded
  const pendingIds = await getPendingFullIds(farmId)
  const total = animals.length
  let done = total - pendingIds.length
  onProgress({ phase: 'full', done, total })

  await mapWithConcurrency(pendingIds, FULL_CONCURRENCY, async (id) => {
    try {
      const full = (await apiClient.get(`/livestock/animals/${id}/full/`)).data
      await saveAnimalFull(farmId, full)
    } catch {
      // leave it pending; a later download retries this animal
    }
    done += 1
    onProgress({ phase: 'full', done, total })
  })

  const info = {
    at: new Date().toISOString(),
    farmId: String(farmId),
    counts: {
      animals: herd.length,
      externals: externals.length,
      breeds: breeds.length,
      identificationTypes: idTypes.length,
      farms: farms.length,
    },
  }
  await setMeta(LAST_DOWNLOAD_KEY, info)
  onProgress({ phase: 'done', done: total, total })
  return info
}
