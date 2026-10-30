import { Request } from 'express'
import { readVisitor, visitorId, privacyPreference } from './visitor.service'
import { randomBytes } from 'crypto'
import mongoose from 'mongoose'
import { redisClient } from '../config/redis.config'
import { IQrCodeDocument, QrCodeModel } from '../models/qrcode.model'
import { ProductModel } from '../models/product.model'
import { IFileDocument } from '../models/file.model'
import { IProductDocument } from '../models/product.model'
import { CampaignService, weightedProduct } from './campaign.service'
import { HttpError } from '../utils/http.utils'

export const SELECTION_TTL_SECONDS = 30 * 60
export const selectionKey = (token: string) =>
  `${process.env.SESSION_KEY_PREFIX || 'sess:'}campaign-selection:${token}`
export interface PlaybackTarget {
  product: IProductDocument
  file: IFileDocument
  campaignId?: string
  visitorId?: string
}

export class QrPlaybackService {
  private campaigns = new CampaignService()

  async load(qid: string) {
    const code = await QrCodeModel.findOne(
      mongoose.Types.ObjectId.isValid(qid) ? { _id: qid } : { alias: qid },
    )
    if (!code) throw new HttpError(406, 'Incorrect URL')
    if (code.status === 'paused') throw new HttpError(410, 'This QR code is currently paused')
    return code
  }

  private target(product: IProductDocument, campaignId?: string): PlaybackTarget {
    return { product, file: product.file as unknown as IFileDocument, campaignId }
  }

  private matchingVisitor(code: IQrCodeDocument, req?: Request) {
    if (!req || !code.visitorTarget || privacyPreference(req)) return undefined
    const raw = readVisitor(req)
    return raw && visitorId(String(code.createdBy), raw) === code.visitorTarget.visitorId
      ? code.visitorTarget
      : undefined
  }

  private async personalTarget(
    code: IQrCodeDocument,
    visitor: NonNullable<IQrCodeDocument['visitorTarget']>,
  ) {
    const product = await ProductModel.findOne({
      _id: visitor.productId,
      createdBy: code.createdBy,
    }).populate({
      path: 'file',
      match: { createdBy: code.createdBy, type: { $in: ['image', 'video', 'web-url'] } },
    })
    if (!product?.file) throw new HttpError(410, 'Assigned product is unavailable')
    return { ...this.target(product), visitorId: visitor.visitorId }
  }

  async draw(code: IQrCodeDocument, req?: Request): Promise<PlaybackTarget> {
    const visitor = this.matchingVisitor(code, req)
    if (visitor) return this.personalTarget(code, visitor)
    if (code.campaign) {
      const result = await this.campaigns.eligible(
        String(code.createdBy),
        String(code.campaign),
        true,
      )
      return this.target(
        weightedProduct(result.products.filter(product => String(product._id) !== String(code.visitorTarget?.productId)), result.campaign.productWeights || []),
        String(code.campaign),
      )
    }
    if (code.visitorTarget && String(code.product) === String(code.visitorTarget.productId)) throw new HttpError(409, 'The default product is unavailable')
    const product = await ProductModel.findOne({
      _id: code.product,
      createdBy: code.createdBy,
    }).populate({
      path: 'file',
      match: { createdBy: code.createdBy, type: { $in: ['image', 'video', 'web-url'] } },
    })
    if (!product?.file) throw new HttpError(406, 'Product or attached file not found')
    return this.target(product)
  }

  async ticket(code: IQrCodeDocument, target: PlaybackTarget): Promise<string> {
    const token = randomBytes(24).toString('hex')
    await redisClient.setex(
      selectionKey(token),
      SELECTION_TTL_SECONDS,
      JSON.stringify({
        visitorId: target.visitorId,
        qrId: String(code._id),
        campaignId: String(code.campaign),
        productId: String(target.product._id),
        fileId: String(target.file._id),
      }),
    )
    return token
  }

  async mediaTarget(code: IQrCodeDocument, token: unknown, req?: Request): Promise<PlaybackTarget> {
    if (!code.campaign && token === undefined) return this.draw(code, req)
    if (typeof token !== 'string' || !/^[a-f\d]{48}$/.test(token))
      throw new HttpError(400, 'Scan the campaign QR code to select a product')
    const raw = await redisClient.get(selectionKey(token))
    if (!raw) throw new HttpError(410, 'This selection expired; scan the QR code again')
    const selection = JSON.parse(raw)
    if (selection.qrId !== String(code._id) || selection.campaignId !== String(code.campaign))
      throw new HttpError(404, 'Selection not found')
    const visitor = this.matchingVisitor(code, req)
    if (selection.visitorId) {
      if (!visitor || visitor.visitorId !== selection.visitorId)
        throw new HttpError(403, 'This selected content is not available to this browser')
      if (String(visitor.productId) !== selection.productId)
        throw new HttpError(410, 'Assigned content changed; scan again')
      const target = await this.personalTarget(code, visitor)
      if (String(target.file._id) !== selection.fileId)
        throw new HttpError(410, 'Assigned file changed; scan again')
      return target
    }
    if (!code.campaign || visitor) throw new HttpError(410, 'Selected content changed; scan again')
    // Recheck current membership/status, but never perform a second random draw.
    const result = await this.campaigns.eligible(
      String(code.createdBy),
      String(code.campaign),
      true,
    )
    const product = result.products.find(
      (product) =>
        String(product._id) !== String(code.visitorTarget?.productId) &&
        String(product._id) === selection.productId &&
        String((product.file as any)._id) === selection.fileId,
    )
    if (!product) throw new HttpError(410, 'Selected content changed; scan the QR code again')
    return this.target(product, selection.campaignId)
  }
}
