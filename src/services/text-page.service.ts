import sharp from 'sharp'
import { IFileDocument } from '../models/file.model'
import { HttpError, objectBody, text } from '../utils/http.utils'
import { escapeHtml as html } from './media.service'

export const posterFonts: Record<string, string> = {
  handwritten: 'Poster Hand, cursive',
  classic: 'Georgia, serif',
  modern: 'Arial, sans-serif',
  typewriter: 'monospace',
}
export const posterBackgrounds: Record<string, [string, string]> = {
  black: ['#080808', '#ffffff'],
  cream: ['#f5eddb', '#30271c'],
  forest: ['#163b30', '#ffffff'],
  rose: ['#f4dce1', '#432431'],
  white: ['#ffffff', '#161616'],
}
export async function validateTextPage(value: unknown) {
  const body = objectBody(value, ['text', 'font', 'background', 'logo'])
  if (
    !Object.prototype.hasOwnProperty.call(posterFonts, body.font) ||
    !Object.prototype.hasOwnProperty.call(posterBackgrounds, body.background)
  )
    throw new HttpError(400, 'Choose a supported font and background')
  let logo = ''
  if (body.logo) {
    if (
      typeof body.logo !== 'string' ||
      body.logo.length > 1400000 ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.logo)
    )
      throw new HttpError(400, 'Logo must be a PNG, JPEG or WebP under 1 MB')
    try {
      const data = Buffer.from(body.logo.split(',')[1], 'base64')
      if (data.length > 1024 * 1024) throw new Error('size')
      const normalized = await sharp(data, { limitInputPixels: 16000000 })
        .rotate()
        .resize({ width: 600, height: 300, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
      logo = `data:image/png;base64,${normalized.toString('base64')}`
    } catch {
      throw new HttpError(400, 'Choose a valid logo image up to 1 MB and 16 megapixels')
    }
  }
  return {
    text: text(body.text, 'text', 1, 5000),
    font: body.font,
    background: body.background,
    logo,
  }
}
export function textPoster(file: IFileDocument) {
  const settings = file.textPage!
  const [background, color] = posterBackgrounds[settings.background] || posterBackgrounds.black
  return `<section class="text-poster" style="background:${background};color:${color};font-family:${posterFonts[settings.font] || posterFonts.handwritten}"><p>${html(settings.text)}</p>${settings.logo ? `<img class="poster-logo" src="${html(settings.logo)}" alt="Logo">` : ''}</section>`
}
export const textPosterCss = `@font-face{font-family:'Poster Hand';src:url('/fonts/Pangolin-Regular.ttf') format('truetype');font-display:swap}.text-poster{box-sizing:border-box;min-height:70dvh;width:100%;padding:clamp(28px,7vw,80px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:32px}.text-poster p{margin:0;max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(28px,6vw,64px);line-height:1.3}.text-poster .poster-logo{width:auto;height:auto;max-width:min(200px,80%);max-height:100px;object-fit:contain}`
export function textPage(file: IFileDocument) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(file.name || 'Text poster')}</title><style>body{margin:0;background:${(posterBackgrounds[file.textPage!.background] || posterBackgrounds.black)[0]}}${textPosterCss}.text-poster{min-height:100dvh}</style></head><body>${textPoster(file)}</body></html>`
}
