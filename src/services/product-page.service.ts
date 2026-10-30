import { IProductDocument } from '../models/product.model'
import { IFileDocument } from '../models/file.model'
import { escapeHtml as html } from './media.service'
import { TypeAlias } from '../constants/alias.constant'

/** Render only owned, validated media supplied by the playback controller. */
export function productPage(
  product: IProductDocument,
  primary: IFileDocument,
  attachments: IFileDocument[],
  qrId: string,
  selection?: string,
) {
  const files = [
    primary,
    ...(product.mediaIds || [])
      .map((id) => attachments.find((file) => String(file._id) === String(id)))
      .filter((file): file is IFileDocument => Boolean(file)),
  ]
  const seen = new Set<string>()
  const gallery = files
    .filter((file) => {
      const id = String(file._id)
      if (file.type === 'web-url' || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((file) => {
      const query = new URLSearchParams()
      if (selection) query.set('selection', selection)
      if (String(file._id) !== String(primary._id)) query.set('media', String(file._id))
      const url = `/l/q/${TypeAlias[String(file.type)]}/${qrId}${query.size ? `?${query}` : ''}`
      const label = html(String(file.name || file.originalname || product.name || 'Product media'))
      return file.type === 'image'
        ? `<figure><img src="${html(url)}" alt="${label}" loading="lazy"></figure>`
        : `<figure><video controls playsinline preload="metadata" aria-label="${label}"><source src="${html(url)}" type="${html(String(file.mimetype || 'video/mp4'))}"></video></figure>`
    })
    .join('')
  const action =
    product.actionUrl && product.actionLabel
      ? `<a class="action" href="${html(product.actionUrl)}" rel="noopener noreferrer">${html(product.actionLabel)} <span aria-hidden="true">↗</span></a>`
      : ''
  const link =
    primary.type === 'web-url'
      ? `<a class="source" href="${html(String(primary.url))}" rel="noopener noreferrer">View linked content ↗</a>`
      : ''
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${html(product.name || 'Product')} — QR2Share</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f5ef;color:#172d24;font-family:system-ui,sans-serif;line-height:1.6}main{max-width:780px;margin:auto;padding:48px 20px 32px}.brand{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#52695e}header{padding:24px 0}h1{font-size:clamp(30px,6vw,48px);line-height:1.15;margin:12px 0;overflow-wrap:anywhere}.description{white-space:pre-wrap;overflow-wrap:anywhere;color:#526358;font-size:17px}.action{display:flex;justify-content:space-between;gap:24px;padding:16px 22px;margin:24px 0;background:#173e2c;color:white;border-radius:12px;text-decoration:none;font-weight:650}.action:focus-visible,.source:focus-visible{outline:3px solid #c49627;outline-offset:4px}figure{margin:0 0 20px;background:#e2e8de;border-radius:16px;overflow:hidden}img,video{display:block;width:100%;max-height:80vh;object-fit:contain}.source{color:#173e2c;display:inline-block;margin:0 0 24px}footer{font-size:12px;color:#64756a;padding-top:20px}</style></head><body><main><div class="brand">Shared with QR2Share</div><header><h1>${html(product.name || 'Product')}</h1>${product.description ? `<p class="description">${html(product.description)}</p>` : ''}${action}${link}</header><section aria-label="Product media">${gallery}</section><footer>Powered by QR2Share</footer></main></body></html>`
}
