import { randomInt } from 'crypto'
import { CategoryModel } from '../models/category.model'
import { CampaignModel, ICampaignDocument } from '../models/campaign.model'
import { ProductModel, IProductDocument } from '../models/product.model'
import { QrCodeModel } from '../models/qrcode.model'
import { HttpError, objectBody, text } from '../utils/http.utils'

export function objectId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value))
    throw new HttpError(400, 'Invalid ID')
  return value.toLowerCase()
}
export function distinctProductIds(direct: string[], categories: string[][]): string[] {
  return [...new Set([...direct, ...categories.flat()])]
}
export function randomProduct<T>(products: T[], choose: (max: number) => number = randomInt): T {
  if (!products.length) throw new HttpError(409, 'This campaign has no eligible products')
  return products[choose(products.length)]
}
/** Missing overrides (including existing campaigns) have weight 1. */
export function weightedProduct<T extends { _id: unknown }>(
  products: T[],
  overrides: { product: unknown; weight: number }[] = [],
  choose: (max: number) => number = randomInt,
): T {
  if (!products.length) throw new HttpError(409, 'This campaign has no eligible products')
  const weights = new Map(overrides.map((item) => [String(item.product), item.weight]))
  const values = products.map((product) => weights.get(String(product._id)) ?? 1)
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 1000))
    throw new HttpError(400, 'Product weights must be integers from 1 to 1000')
  let draw = choose(values.reduce((total, value) => total + value, 0))
  for (let index = 0; index < products.length; index++) {
    draw -= values[index]
    if (draw < 0) return products[index]
  }
  throw new Error('Random selection returned an invalid value')
}
async function ownedReferences(model: any, ids: string[], userId: string) {
  if ((await model.countDocuments({ _id: { $in: ids }, createdBy: userId })) !== ids.length)
    throw new HttpError(404, 'Referenced item not found')
}
function productIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 200)
    throw new HttpError(400, 'Supply at most 200 products')
  return [...new Set(value.map(objectId))]
}

export class CategoryService {
  list(userId: string) {
    return CategoryModel.find({ createdBy: userId }).sort({ created_at: -1 })
  }
  async find(userId: string, id: string) {
    const item = await CategoryModel.findOne({ _id: objectId(id), createdBy: userId })
    if (!item) throw new HttpError(404, 'Category not found')
    return item
  }
  async save(userId: string, input: unknown, id?: string) {
    const body = objectBody(input, ['name', 'description', 'products'])
    const data = {
      name: text(body.name, 'name', 1, 120),
      description: text(body.description ?? '', 'description', 0, 1000),
      products: productIds(body.products ?? []),
      updated_at: new Date(),
    }
    await ownedReferences(ProductModel, data.products, userId)
    if (!id) return CategoryModel.create({ ...data, createdBy: userId })
    const result = await CategoryModel.findOneAndUpdate(
      { _id: objectId(id), createdBy: userId },
      { $set: data },
      { new: true, runValidators: true },
    )
    if (!result) throw new HttpError(404, 'Category not found')
    return result
  }
  async remove(userId: string, id: string) {
    await this.find(userId, id)
    if (await CampaignModel.exists({ entries: { $elemMatch: { kind: 'category', target: id } } }))
      throw new HttpError(409, 'Remove this category from its campaigns before deleting it')
    return CategoryModel.findOneAndDelete({ _id: id, createdBy: userId })
  }
}

export class CampaignService {
  list(userId: string) {
    return CampaignModel.find({ createdBy: userId }).sort({ created_at: -1 })
  }
  async find(userId: string, id: string) {
    const item = await CampaignModel.findOne({ _id: objectId(id), createdBy: userId })
    if (!item) throw new HttpError(404, 'Campaign not found')
    return item
  }
  async save(userId: string, input: unknown, id?: string) {
    const body = objectBody(input, ['name', 'description', 'entries', 'rule', 'status', 'productWeights'])
    if (body.rule !== undefined && body.rule !== 'random')
      throw new HttpError(400, 'Only the random display rule is supported')
    if (body.status !== undefined && !['active', 'paused'].includes(body.status))
      throw new HttpError(400, 'Invalid campaign status')
    if (!Array.isArray(body.entries) || body.entries.length > 100)
      throw new HttpError(400, 'Supply at most 100 campaign entries')
    const seen = new Set<string>()
    const entries = body.entries
      .map((raw) => {
        const item = objectBody(raw, ['kind', 'target'])
        if (!['product', 'category'].includes(item.kind))
          throw new HttpError(400, 'Entry must be a product or category')
        return { kind: item.kind as 'product' | 'category', target: objectId(item.target) }
      })
      .filter((item) => {
        const key = `${item.kind}:${item.target}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    await ownedReferences(
      ProductModel,
      entries.filter((item) => item.kind === 'product').map((item) => item.target),
      userId,
    )
    await ownedReferences(
      CategoryModel,
      entries.filter((item) => item.kind === 'category').map((item) => item.target),
      userId,
    )
    const rawWeights = body.productWeights ?? []
    if (!Array.isArray(rawWeights) || rawWeights.length > 20000)
      throw new HttpError(400, 'Supply at most 20000 product weights')
    const weightIds = new Set<string>()
    const productWeights = rawWeights.map((raw) => {
      const item = objectBody(raw, ['product', 'weight'])
      const product = objectId(item.product)
      if (!Number.isInteger(item.weight) || item.weight < 1 || item.weight > 1000)
        throw new HttpError(400, 'Product weights must be integers from 1 to 1000')
      if (weightIds.has(product)) throw new HttpError(400, 'Supply only one weight per product')
      weightIds.add(product)
      return { product, weight: item.weight as number }
    })
    const categories = await CategoryModel.find({
      _id: { $in: entries.filter((item) => item.kind === 'category').map((item) => item.target) },
      createdBy: userId,
    })
    const members = new Set(distinctProductIds(
      entries.filter((item) => item.kind === 'product').map((item) => item.target),
      categories.map((category) => category.products.map(String)),
    ))
    if (productWeights.some((item) => !members.has(item.product)))
      throw new HttpError(400, 'Weights must reference products included in this campaign')
    await ownedReferences(ProductModel, productWeights.map((item) => item.product), userId)
    const data = {
      name: text(body.name, 'name', 1, 120),
      description: text(body.description ?? '', 'description', 0, 1000),
      rule: 'random',
      productWeights,
      status: body.status || 'active',
      entries,
      updated_at: new Date(),
    }
    if (!id) return CampaignModel.create({ ...data, createdBy: userId })
    const result = await CampaignModel.findOneAndUpdate(
      { _id: objectId(id), createdBy: userId },
      { $set: data },
      { new: true, runValidators: true },
    )
    if (!result) throw new HttpError(404, 'Campaign not found')
    return result
  }
  async eligible(
    userId: string,
    id: string,
    requireActive = false,
  ): Promise<{ campaign: ICampaignDocument; products: IProductDocument[] }> {
    const campaign = await this.find(userId, id)
    if (requireActive && campaign.status === 'paused')
      throw new HttpError(410, 'This campaign is currently paused')
    const categories = await CategoryModel.find({
      _id: {
        $in: campaign.entries
          .filter((entry) => entry.kind === 'category')
          .map((entry) => entry.target),
      },
      createdBy: userId,
    })
    const ids = distinctProductIds(
      campaign.entries
        .filter((entry) => entry.kind === 'product')
        .map((entry) => String(entry.target)),
      categories.map((category) => category.products.map(String)),
    )
    const found = await ProductModel.find({ _id: { $in: ids }, createdBy: userId }).populate({
      path: 'file',
      match: { createdBy: userId, type: { $in: ['image', 'video', 'web-url'] } },
    })
    const byId = new Map<string, IProductDocument>()
    for (const product of found) if (product.file) byId.set(String(product._id), product)
    return {
      campaign,
      products: ids
        .map((id) => byId.get(id))
        .filter((product): product is IProductDocument => !!product),
    }
  }
  async remove(userId: string, id: string) {
    await this.find(userId, id)
    if (await QrCodeModel.exists({ campaign: id }))
      throw new HttpError(409, 'Reassign this campaign’s QR codes before deleting it')
    return CampaignModel.findOneAndDelete({ _id: id, createdBy: userId })
  }
}
