import { canEmbed, embeddedPage } from '../services/embed.service'
import { identifyVisitor } from '../services/visitor.service'
import { BrowserScanService, browserScanPage } from '../services/browser-scan.service'
import { FileModel } from '../models/file.model'
import { HttpError } from '../utils/http.utils'
import { productPage } from '../services/product-page.service'
import { PlaybackTarget, QrPlaybackService } from '../services/qr-playback.service'
import { BaseController } from './base.controller'
import { IQrCodeDocument } from '../models/qrcode.model'
import { QrCodeService } from '../services/qrcode.service'
import { Request, Response } from 'express'
import { TypeAlias } from '../constants/alias.constant'
import { IExtendedQueryOptions } from '../services/base.service'
import mongoose from 'mongoose'
import { StatisticService } from '../services/statistic.service'
import { IStatistic } from '../models/statistic.model'
import { DynamicQrCodeService } from '../services/dynamic-qrcode.service'
import { mediaPath, escapeHtml } from '../services/media.service'

export interface IQrCodeController extends QrCodeController {
  getAllWithOptions(req: Request, res: Response): Promise<void>
  getQrCode(req: Request, res: Response): any
  getVideo(req: Request, res: Response): any
  playVideo(req: Request, res: Response): any
}

export class QrCodeController extends BaseController<IQrCodeDocument> implements IQrCodeController {
  private statisticService: StatisticService
  constructor() {
    super(new QrCodeService())
    this.statisticService = new StatisticService()
  }

  async add(req: Request, res: Response): Promise<void> {
    const service = new DynamicQrCodeService()
    res
      .status(201)
      .json(
        await (
          req.body.campaignId
            ? service.createForCampaign.bind(service)
            : service.createForProduct.bind(service)
        )(
          String(res.locals.user._id),
          req.body.campaignId || req.body.productId,
          req.body.name,
          `${req.protocol}://${req.get('host')}`,
        ),
      )
  }

  async getAllWithOptions(req: Request, res: Response): Promise<void> {
    try {
      const qrcodes = await this.service.getAll({
        ...res.locals.scope,
        populate: [
          'owner',
          'createdBy',
          'campaign',
          { path: 'product', populate: { path: 'file' } },
        ],
      })
      res.json(qrcodes)
    } catch (err) {
      res.status(500).json({ error: err })
    }
  }

  // Route to generate the QR code
  async getQrCode(req: Request, res: Response) {
    const { id } = req.params

    try {
      if (!id) {
        return res.status(400).send('URL query parameter is required')
      }

      const $or = [{ _id: id }]
      const pagination = {
        limit: 1,
        skip: 0,
      }

      const options: IExtendedQueryOptions = {
        populate: [
          'owner',
          'createdBy',
          'campaign',
          { path: 'product', populate: { path: 'file' } },
        ],
        pagination,
      }
      const alias = id
      const queryOptions = mongoose.Types.ObjectId.isValid(id)
        ? { $or, ...options }
        : { alias, ...options }

      const qrCodes = await this.service.getAll({ ...queryOptions, ...res.locals.scope })
      const qrCode = qrCodes[0]
      if (!qrCode?.qrCode) {
        return res.status(400).send('QrCode not found')
      }
      const qrBase64Url = qrCode?.qrCode
      // Generate the QR code as a data URL (image)

      return res.send(`
            <html>
              <head>
              <style>
                body {
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background-color: #f0f0f0; /* Light background for better visibility */
                }
                .qr-code {
                  max-width: 100%;  /* Scale to fit horizontally with some margin */
                  max-height: 100%; /* Scale to fit vertically with some margin */
                  //border: 2px solid #333; /* Optional border for better visibility */
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Optional shadow for aesthetics */
                }
              </style>
              </head>
              <body>
                <img class="qr-code" src="${qrBase64Url}" alt="QR Code" style="max-width: 100%; height: auto;" />
              </body>
            </html>
          `)
    } catch (err) {
      console.error('Error generating QR code:', err)
      return res.status(500).json({ mesage: 'Error generating QR code', err })
    }
  }

  async getVideo(req: Request, res: Response) {
    res.set('Cache-Control', 'no-store')
    const playback = new QrPlaybackService()
    const code = await playback.load(req.params.qid)
    const target = await playback.mediaTarget(code, req.query.selection)
    let file = target.file
    if (req.query.media !== undefined) {
      if (
        target.product.displayMode !== 'page' ||
        typeof req.query.media !== 'string' ||
        !target.product.mediaIds?.some((id) => String(id) === req.query.media)
      )
        throw new HttpError(404, 'Media not found')
      const attachment = await FileModel.findOne({
        _id: req.query.media,
        createdBy: code.createdBy,
        type: { $in: ['image', 'video'] },
      })
      if (!attachment) throw new HttpError(404, 'Media not found')
      file = attachment
    }
    if (req.params.type !== TypeAlias[String(file.type)]) {
      res.status(406).json({ error: 'Incorrect URL' })
      return
    }
    if (file.type === 'web-url') {
      res.redirect(code.campaign ? String(file.url) : code.destinationUrl || String(file.url))
      return
    }
    res.set('X-Content-Type-Options', 'nosniff').type(String(file.mimetype))
    res.sendFile(mediaPath(file.path), (error) => {
      if (error && !res.headersSent) res.status(404).send('Media not found')
    })
  }

  async playVideo(req: Request, res: Response) {
    res.set('Cache-Control', 'no-store')
    const playback = new QrPlaybackService()
    const code = await playback.load(req.params.qid)
    const target = await playback.draw(code)
    const file = target.file
    const { fingerprint, fingerprintData } = res.locals
    const visitor = req.get('accept')?.includes('text/html')
      ? await identifyVisitor(req, res, String(code.createdBy))
      : undefined
    const statistic: IStatistic = {
      qrCode: code._id,
      product: target.product._id as mongoose.Types.ObjectId,
      ...(target.campaignId ? { campaign: new mongoose.Types.ObjectId(target.campaignId) } : {}),
      data: {
        ...(visitor ? { visitor } : {}),
        fingerprintData,
        fingerprint,
        request: {
          method: req.method,
          path: req.path.slice(0, 2048),
          query: [
            ...new URLSearchParams(
              (req.originalUrl.includes('?')
                ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1)
                : ''
              ).slice(0, 8192),
            ),
          ],
          referrer: req.get('referer')?.slice(0, 2048),
        },
      },
    }
    const saved = await this.statisticService.add(statistic).catch((error) => {
      console.error('Error saving statistic:', error)
      return undefined
    })
    if (saved && req.get('accept')?.includes('text/html')) {
      try {
        const token = await new BrowserScanService().create({
          ownerId: String(code.createdBy),
          qrId: String(code._id),
          productId: String(target.product._id),
          fileId: String(file._id),
          statisticId: String(saved._id),
          ...(code.campaign ? { selection: await playback.ticket(code, target) } : {}),
        })
        res.set('Referrer-Policy', 'no-referrer').type('html').send(browserScanPage(token))
        return
      } catch (error) {
        console.error('Browser scan collection unavailable:', error)
      }
    }
    return this.deliver(req, res, code, target)
  }

  async continueScan(req: Request, res: Response) {
    res.set('Cache-Control', 'no-store').set('Referrer-Policy', 'no-referrer')
    const context = await new BrowserScanService().load(req.params.token)
    const playback = new QrPlaybackService()
    const code = await playback.load(context.qrId)
    const target = await playback.mediaTarget(code, context.selection)
    if (
      String(target.product._id) !== context.productId ||
      String(target.file._id) !== context.fileId
    )
      throw new HttpError(410, 'Content changed; scan the QR code again')
    await new BrowserScanService().confirm(context, req)
    return this.deliver(req, res, code, target)
  }

  private async deliver(
    req: Request,
    res: Response,
    code: IQrCodeDocument,
    target: PlaybackTarget,
  ) {
    const playback = new QrPlaybackService()
    const file = target.file
    if (target.product.displayMode === 'page') {
      const token = code.campaign ? await playback.ticket(code, target) : undefined
      const media = await FileModel.find({
        _id: { $in: target.product.mediaIds || [] },
        createdBy: code.createdBy,
        type: { $in: ['image', 'video'] },
      })
      res.type('html').send(productPage(target.product, file, media, String(code._id), token))
      return
    }
    if (file.type === 'web-url') {
      const destination = code.campaign ? String(file.url) : code.destinationUrl || String(file.url)
      if (
        req.get('accept')?.includes('text/html') &&
        (await canEmbed(destination, `${req.protocol}://${req.get('host')}`))
      ) {
        res.type('html').send(embeddedPage(destination, target.product.name || 'Shared content'))
      } else res.redirect(destination)
      return
    }
    const ticket = code.campaign ? `?selection=${await playback.ticket(code, target)}` : ''
    const mediaUrl = `/l/q/${TypeAlias[String(file.type)]}/${code._id}${ticket}`
    const content =
      file.type === 'image'
        ? `<img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(String(file.name || file.originalname || 'Shared image'))}" />`
        : `<video controls playsinline><source src="${escapeHtml(mediaUrl)}" type="${escapeHtml(String(file.mimetype || 'video/mp4'))}">Your browser does not support this video.</video>`
    res
      .type('html')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shared ${file.type === 'image' ? 'image' : 'video'} — QR2Share</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#101915}img,video{display:block;max-width:100%;max-height:100dvh;object-fit:contain}</style></head><body>${content}</body></html>`,
      )
  }
}
