import { StatisticModel } from '../models/statistic.model'
import { HttpError } from '../utils/http.utils'

/** Derived evidence only. Does not assert personal identity, interests or rule eligibility. */
export function summarizeVisitorProfile(
  scans: any[],
  basis: 'visitor' | 'fingerprint',
  id: string,
  now = new Date(),
) {
  const sorted = [...scans].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
  const latest = sorted[sorted.length - 1]
  const counters = (field: string) => {
    const counts = new Map<string, { id: string; scans: number; lastSeen: string }>()
    for (const scan of sorted) {
      const value = scan[field]
      if (!value) continue
      const key = String(value)
      const previous = counts.get(key)
      counts.set(key, {
        id: key,
        scans: (previous?.scans || 0) + 1,
        lastSeen: new Date(scan.created_at).toISOString(),
      })
    }
    return [...counts.values()]
      .sort((a, b) => b.scans - a.scans || a.id.localeCompare(b.id))
      .slice(0, 50)
  }
  const fingerprints = [
    ...new Set(sorted.map((scan) => scan.data?.browserFingerprint?.hash).filter(Boolean)),
  ] as string[]
  const visitorIds = [
    ...new Set(
      sorted
        .filter((scan) => scan.data?.visitor?.confirmed)
        .map((scan) => scan.data?.visitor?.id)
        .filter(Boolean),
    ),
  ] as string[]
  const day = now.toISOString().slice(0, 10)
  const days = new Set(sorted.map((scan) => new Date(scan.created_at).toISOString().slice(0, 10)))
  const sources = new Map<string, number>()
  for (const scan of sorted) {
    const source = scan.data?.request?.query?.find(
      ([key]: [string, string]) => key === 'utm_source',
    )?.[1]
    if (source) sources.set(source, (sources.get(source) || 0) + 1)
  }
  return {
    id,
    basis,
    confidence: basis === 'visitor' ? 'recognized-browser' : 'estimated-similarity',
    firstSeen: sorted[0]?.created_at || null,
    lastSeen: latest?.created_at || null,
    counters: {
      totalScans: sorted.length,
      repeatScans: Math.max(0, sorted.length - 1),
      activeDaysUTC: days.size,
      scansTodayUTC: sorted.filter(
        (scan) => new Date(scan.created_at).toISOString().slice(0, 10) === day,
      ).length,
      scansLast7Days: sorted.filter(
        (scan) =>
          +new Date(scan.created_at) >= +now - 7 * 86400000 && +new Date(scan.created_at) <= +now,
      ).length,
    },
    activity: {
      qrCodes: counters('qrCode'),
      products: counters('product'),
      campaigns: counters('campaign'),
      sources: [...sources]
        .map(([source, scans]) => ({ source, scans }))
        .sort((a, b) => b.scans - a.scans)
        .slice(0, 50),
    },
    identityEvidence: {
      matchedVisitorCount: visitorIds.length,
      visitorIds: visitorIds.slice(0, 50),
      fingerprintCount: fingerprints.length,
      fingerprints: fingerprints.slice(0, 50),
    },
    latestSignals: {
      browser: latest?.data?.browser || null,
      server: latest?.data?.fingerprintData || null,
      request: latest?.data?.request || null,
    },
    limitations:
      'Browser observations and scan frequencies, not verified personal identity or interests. Fingerprint groups may include different people. Counters do not authorize access or issue rewards.',
    generatedAt: now.toISOString(),
  }
}

export async function getVisitorProfile(
  scope: Record<string, unknown>,
  id: string,
  basis: 'visitor' | 'fingerprint',
) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(400, 'Invalid visitor or fingerprint ID')
  const match =
    basis === 'visitor'
      ? { 'data.visitor.id': id, 'data.visitor.confirmed': true }
      : { 'data.browserFingerprint.hash': id }
  const scans = await StatisticModel.find({ $and: [scope, match] })
    .select('qrCode product campaign created_at data')
    .lean()
  if (!scans.length) throw new HttpError(404, 'Visitor profile not found')
  return summarizeVisitorProfile(scans, basis, id)
}
