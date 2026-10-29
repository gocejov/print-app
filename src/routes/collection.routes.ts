import { Router } from 'express'
import { CategoryService, CampaignService } from '../services/campaign.service'
import { asyncHandler } from '../utils/http.utils'

export function collectionRoutes(kind: 'category' | 'campaign') {
  const service = kind === 'category' ? new CategoryService() : new CampaignService()
  const router = Router()
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.list(String(res.locals.user._id)))
    }),
  )
  if (kind === 'campaign')
    router.get(
      '/:id/products',
      asyncHandler(async (req, res) => {
        const result = await new CampaignService().eligible(
          String(res.locals.user._id),
          req.params.id,
        )
        const weights = new Map((result.campaign.productWeights || []).map((item) => [String(item.product), item.weight]))
        const total = result.products.reduce((sum, product) => sum + (weights.get(String(product._id)) ?? 1), 0)
        res.json({ count: result.products.length, products: result.products,
          distribution: result.products.map((product) => {
            const weight = weights.get(String(product._id)) ?? 1
            return { product: String(product._id), weight, probability: weight / total }
          }),
        })
      }),
    )
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.find(String(res.locals.user._id), req.params.id))
    }),
  )
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.save(String(res.locals.user._id), req.body))
    }),
  )
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      await service.find(String(res.locals.user._id), req.params.id)
      res.json(await service.save(String(res.locals.user._id), req.body, req.params.id))
    }),
  )
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await service.remove(String(res.locals.user._id), req.params.id))
    }),
  )
  return router
}
