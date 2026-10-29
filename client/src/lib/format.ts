import type { AssetFile, Campaign, Category, FileType, Product, QrCode } from './types'

export const number = (n: number) => new Intl.NumberFormat('en').format(n)
export const date = (value: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
export const codeName = (code: QrCode) => code.name || `QR code ${code._id.slice(-6)}`
export const fileName = (file: AssetFile) => file.name || file.originalname || hostname(file.url)
export const productName = (product: Product) => product.name || `Product ${product._id.slice(-6)}`
export const productFile = (product?: Product | string | null) =>
  typeof product === 'object' && product && typeof product.file === 'object' ? product.file : null
export const codeType = (code: QrCode): FileType | 'campaign' =>
  code.campaign
    ? 'campaign'
    : productFile(code.product)?.type ||
      (/^https?:\/\//.test((typeof code.product === 'object' && code.product?.url) || '')
        ? 'web-url'
        : 'video')
export const typeLabel = (type: FileType | 'campaign') =>
  ({ image: 'Image', video: 'Video', 'web-url': 'URL', campaign: 'Campaign' })[type]
export const destination = (code: QrCode) => {
  if (code.campaign) return typeof code.campaign === 'object' ? code.campaign.name : 'Campaign'
  const file = productFile(code.product)
  return (
    code.destinationUrl ||
    (file
      ? file.type === 'web-url'
        ? file.url
        : file.name || file.originalname || file.path
      : '') ||
    (typeof code.product === 'object' && code.product?.url) ||
    ''
  )
}
export const isWebsite = (code: QrCode) => /^https?:\/\//.test(destination(code))
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || 'No attached file'
  }
}
export function downloadCode(code: QrCode) {
  if (!code.qrCode) throw new Error('This QR image is unavailable.')
  const anchor = document.createElement('a')
  anchor.href = code.qrCode
  anchor.download = `${codeName(code)
    .replace(/[^a-z\d_-]/gi, '-')
    .slice(0, 80)}.png`
  anchor.click()
}

export function fileSize(bytes?: number): string {
  if (bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function campaignProducts(
  campaign: Campaign,
  categories: Category[],
  products: Product[],
): Product[] {
  const ids = new Set<string>()
  for (const entry of campaign.entries) {
    if (entry.kind === 'product') ids.add(entry.target)
    else
      for (const id of categories.find((category) => category._id === entry.target)?.products || [])
        ids.add(id)
  }
  return products.filter((product) => ids.has(product._id) && productFile(product))
}
