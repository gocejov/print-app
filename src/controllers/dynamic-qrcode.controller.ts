import type { IVisitorTarget } from '../models/qrcode.model'
import { Request, Response } from 'express'
import { DynamicQrCodeService, destinationUrl } from '../services/dynamic-qrcode.service'
import { HttpError, objectBody, text } from '../utils/http.utils'

const service = new DynamicQrCodeService()

export async function createDynamicCode(req: Request, res: Response) {
  const body = objectBody(req.body, ['name', 'url', 'visitorTarget'])
  const name = text(body.name, 'name', 1, 120)
  const url = destinationUrl(body.url)
  res
    .status(201)
    .json(
      await service.create(
        String(res.locals.user._id),
        name,
        url,
        `${req.protocol}://${req.get('host')}`,
        body.visitorTarget,
      ),
    )
}

export async function editDynamicCode(req: Request, res: Response) {
  const body = objectBody(req.body, [
    'name',
    'status',
    'destinationUrl',
    'productId',
    'campaignId',
    'visitorTarget',
  ])
  const changes: {
    visitorTarget?: IVisitorTarget | null
    name?: string
    status?: string
    destinationUrl?: string
    productId?: string
    campaignId?: string
  } = {}
  if (body.visitorTarget !== undefined) changes.visitorTarget = body.visitorTarget
  if (body.campaignId !== undefined)
    changes.campaignId = text(body.campaignId, 'campaignId', 24, 24)
  if (body.productId !== undefined) changes.productId = text(body.productId, 'productId', 24, 24)
  if (body.name !== undefined) changes.name = text(body.name, 'name', 1, 120)
  if (body.status !== undefined) {
    if (!['active', 'paused'].includes(body.status))
      throw new HttpError(400, 'Status must be active or paused')
    changes.status = body.status
  }
  if (body.destinationUrl !== undefined)
    changes.destinationUrl = destinationUrl(body.destinationUrl)
  if (!Object.keys(changes).length) throw new HttpError(400, 'No changes supplied')
  res.json(await service.edit(String(res.locals.user._id), req.params.id, changes))
}
