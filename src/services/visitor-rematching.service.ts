/** Analytics evidence only. This never restores a cookie, merges IDs or grants content access. */
const extraSignals = [
  ['CPU threads', ['data', 'browser', 'hardwareConcurrency']],
  ['Device memory', ['data', 'browser', 'deviceMemory']],
  ['Color depth', ['data', 'browser', 'colorDepth']],
  ['Browser version', ['data', 'fingerprintData', 'ua', 'browser', 'major']],
  ['OS version', ['data', 'fingerprintData', 'ua', 'os', 'version']],
] as const
const read = (scan: any, path: readonly string[]) => path.reduce((value, key) => value?.[key], scan)
export function rematchingEvidence(current: any[], related: any[], truncated = false) {
  const firstSeen = Math.min(...current.map((scan) => +new Date(scan.created_at)))
  const seed = [...current]
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    .find(
      (scan) =>
        scan.data?.visitor?.confirmed &&
        scan.data?.browserFingerprint?.version === 1 &&
        /^[a-f0-9]{64}$/.test(scan.data.browserFingerprint.hash) &&
        +new Date(scan.created_at) <= firstSeen + 86400000,
    )
  const base = {
    windowDays: 7,
    truncated,
    fingerprint: seed?.data.browserFingerprint.hash as string | undefined,
  }
  if (!seed) return { ...base, status: 'insufficient-evidence', candidates: [] }
  const id = seed.data.visitor.id
  const groups = new Map<string, any[]>()
  for (const scan of related) {
    const visitor = scan.data?.visitor
    const time = +new Date(scan.created_at)
    if (
      !visitor?.confirmed ||
      !visitor.id ||
      visitor.id === id ||
      scan.data?.browserFingerprint?.version !== 1 ||
      scan.data.browserFingerprint.hash !== base.fingerprint ||
      time < firstSeen - 7 * 86400000 ||
      time > firstSeen + 7 * 86400000
    )
      continue
    const group = groups.get(visitor.id) || []
    group.push(scan)
    groups.set(visitor.id, group)
  }
  const candidates = [...groups]
    .flatMap(([visitorId, scans]) => {
      const before = scans
        .filter((scan) => +new Date(scan.created_at) < firstSeen)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      if (!before.length) return []
      const evidence = before[0]
      const matchingSignals: string[] = [],
        conflictingSignals: string[] = []
      for (const [label, path] of extraSignals) {
        const a = read(seed, path),
          b = read(evidence, path)
        if (a === undefined || a === null || a === '' || b === undefined || b === null || b === '')
          continue
        ;(String(a) === String(b) ? matchingSignals : conflictingSignals).push(label)
      }
      return [
        {
          visitorId,
          matchingScans: before.length,
          lastSeen: new Date(evidence.created_at).toISOString(),
          matchingSignals,
          conflictingSignals,
          overlappingActivity: scans.some((scan) => +new Date(scan.created_at) >= firstSeen),
        },
      ]
    })
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
  return {
    ...base,
    status:
      truncated ||
      candidates.length > 1 ||
      candidates.some(
        (candidate) => candidate.overlappingActivity || candidate.conflictingSignals.length,
      )
        ? 'ambiguous'
        : candidates.length
          ? 'single-candidate'
          : 'none',
    candidates: candidates.slice(0, 10),
  }
}
