import { Router } from 'express'
import { createHash } from 'crypto'
import { asyncHandler, HttpError, objectBody } from '../../utils/http.utils'
import { QrCodeModel } from '../../models/qrcode.model'
import { redisClient } from '../../config/redis.config'
import { readVisitor, visitorId, privacyPreference } from '../../services/visitor.service'
import { GameModel, GameMessageModel, ParticipantModel } from './game.models'
import { createGame, gameId, gameSession, loadGame, participant, plainText } from './game.service'
import { gamePage } from './game.page'

export const gameManagementRoutes = Router()
gameManagementRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const games = await GameModel.find({ createdBy: res.locals.user._id }).sort({ _id: -1 }).lean()
    const codes = await QrCodeModel.find({
      createdBy: res.locals.user._id,
      game: { $in: games.map((g) => g._id) },
    }).lean()
    const totals = await ParticipantModel.aggregate([
      { $match: { game: { $in: games.map((g) => g._id) } } },
      { $group: { _id: '$game', count: { $sum: 1 } } },
    ])
    res.set('Cache-Control', 'no-store').json(
      games.map((g) => ({
        ...g,
        code: codes.find((c) => String(c._id) === String(g.qrCode)),
        participants: totals.find((t) => String(t._id) === String(g._id))?.count || 0,
      })),
    )
  }),
)
gameManagementRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = objectBody(req.body, ['name', 'welcome'])
    res
      .status(201)
      .json(
        await createGame(
          String(res.locals.user._id),
          plainText(body.name, 'name', 120),
          plainText(body.welcome, 'welcome message', 1000),
          `${req.protocol}://${req.get('host')}`,
        ),
      )
  }),
)

async function rateLimit(key: string, max: number, seconds: number) {
  const full = `${process.env.SESSION_KEY_PREFIX || 'sess:'}game-limit:${key}`
  const count = (await redisClient.eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
    1,
    full,
    seconds,
  )) as number
  if (count > max) throw new HttpError(429, 'Too many attempts. Please try again later.')
}
export const gamePublicRoutes = Router()
gamePublicRoutes.use((_req, res, next) => {
  res
    .set('Cache-Control', 'no-store')
    .vary('Cookie')
    .set('Referrer-Policy', 'no-referrer')
    .set('X-Content-Type-Options', 'nosniff')
    .set('X-Frame-Options', 'DENY')
  res.set(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  )
  next()
})
gamePublicRoutes.use(
  asyncHandler(async (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin')
      if (
        req.get('sec-fetch-site') === 'cross-site' ||
        (origin && origin !== `${req.protocol}://${req.get('host')}`)
      )
        throw new HttpError(403, 'Cross-origin game update rejected')
      if (!req.is('application/json')) throw new HttpError(415, 'Use application/json')
    }
    next()
  }),
)
gamePublicRoutes.get(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    gameSession(req, res, String(game._id), true)
    res.type('html').send(gamePage(String(game._id), game.name, game.welcome))
  }),
)
gamePublicRoutes.get(
  '/:gameId/state',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    const tokenHash = gameSession(req, res, String(game._id))
    const player = await ParticipantModel.findOne({ game: game._id, tokenHash })
      .select('_id name')
      .lean()
    res.json({
      game: { id: game._id, name: game.name, welcome: game.welcome, kind: game.kind },
      participant: player,
    })
  }),
)
gamePublicRoutes.post(
  '/:gameId/join',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    const tokenHash = gameSession(req, res, String(game._id))
    const body = objectBody(req.body, ['name'])
    const name = plainText(body.name, 'display name', 60).replace(/\s+/g, ' ')
    const existing = await ParticipantModel.findOne({ game: game._id, tokenHash }).select(
      '_id name',
    )
    if (existing) {
      res.json(existing)
      return
    }
    await rateLimit(
      `join:${game._id}:${createHash('sha256')
        .update(req.ip || 'unknown')
        .digest('hex')}`,
      30,
      600,
    )
    const raw = readVisitor(req)
    try {
      const player = await ParticipantModel.findOneAndUpdate(
        { game: game._id, tokenHash },
        {
          $setOnInsert: {
            name,
            nameKey: name.normalize('NFKC').toLowerCase(),
            ...(raw && !privacyPreference(req)
              ? { visitorId: visitorId(String(game.createdBy), raw) }
              : {}),
          },
        },
        { upsert: true, new: true, runValidators: true },
      ).select('_id name')
      res.status(201).json(player)
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new HttpError(409, 'That name is already used in this game. Choose another.')
      throw error
    }
  }),
)
gamePublicRoutes.get(
  '/:gameId/participants',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    const player = await participant(req, res, String(game._id))
    const after = req.query.after === undefined ? undefined : gameId(req.query.after)
    const search = req.query.search === undefined ? '' : plainText(req.query.search, 'search', 60)
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rows = await ParticipantModel.find({
      game: game._id,
      _id: { $ne: player._id, ...(after ? { $gt: after } : {}) },
      ...(search ? { name: { $regex: escaped, $options: 'i' } } : {}),
    })
      .sort({ _id: 1 })
      .limit(101)
      .select('_id name')
      .lean()
    res.json({
      participants: rows.slice(0, 100),
      next: rows.length > 100 ? String(rows[99]._id) : null,
    })
  }),
)
gamePublicRoutes.post(
  '/:gameId/messages',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    const sender = await participant(req, res, String(game._id))
    const body = objectBody(req.body, ['recipientId', 'text', 'requestId'])
    const recipient = gameId(body.recipientId)
    const message = plainText(body.text, 'message', 2000)
    if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.requestId))
      throw new HttpError(400, 'Invalid request ID')
    if (recipient === String(sender._id)) throw new HttpError(400, 'Choose another participant')
    if (!(await ParticipantModel.exists({ _id: recipient, game: game._id })))
      throw new HttpError(404, 'Participant not found in this game')
    const key = { game: game._id, sender: sender._id, requestId: body.requestId }
    const existing = await GameMessageModel.findOne(key).select('_id recipient text')
    if (existing) {
      if (String(existing.recipient) !== recipient || existing.text !== message)
        throw new HttpError(409, 'This request was already used for a different message')
      res.json({ id: existing._id })
      return
    }
    await rateLimit(`send:${game._id}:${sender._id}`, 20, 60)
    // Atomic upsert makes retries safe, including simultaneous requests.
    let saved
    try {
      saved = await GameMessageModel.findOneAndUpdate(
        key,
        { $setOnInsert: { recipient, text: message } },
        { upsert: true, new: true, runValidators: true },
      )
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error
      saved = await GameMessageModel.findOne(key)
      if (!saved) throw error
    }
    if (String(saved.recipient) !== recipient || saved.text !== message)
      throw new HttpError(409, 'This request was already used for a different message')
    res.status(201).json({ id: saved._id })
  }),
)
gamePublicRoutes.get(
  '/:gameId/messages',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    const player = await participant(req, res, String(game._id))
    const status = req.query.status || 'unread'
    if (status !== 'unread' && status !== 'read') throw new HttpError(400, 'Invalid inbox status')
    const after = req.query.after === undefined ? undefined : gameId(req.query.after)
    const scope = { game: game._id, recipient: player._id }
    const rows = await GameMessageModel.find({
      ...scope,
      readAt: status === 'read' ? { $ne: null } : null,
      ...(after ? { _id: { $gt: after } } : {}),
    })
      .sort({ _id: 1 })
      .limit(2)
      .populate('sender', 'name')
      .lean()
    const item = rows[0]
    res.json({
      message: item
        ? {
            id: item._id,
            text: item.text,
            senderName: (item.sender as unknown as { name: string })?.name || 'Participant',
            createdAt: item.createdAt,
            readAt: item.readAt,
          }
        : null,
      hasMore: rows.length > 1,
      unreadCount: await GameMessageModel.countDocuments({ ...scope, readAt: null }),
      readCount: await GameMessageModel.countDocuments({ ...scope, readAt: { $ne: null } }),
    })
  }),
)
gamePublicRoutes.post(
  '/:gameId/messages/:messageId/read',
  asyncHandler(async (req, res) => {
    const { game } = await loadGame(req.params.gameId)
    const player = await participant(req, res, String(game._id))
    objectBody(req.body, [])
    const scope = { _id: gameId(req.params.messageId), game: game._id, recipient: player._id }
    if (!(await GameMessageModel.exists(scope))) throw new HttpError(404, 'Message not found')
    await GameMessageModel.updateOne({ ...scope, readAt: null }, { $set: { readAt: new Date() } })
    res.sendStatus(204)
  }),
)
