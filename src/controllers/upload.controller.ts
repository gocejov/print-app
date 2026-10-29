import { Request, Response } from 'express'
import fs from 'fs/promises'
import sharp from 'sharp'
import { FileModel } from '../models/file.model'
import { HttpError, text } from '../utils/http.utils'

export interface IUploadController extends UploadController {}

export class UploadController {
  videoUpload(req: Request, res: Response) {
    return this.save(req, res, 'video')
  }
  imageUpload(req: Request, res: Response) {
    return this.save(req, res, 'image')
  }

  private async save(req: Request, res: Response, type: 'video' | 'image') {
    if (!req.file) throw new HttpError(400, `An uploaded ${type} file is required`)
    try {
      if (type === 'image') {
        const metadata = await sharp(req.file.path, { limitInputPixels: 40_000_000 })
          .metadata()
          .catch(() => null)
        const expected: Record<string, string> = {
          'image/jpeg': 'jpeg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
        }
        if (!metadata || metadata.format !== expected[req.file.mimetype])
          throw new HttpError(400, 'Image contents do not match a supported image format')
      }
      const name =
        req.body?.name === undefined
          ? req.file.originalname.slice(0, 120)
          : text(req.body.name, 'name', 1, 120)
      const file = await FileModel.create({
        name,
        type,
        url: req.file.filename,
        file: JSON.stringify(req.file),
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        createdBy: res.locals.user._id,
        baseUrl: `${req.protocol}://${req.get('host')}`,
      })
      res
        .status(200)
        .json({ message: `${type === 'image' ? 'Image' : 'Video'} uploaded successfully`, file })
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => {})
      throw error
    }
  }
}
