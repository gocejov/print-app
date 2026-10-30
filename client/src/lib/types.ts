export interface User {
  _id: string
  name: string
  lastName: string
  email: string
  alias: string
  useAlias: boolean
}

export type FileType = 'image' | 'video' | 'web-url'
export interface AssetFile {
  _id: string
  name?: string
  type: FileType
  url: string
  originalname?: string
  mimetype?: string
  path?: string
  size?: number
  created_at: string
}
export interface ProductPageOptions {
  displayMode?: 'direct' | 'page'
  mediaIds?: string[]
  actionLabel?: string
  actionUrl?: string
}
export interface Product extends ProductPageOptions {
  _id: string
  name?: string
  description?: string
  url: string
  file: AssetFile | string | null
  created_at: string
}

export interface Category {
  _id: string
  name: string
  description: string
  products: string[]
  created_at: string
}
export interface CampaignEntry {
  kind: 'product' | 'category'
  target: string
}
export interface Campaign {
  _id: string
  name: string
  description: string
  rule: 'random'
  status: 'active' | 'paused'
  entries: CampaignEntry[]
  productWeights?: { product: string; weight: number }[]
  created_at: string
}

export interface QrCode {
  _id: string
  name?: string
  status?: 'active' | 'paused'
  destinationUrl?: string
  url?: string
  qrCode?: string
  product?: Product | string | null
  campaign?: Campaign | string | null
  created_at: string
  updated_at: string
}

export interface BrowserMetrics {
  source?: 'browser-self-reported'
  receivedAt?: string
  language?: string
  languages?: string[]
  timezone?: string
  localHour?: number
  screenWidth?: number
  screenHeight?: number
  viewportWidth?: number
  viewportHeight?: number
  effectiveType?: string
  saveData?: boolean
  locationStatus?: string
  location?: {
    latitude: number
    longitude: number
    accuracyMeters: number
    permissionGranted: boolean
  }
  [key: string]: unknown
}
export interface Scan {
  product?: string
  campaign?: string
  _id: string
  qrCode: string
  created_at: string
  data?: {
    visitor?: {
      id?: string
      method: string
      confirmed?: boolean
      audience?: 'new' | 'returning'
      reason?: string
    }
    browserFingerprint?: { hash: string; version: number; confidence: string }
    browser?: BrowserMetrics
    fingerprint?: string
    fingerprintData?: {
      ip?: string
      ipHash?: string
      language?: string
      screenWidth?: number | string
      screenHeight?: number | string
      timezone?: string
      geo?: {
        country?: string
        region?: string
        city?: string
        ll?: number[]
        timezone?: string
        [key: string]: unknown
      } | null
      ua?: {
        ua?: string
        browser?: { name?: string; version?: string }
        os?: { name?: string; version?: string }
        device?: { type?: string; vendor?: string; model?: string }
        engine?: { name?: string; version?: string }
        cpu?: { architecture?: string }
      }
      [key: string]: unknown
    }
    request?: { method?: string; path?: string; query?: [string, string][]; referrer?: string }
    [key: string]: unknown
  }
}

export interface VisitorProfileData {
  id: string
  basis: 'visitor' | 'fingerprint'
  confidence: string
  firstSeen: string
  lastSeen: string
  counters: {
    totalScans: number
    repeatScans: number
    activeDaysUTC: number
    scansTodayUTC: number
    scansLast7Days: number
  }
  activity: {
    qrCodes: { id: string; scans: number; lastSeen: string }[]
    products: { id: string; scans: number; lastSeen: string }[]
    campaigns: { id: string; scans: number; lastSeen: string }[]
    sources: { source: string; scans: number }[]
  }
  identityEvidence: {
    matchedVisitorCount: number
    visitorIds: string[]
    fingerprintCount: number
    fingerprints: string[]
  }
  latestSignals: Record<string, unknown>
  limitations: string
  generatedAt: string
}
