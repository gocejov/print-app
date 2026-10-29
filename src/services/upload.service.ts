import multer from 'multer'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { HttpError } from '../utils/http.utils'

export const imageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
export const videoTypes: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/avi': 'avi',
  'video/x-msvideo': 'avi',
  'video/mkv': 'mkv',
  'video/x-matroska': 'mkv',
  'video/mov': 'mov',
  'video/quicktime': 'mov',
}

function uploader(directory: string, types: Record<string, string>, maxSize: number) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        fs.mkdirSync(directory, { recursive: true })
        cb(null, directory)
      },
      filename: (_req, file, cb) => cb(null, `${randomUUID()}.${types[file.mimetype]}`),
    }),
    fileFilter: (_req, file, cb) => {
      if (!types[file.mimetype]) {
        cb(new HttpError(415, 'Unsupported file type'))
        return
      }
      cb(null, true)
    },
    limits: { fileSize: maxSize, files: 1 },
  })
}

export const upload = uploader('uploads/videos', videoTypes, 50 * 1024 * 1024)
export const uploadImage = uploader('uploads/media-images', imageTypes, 10 * 1024 * 1024)
