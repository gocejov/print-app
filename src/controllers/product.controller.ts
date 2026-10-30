import { CategoryModel } from '../models/category.model'
import { CampaignModel } from '../models/campaign.model'
import { Request, Response } from 'express'
import { BaseController } from './base.controller'
import { IProductDocument, ProductModel } from '../models/product.model'
import { ProductService } from '../services/product.service'
import { FileModel } from '../models/file.model'
import { QrCodeModel } from '../models/qrcode.model'
import { HttpError } from '../utils/http.utils'

export interface IProductController extends ProductController {}
export class ProductController extends BaseController<IProductDocument> {
  constructor() {
    super(new ProductService())
  }

  async getAllWithOptions(_req: Request, res: Response): Promise<void> {
    res.json(
      await this.service.getAll({ ...res.locals.scope, populate: ['owner', 'createdBy', 'file'] }),
    )
  }

  async createProduct(req: Request, res: Response) {
    const file = await FileModel.findOne({ _id: req.body.fileId, createdBy: res.locals.user._id })
    if (!file) throw new HttpError(404, 'File not found')
    const product = await ProductModel.create({
      displayMode: req.body.displayMode,
      mediaIds: req.body.mediaIds,
      actionLabel: req.body.actionLabel,
      actionUrl: req.body.actionUrl,
      name: req.body.name || file.name || file.originalname || 'Untitled product',
      description: req.body.description || '',
      file: file._id,
      url: file.type === 'web-url' ? file.url : file.path,
      owner: res.locals.user._id,
      createdBy: res.locals.user._id,
    })
    res.status(200).json({ message: 'Product created successfully', product })
  }

  async update(req: Request, res: Response): Promise<void> {
    const changes: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    delete changes.fileId
    if (req.body.fileId) {
      const file = await FileModel.findOne({ _id: req.body.fileId, createdBy: res.locals.user._id })
      if (!file) throw new HttpError(404, 'File not found')
      changes.file = file._id
      changes.url = file.type === 'web-url' ? file.url : file.path
    }
    const product = await ProductModel.findOneAndUpdate(
      { _id: req.params.id, createdBy: res.locals.user._id },
      { $set: changes },
      { new: true, runValidators: true },
    )
    if (!product) throw new HttpError(404, 'Product not found')
    if (req.body.fileId && String(res.locals.record.file) !== req.body.fileId) {
      await QrCodeModel.updateMany(
        { product: product._id, createdBy: res.locals.user._id },
        {
          $set: { file: String(product.file), updated_at: new Date() },
          $unset: { destinationUrl: 1 },
        },
      )
    }
    res.json(product)
  }

  async remove(req: Request, res: Response): Promise<void> {
    if (
      (await CategoryModel.exists({ products: req.params.id })) ||
      (await CampaignModel.exists({
        entries: { $elemMatch: { kind: 'product', target: req.params.id } },
      }))
    )
      throw new HttpError(
        409,
        'Remove this product from its categories and campaigns before deleting it',
      )
    if (
      await QrCodeModel.exists({
        $or: [{ product: req.params.id }, { 'visitorTarget.productId': req.params.id }],
      })
    )
      throw new HttpError(
        409,
        'This product is assigned to a QR code. Reassign or delete that QR code first.',
      )
    const product = await ProductModel.findOneAndDelete({
      _id: req.params.id,
      createdBy: res.locals.user._id,
    })
    if (!product) throw new HttpError(404, 'Product not found')
    res.json(product)
  }
}
