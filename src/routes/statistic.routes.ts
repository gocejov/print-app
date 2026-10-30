import { VisitorLabelModel } from '../models/visitor-label.model'
import { StatisticModel } from '../models/statistic.model'
import { objectBody, text } from '../utils/http.utils'
import { getVisitorProfile } from '../services/visitor-profile.service'
import { HttpError } from '../utils/http.utils'
import { asyncHandler } from '../utils/http.utils'
import { Router } from 'express'
// import { cacheMiddleware } from '../middlewares/cache.middleware';
import { IStatisticController, StatisticController } from '../controllers/statistic.controller'

const statisticController: IStatisticController = new StatisticController()

const router = Router()

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const scans = await StatisticModel.find(res.locals.scope).lean()
    const ids = [
      ...new Set(
        scans
          .filter((scan) => scan.data?.visitor?.confirmed)
          .map((scan) => scan.data?.visitor?.id)
          .filter(Boolean),
      ),
    ]
    const labels = await VisitorLabelModel.find({
      owner: res.locals.user._id,
      visitorId: { $in: ids },
    }).lean()
    const names = new Map(labels.map((label) => [label.visitorId, label.name]))
    const result = scans.map((scan) => {
      if (!scan.data?.visitor?.confirmed || !scan.data.visitor.id) return scan
      return {
        ...scan,
        data: {
          ...scan.data,
          visitor: { ...scan.data.visitor, name: names.get(scan.data.visitor.id) || '' },
        },
      }
    })
    res.set('Cache-Control', 'no-store').json(result)
  }),
)
router.get(
  '/visitor-profile/:visitorId',
  asyncHandler(async (req, res) => {
    const basis = req.query.basis || 'visitor'
    if (basis !== 'visitor' && basis !== 'fingerprint')
      throw new HttpError(400, 'Invalid profile basis')
    res
      .set('Cache-Control', 'no-store')
      .json({
        ...(await getVisitorProfile(res.locals.scope, req.params.visitorId, basis)),
        name:
          basis === 'visitor'
            ? (
                await VisitorLabelModel.findOne({
                  owner: res.locals.user._id,
                  visitorId: req.params.visitorId,
                }).lean()
              )?.name || ''
            : '',
      })
  }),
)
router.patch(
  '/visitor-profile/:visitorId',
  asyncHandler(async (req, res) => {
    const body = objectBody(req.body, ['name'])
    const name = text(body.name, 'name', 0, 120)
    if ([...name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new HttpError(400, 'Invalid name')
    await getVisitorProfile(res.locals.scope, req.params.visitorId, 'visitor')
    const key = { owner: res.locals.user._id, visitorId: req.params.visitorId }
    if (name)
      await VisitorLabelModel.findOneAndUpdate(
        key,
        { $set: { name } },
        { upsert: true, runValidators: true },
      )
    else await VisitorLabelModel.deleteOne(key)
    res.set('Cache-Control', 'no-store').json({ id: req.params.visitorId, name })
  }),
)
router.get(
  '/:id',
  asyncHandler((req, res) => statisticController.findById(req, res)),
)
router.get(
  '/by-codes/:qid',
  asyncHandler((req, res) => statisticController.findStatisticByQrCode(req, res)),
)
router.get(
  '/total-by-codes/:qid',
  asyncHandler((req, res) => statisticController.findTotalStatisticByQrCode(req, res)),
)

export default router
