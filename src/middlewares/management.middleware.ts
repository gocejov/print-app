import { CampaignModel } from '../models/campaign.model'
import mongoose from 'mongoose'
import { UserModel } from '../models/user.model'
import { FileModel } from '../models/file.model'
import { ProductModel } from '../models/product.model'
import { QrCodeModel } from '../models/qrcode.model'
import { StatisticModel } from '../models/statistic.model'
import { asyncHandler, HttpError, objectBody, text } from '../utils/http.utils'
import { destinationUrl } from '../services/dynamic-qrcode.service'

const models = {
  users: UserModel,
  files: FileModel,
  products: ProductModel,
  qrcodes: QrCodeModel,
  statistics: StatisticModel,
}
type Resource = keyof typeof models | 'upload'
function id(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
    throw new HttpError(400, `Invalid ${field}`)
  return value
}
function alias(value: unknown) {
  const result = text(value, 'alias', 1, 40)
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new HttpError(400, 'Invalid alias')
  return result
}

const pageFields = ['displayMode', 'mediaIds', 'actionLabel', 'actionUrl']
async function productPageFields(body: Record<string, any>, userId: string, current: any = {}) {
  const result: Record<string, any> = {}
  if (body.displayMode !== undefined) {
    if (!['direct', 'page'].includes(body.displayMode))
      throw new HttpError(400, 'Invalid display mode')
    result.displayMode = body.displayMode
  }
  if (body.mediaIds !== undefined) {
    if (!Array.isArray(body.mediaIds) || body.mediaIds.length > 12)
      throw new HttpError(400, 'Choose at most 12 additional media files')
    result.mediaIds = body.mediaIds.map((value: unknown) => id(value, 'media ID'))
    if (new Set(result.mediaIds).size !== result.mediaIds.length)
      throw new HttpError(400, 'Duplicate media files')
    const count = await FileModel.countDocuments({
      _id: { $in: result.mediaIds },
      createdBy: userId,
      type: { $in: ['image', 'video'] },
    })
    if (count !== result.mediaIds.length)
      throw new HttpError(400, 'Choose images or videos from your own library')
  }
  if (body.actionLabel !== undefined)
    result.actionLabel = text(body.actionLabel, 'actionLabel', 0, 60)
  if (body.actionUrl !== undefined)
    result.actionUrl = body.actionUrl === '' ? '' : destinationUrl(body.actionUrl)
  const merged = { ...current, ...result }
  if (Boolean(merged.actionLabel) !== Boolean(merged.actionUrl))
    throw new HttpError(400, 'Supply both an action label and URL, or leave both empty')
  return result
}

/** Establish an ownership scope and validate only explicit, writable business fields. */
export function managementAccess(resource: Resource) {
  return asyncHandler(async (req, res, next) => {
    const userId = String(res.locals.user._id)
    const segments = req.path.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (resource === 'upload') {
      if (['video', 'image'].includes(segments[0]) && id(last, 'user ID') !== userId)
        throw new HttpError(403, 'Cannot upload for another user')
      next()
      return
    }
    let scope: Record<string, any> = resource === 'users' ? { _id: userId } : { createdBy: userId }
    if (resource === 'statistics') {
      const codes = await QrCodeModel.find({ createdBy: userId }).select('_id')
      scope = { qrCode: { $in: codes.map((code) => code._id) } }
      if (['by-codes', 'total-by-codes'].includes(segments[0])) {
        const codeId = id(last, 'QR code ID')
        if (!codes.some((code) => String(code._id) === codeId))
          throw new HttpError(404, 'QR code not found')
      }
    }
    res.locals.scope = scope
    const dynamicCreate =
      resource === 'qrcodes' && req.method === 'POST' && req.path.replace(/\/$/, '') === '/dynamic'
    const recordRoute =
      !dynamicCreate &&
      segments.length > 0 &&
      !['with-options', 'create'].includes(last) &&
      ![
        'by-codes',
        'total-by-codes',
        ...(resource === 'statistics' && ['GET', 'PATCH'].includes(req.method) ? ['visitor-profile'] : []),
      ].includes(segments[0])
    if (recordRoute) {
      const recordId = id(resource === 'files' && last === 'content' ? segments[0] : last, 'ID')
      const record = await (models[resource] as mongoose.Model<any>).findOne({
        $and: [scope, { _id: recordId }],
      })
      if (!record) throw new HttpError(404, 'Item not found')
      res.locals.record = record
    }
    if (req.method === 'POST' && !dynamicCreate) {
      if (resource === 'files') {
        const body = objectBody(req.body, ['name', 'type', 'url', 'createdBy'])
        if (body.createdBy !== undefined && body.createdBy !== userId)
          throw new HttpError(403, 'Cannot create for another user')
        if (body.type !== 'web-url')
          throw new HttpError(400, 'Use an upload endpoint for images or videos')
        req.body = {
          type: 'web-url',
          url: destinationUrl(body.url),
          createdBy: userId,
          ...(body.name !== undefined ? { name: text(body.name, 'name', 1, 120) } : {}),
        }
      } else if (resource === 'products' || resource === 'qrcodes') {
        const body = objectBody(req.body, [
          'userId',
          'name',
          ...(resource === 'products'
            ? ['fileId', 'description', ...pageFields]
            : ['productId', 'campaignId', 'visitorTarget']),
        ])
        if (body.userId !== undefined && body.userId !== userId)
          throw new HttpError(403, 'Cannot create for another user')
        if (
          resource === 'qrcodes' &&
          Number(body.productId !== undefined) + Number(body.campaignId !== undefined) !== 1
        )
          throw new HttpError(400, 'Choose exactly one product or campaign')
        const field =
          resource === 'products'
            ? 'fileId'
            : body.campaignId !== undefined
              ? 'campaignId'
              : 'productId'
        const referenceId = id(body[field], field)
        const model =
          field === 'fileId' ? FileModel : field === 'campaignId' ? CampaignModel : ProductModel
        if (!(await (model as mongoose.Model<any>).exists({ _id: referenceId, createdBy: userId })))
          throw new HttpError(404, 'Referenced item not found')
        req.body = {
          ...(resource === 'products' ? await productPageFields(body, userId) : {}),
          ...(resource === 'qrcodes' && body.visitorTarget !== undefined
            ? { visitorTarget: body.visitorTarget }
            : {}),
          [field]: referenceId,
          userId,
          ...(body.name !== undefined ? { name: text(body.name, 'name', 1, 120) } : {}),
          ...(body.description !== undefined
            ? { description: text(body.description, 'description', 0, 1000) }
            : {}),
        }
      }
    }
    if (req.method === 'PUT' && resource !== 'users') {
      if (resource === 'files') {
        const body = objectBody(req.body, ['name', 'url'])
        const changes: Record<string, string> = {}
        if (body.name !== undefined) changes.name = text(body.name, 'name', 1, 120)
        if (body.url !== undefined) {
          if (res.locals.record.type !== 'web-url')
            throw new HttpError(400, 'Uploaded file paths cannot be edited')
          changes.url = destinationUrl(body.url)
        }
        if (!Object.keys(changes).length) throw new HttpError(400, 'No changes supplied')
        req.body = changes
      } else if (resource === 'products') {
        const body = objectBody(req.body, ['name', 'description', 'fileId', 'alias', ...pageFields])
        const changes = await productPageFields(body, userId, res.locals.record.toObject())
        if (body.name !== undefined) changes.name = text(body.name, 'name', 1, 120)
        if (body.description !== undefined)
          changes.description = text(body.description, 'description', 0, 1000)
        if (body.alias !== undefined) changes.alias = alias(body.alias)
        if (body.fileId !== undefined) {
          changes.fileId = id(body.fileId, 'fileId')
          if (!(await FileModel.exists({ _id: changes.fileId, createdBy: userId })))
            throw new HttpError(404, 'File not found')
        }
        if (!Object.keys(changes).length) throw new HttpError(400, 'No changes supplied')
        req.body = changes
      } else {
        const body = objectBody(req.body, ['alias'])
        req.body = { alias: alias(body.alias) }
      }
    }
    next()
  })
}
