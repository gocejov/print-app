import { CampaignService } from './campaign.service'
import { QrCodeModel, IVisitorTarget } from '../models/qrcode.model'
import { ProductModel } from '../models/product.model'
import { StatisticModel } from '../models/statistic.model'
import { HttpError, objectBody } from '../utils/http.utils'

export async function validateVisitorTarget(
  owner: string,
  input: unknown,
): Promise<IVisitorTarget | undefined> {
  if (input === undefined || input === null) return undefined
  const body = objectBody(input, ['visitorId', 'productId'])
  if (
    typeof body.visitorId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.visitorId) ||
    typeof body.productId !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(body.productId)
  )
    throw new HttpError(400, 'Choose a recognized visitor and product')
  const codes = await QrCodeModel.find({ createdBy: owner }).select('_id')
  if (
    !(await StatisticModel.exists({
      qrCode: { $in: codes.map((code) => code._id) },
      'data.visitor.id': body.visitorId,
      'data.visitor.confirmed': true,
    }))
  )
    throw new HttpError(404, 'Recognized visitor not found')
  const product = await ProductModel.findOne({ _id: body.productId, createdBy: owner }).populate({
    path: 'file',
    match: { createdBy: owner, type: { $in: ['image', 'video', 'web-url'] } },
  })
  if (!product?.file) throw new HttpError(404, 'Product or attached file not found')
  return { visitorId: body.visitorId, productId: String(product._id) }
}

export async function validateVisitorFallback(
  owner: string,
  productId: unknown,
  campaignId: unknown,
  target?: IVisitorTarget,
) {
  if (!target) return
  if (productId && String(productId) === String(target.productId))
    throw new HttpError(400, 'Choose a different default and visitor product')
  if (campaignId) {
    const campaign = await new CampaignService().eligible(owner, String(campaignId))
    if (!campaign.products.some((product) => String(product._id) !== String(target.productId)))
      throw new HttpError(
        409,
        'The default campaign needs another eligible product for other visitors',
      )
  }
}
