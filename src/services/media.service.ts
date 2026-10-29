import path from 'path'
import { HttpError } from '../utils/http.utils'

// User media is separate from the application's branding assets.
export function mediaPath(filePath: unknown): string {
  if (typeof filePath !== 'string') throw new HttpError(404, 'Media not found')
  const resolved = path.resolve(filePath)
  const roots = ['uploads/videos', 'uploads/media-images'].map(
    (root) => path.resolve(root) + path.sep,
  )
  if (!roots.some((root) => resolved.startsWith(root))) throw new HttpError(404, 'Media not found')
  return resolved
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  )
}
