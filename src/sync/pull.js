import apiClient from '@/api/client'
import { setMeta, getMeta } from '@/db/meta'
import { mediaUrl } from '@/utils/format'
import { cachePhotoFile } from '@/sync/mediaCache'
import {
  saveAnimals,
  saveAnimalFull,
  saveBreeds,
  saveIdentificationTypes,
  saveLots,
  saveSchedules,
  saveInactivationReasons,
  saveTags,
  saveFarms,
  saveMembers,
  setAnimalPrimaryPhotoLocal,
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
  const [farms, members, breeds, idTypes, lots, schedules, inactivationReasons, tags] = await Promise.all([
    apiClient.get('/farms/').then((r) => r.data),
    apiClient.get('/farms/members/').then((r) => r.data).catch(() => []),
    apiClient.get('/configuration/breeds/').then((r) => r.data).catch(() => []),
    apiClient.get('/configuration/identification-types/').then((r) => r.data).catch(() => []),
    apiClient.get('/configuration/lots/').then((r) => r.data).catch(() => []),
    apiClient.get('/health/schedules/').then((r) => r.data).catch(() => []),
    apiClient.get('/configuration/inactivation-reasons/').then((r) => r.data).catch(() => []),
    // Chapetas QR de la finca — habilita el resolve/asociación offline en campo.
    apiClient.get('/tags/').then((r) => r.data).catch(() => []),
  ])
  await saveFarms(farms)
  await saveMembers(farmId, members)
  await saveBreeds(farmId, breeds)
  await saveIdentificationTypes(farmId, idTypes)
  await saveLots(farmId, lots)
  await saveSchedules(farmId, schedules)
  await saveInactivationReasons(farmId, inactivationReasons)
  await saveTags(farmId, tags)

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
      // Descargar los ARCHIVOS de foto a almacenamiento local y apuntar el cache
      // a la uri local (file://) → se ven OFFLINE. Sin esto solo se guardaba la
      // URL y las fotos no vistas online salían en blanco sin señal.
      for (const ph of full.photos || []) {
        try {
          const local = await cachePhotoFile(ph.id, mediaUrl(ph.image))
          if (local) ph.image = local
        } catch {
          // una foto que no baja no debe abortar la ficha
        }
      }
      // La miniatura del listado usa primary_photo: apuntarla a la 1ª foto local.
      const localPrimary = full.photos && full.photos[0] ? full.photos[0].image : null
      if (localPrimary && localPrimary.startsWith('file:')) full.primary_photo = localPrimary
      await saveAnimalFull(farmId, full)
      if (localPrimary && localPrimary.startsWith('file:')) {
        await setAnimalPrimaryPhotoLocal(id, localPrimary).catch(() => {})
      }
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
      lots: lots.length,
      farms: farms.length,
      tags: tags.length,
    },
  }
  await setMeta(LAST_DOWNLOAD_KEY, info)
  onProgress({ phase: 'done', done: total, total })
  return info
}
