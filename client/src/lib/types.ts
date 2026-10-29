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
export interface Product {
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

export interface Scan {
  product?: string
  campaign?: string
  _id: string
  qrCode: string
  created_at: string
  data?: {
    fingerprint?: string
    fingerprintData?: {
      ip?: string
      ipHash?: string
      language?: string
      screenWidth?: number | string
      screenHeight?: number | string
      timezone?: string
      geo?: { country?: string; region?: string; city?: string; ll?: number[]; timezone?: string; [key: string]: unknown } | null
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
