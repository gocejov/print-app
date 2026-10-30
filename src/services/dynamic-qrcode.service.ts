import { validateVisitorTarget, validateVisitorFallback } from './visitor-target.service'
import type { IVisitorTarget } from '../models/qrcode.model'
import { CampaignService } from './campaign.service'
import mongoose from 'mongoose'
import { FileModel } from '../models/file.model'
import { ProductModel } from '../models/product.model'
import { QrCodeModel } from '../models/qrcode.model'
import { UserModel } from '../models/user.model'
import { QrCodeService } from './qrcode.service'
import { HttpError, text } from '../utils/http.utils'

export function destinationUrl(value: unknown): string {
  const raw = text(value, 'destination URL', 1, 2048)
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error()
    return url.href
  } catch {
    throw new HttpError(400, 'Enter a valid http or https URL without credentials')
  }
}

export class DynamicQrCodeService {
  private renderer = new QrCodeService()

  async create(
    userId: string,
    name: string,
    target: string,
    origin: string,
    visitorTarget?: unknown,
  ) {
    const personalized = await validateVisitorTarget(userId, visitorTarget)
    const user = await UserModel.findById(userId)
    if (!user) throw new HttpError(401, 'Login required')
    const codeId = new mongoose.Types.ObjectId()
    const alias = user.useAlias ? user.alias : 'q'
    const publicBase = (process.env.PUBLIC_URL || origin).replace(/\/$/, '')
    const url = `${publicBase}/${alias}/${codeId}`
    // Render before any inserts, so rendering failures leave no partial records.
    const image = await this.renderer.generateQrCodeBase64Url(url)
    const fileId = new mongoose.Types.ObjectId()
    const productId = new mongoose.Types.ObjectId()
    try {
      await FileModel.create({ _id: fileId, type: 'web-url', url: target, createdBy: userId })
      await ProductModel.create({
        _id: productId,
        file: fileId,
        url: target,
        owner: userId,
        createdBy: userId,
      })
      return await QrCodeModel.create({
        _id: codeId,
        visitorTarget: personalized,
        name,
        destinationUrl: target,
        status: 'active',
        file: String(fileId),
        product: productId,
        owner: userId,
        createdBy: userId,
        url,
        qrCode: image,
      })
    } catch (error) {
      // Standalone MongoDB installations cannot use multi-document transactions.
      // Only remove IDs allocated by this operation; preserve the original failure.
      await Promise.allSettled([
        QrCodeModel.deleteOne({ _id: codeId, createdBy: userId }),
        ProductModel.deleteOne({ _id: productId, createdBy: userId }),
        FileModel.deleteOne({ _id: fileId, createdBy: userId }),
      ])
      throw error
    }
  }

  async createForProduct(
    userId: string,
    productId: string,
    name: string | undefined,
    origin: string,
    visitorTarget?: unknown,
  ) {
    const personalized = await validateVisitorTarget(userId, visitorTarget)
    await validateVisitorFallback(userId, productId, undefined, personalized)
    const product = await ProductModel.findOne({ _id: productId, createdBy: userId }).populate(
      'file',
    )
    const file = product?.file as any
    if (!product || !file || !['image', 'video', 'web-url'].includes(file.type))
      throw new HttpError(404, 'Product or attached file not found')
    if (String(file.createdBy) !== userId) throw new HttpError(404, 'File not found')
    const user = await UserModel.findById(userId)
    if (!user) throw new HttpError(401, 'Login required')
    const codeId = new mongoose.Types.ObjectId()
    const publicBase = (process.env.PUBLIC_URL || origin).replace(/\/$/, '')
    const url = `${publicBase}/${user.useAlias ? user.alias : 'q'}/${codeId}`
    const image = await this.renderer.generateQrCodeBase64Url(url)
    return QrCodeModel.create({
      _id: codeId,
      visitorTarget: personalized,
      name: name || product.name || 'Untitled QR code',
      status: 'active',
      file: String(file._id),
      product: product._id,
      owner: userId,
      createdBy: userId,
      url,
      qrCode: image,
    })
  }

  async createForCampaign(
    userId: string,
    campaignId: string,
    name: string | undefined,
    origin: string,
    visitorTarget?: unknown,
  ) {
    const personalized = await validateVisitorTarget(userId, visitorTarget)
    await validateVisitorFallback(userId, undefined, campaignId, personalized)
    const result = await new CampaignService().eligible(userId, campaignId)
    if (!result.products.length) throw new HttpError(409, 'This campaign has no eligible products')
    const user = await UserModel.findById(userId)
    if (!user) throw new HttpError(401, 'Login required')
    const id = new mongoose.Types.ObjectId()
    const base = (process.env.PUBLIC_URL || origin).replace(/\/$/, '')
    const url = `${base}/${user.useAlias ? user.alias : 'q'}/${id}`
    const image = await this.renderer.generateQrCodeBase64Url(url)
    return QrCodeModel.create({
      _id: id,
      visitorTarget: personalized,
      name: name || result.campaign.name,
      status: 'active',
      campaign: campaignId,
      owner: userId,
      createdBy: userId,
      url,
      qrCode: image,
    })
  }

  async edit(
    userId: string,
    codeId: string,
    changes: {
      visitorTarget?: IVisitorTarget | null
      name?: string
      status?: string
      destinationUrl?: string
      productId?: string
      campaignId?: string
    },
  ) {
    const code = await QrCodeModel.findOne({ _id: codeId, createdBy: userId })
    if (!code) throw new HttpError(404, 'QR code not found')
    if (
      [changes.productId, changes.campaignId, changes.destinationUrl].filter(
        (value) => value !== undefined,
      ).length > 1
    )
      throw new HttpError(400, 'Choose one product, campaign or destination override')
    if (changes.destinationUrl !== undefined) {
      if (code.campaign) throw new HttpError(400, 'A campaign QR cannot have a direct URL override')
      const product = await ProductModel.findOne({ _id: code.product, createdBy: userId }).populate(
        'file',
      )
      if (!product || (product.file as any)?.type !== 'web-url')
        throw new HttpError(400, 'Only website QR destinations can be edited')
    }
    const update: Record<string, any> = { ...changes, updated_at: new Date() }
    delete update.productId
    delete update.campaignId
    let unset: Record<string, number> | undefined
    if (changes.productId !== undefined) {
      if (!/^[a-f\d]{24}$/i.test(changes.productId)) throw new HttpError(400, 'Invalid productId')
      if (changes.destinationUrl !== undefined)
        throw new HttpError(400, 'Choose a product or a destination override, not both')
      const product = await ProductModel.findOne({
        _id: changes.productId,
        createdBy: userId,
      }).populate('file')
      const file = product?.file as any
      if (!product || !file || String(file.createdBy) !== userId)
        throw new HttpError(404, 'Product or file not found')
      update.product = product._id
      update.file = String(file._id)
      unset = { destinationUrl: 1, campaign: 1 }
    }
    if (changes.campaignId !== undefined) {
      const result = await new CampaignService().eligible(userId, changes.campaignId)
      if (!result.products.length)
        throw new HttpError(409, 'This campaign has no eligible products')
      update.campaign = result.campaign._id
      unset = { product: 1, file: 1, destinationUrl: 1 }
    }
    if (changes.visitorTarget === null) {
      delete update.visitorTarget
      unset = { ...unset, visitorTarget: 1 }
    } else if (changes.visitorTarget !== undefined) {
      const unchanged =
        code.visitorTarget &&
        changes.visitorTarget.visitorId === code.visitorTarget.visitorId &&
        changes.visitorTarget.productId === String(code.visitorTarget.productId)
      update.visitorTarget = unchanged
        ? code.visitorTarget
        : await validateVisitorTarget(userId, changes.visitorTarget)
    }
    const effectiveTarget = changes.visitorTarget === null ? undefined : (update.visitorTarget || code.visitorTarget)
    await validateVisitorFallback(userId, unset?.product ? undefined : (update.product || code.product), unset?.campaign ? undefined : (update.campaign || code.campaign), effectiveTarget)
    // The image and public scan URL are immutable when changing a destination.
    const updated = await QrCodeModel.findOneAndUpdate(
      { _id: codeId, createdBy: userId },
      { $set: update, ...(unset ? { $unset: unset } : {}) },
      { new: true, runValidators: true },
    )
    if (!updated) throw new HttpError(404, 'QR code not found')
    return updated
  }
}
