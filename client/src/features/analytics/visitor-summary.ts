import type { Scan } from '../../lib/types'
export function visitorSummary(scans: Scan[]) {
  const recognized = scans.filter((scan) => scan.data?.visitor?.confirmed && scan.data.visitor.id)
  const unique = new Set(recognized.map((scan) => scan.data!.visitor!.id)).size
  return {
    unique,
    repeats: recognized.length - unique,
    unrecognized: scans.length - recognized.length,
  }
}
