import { Request, Response, NextFunction } from 'express'
import fs from 'fs/promises'
import { BaseController } from './base.controller'
import { IFileDocument, FileModel } from '../models/file.model'
import { FileService } from '../services/file.service'
import { ProductModel } from '../models/product.model'
import { QrCodeModel } from '../models/qrcode.model'
import { HttpError } from '../utils/http.utils'
import { mediaPath } from '../services/media.service'

export interface IFileController extends FileController {}
export class FileController extends BaseController<IFileDocument> {
  constructor() {
    super(new FileService())
  }

  async content(_req: Request, res: Response, next: NextFunction) {
    const file = res.locals.record as IFileDocument
    if (!['image', 'video'].includes(String(file.type)))
      throw new HttpError(400, 'URL files do not contain uploaded media')
    res.set('X-Content-Type-Options', 'nosniff').type(String(file.mimetype))
    res.sendFile(mediaPath(file.path), (error) => {
      if (error)
        next(
          (error as NodeJS.ErrnoException).code === 'ENOENT'
            ? new HttpError(404, 'Media not found')
            : error,
        )
    })
  }

  async update(req: Request, res: Response): Promise<void> {
    const file = await FileModel.findOneAndUpdate(
      { _id: req.params.id, createdBy: res.locals.user._id },
      { $set: { ...req.body, updated_at: new Date() } },
      { new: true, runValidators: true },
    )
    if (!file) throw new HttpError(404, 'File not found')
    if (req.body.url !== undefined) {
      const products = await ProductModel.find({
        file: file._id,
        createdBy: res.locals.user._id,
      }).select('_id')
      await ProductModel.updateMany(
        { file: file._id, createdBy: res.locals.user._id },
        { $set: { url: file.url, updated_at: new Date() } },
      )
      await QrCodeModel.updateMany(
        {
          product: { $in: products.map((product) => product._id) },
          createdBy: res.locals.user._id,
        },
        { $unset: { destinationUrl: 1 }, $set: { updated_at: new Date() } },
      )
    }
    res.json(file)
  }

  async remove(req: Request, res: Response): Promise<void> {
    if (await ProductModel.exists({ file: req.params.id }))
      throw new HttpError(
        409,
        'This file is attached to a product. Replace or delete that product first.',
      )
    const file = await FileModel.findOneAndDelete({
      _id: req.params.id,
      createdBy: res.locals.user._id,
    })
    if (!file) throw new HttpError(404, 'File not found')
    if (file.path)
      await fs.unlink(mediaPath(file.path)).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Could not remove uploaded media:', error)
      })
    res.json(file)
  }
}
