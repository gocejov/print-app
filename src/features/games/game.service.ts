import mongoose from 'mongoose'
import { createHash, randomBytes } from 'crypto'
import { Request, Response } from 'express'
import { QrCodeModel } from '../../models/qrcode.model'
import { QrCodeService } from '../../services/qrcode.service'
import { UserModel } from '../../models/user.model'
import { HttpError, text } from '../../utils/http.utils'
import { GameModel, ParticipantModel } from './game.models'

export function gameId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
    throw new HttpError(400, 'Invalid game ID')
  return value
}
export function plainText(value: unknown, field: string, max: number) {
  const result = text(value, field, 1, max)
  if ([...result].some((c) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t'))
    throw new HttpError(400, `Invalid ${field}`)
  return result
}
export async function loadGame(id: string) {
  const game = await GameModel.findById(gameId(id))
  if (!game) throw new HttpError(404, 'Game not found')
  const code = await QrCodeModel.findOne({
    _id: game.qrCode,
    game: game._id,
    createdBy: game.createdBy,
  })
  if (!code) throw new HttpError(410, 'This game is no longer available')
  if (code.status === 'paused') throw new HttpError(410, 'This game is paused')
  return { game, code }
}
export function gameSession(req: Request, res: Response, id: string, issue = false) {
  const key = `qr2share_play_${id}`
  let raw = req.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${key}=`))
    ?.slice(key.length + 1)
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) {
    if (!issue) throw new HttpError(401, 'Enable cookies and open the game again to join')
    raw = randomBytes(32).toString('hex')
    res.cookie(key, raw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || process.env.NODE_ENV === 'production',
      path: `/games/${id}`,
      maxAge: 180 * 86400000,
    })
  }
  return createHash('sha256').update(`game:${id}:${raw}`).digest('hex')
}
export async function participant(req: Request, res: Response, id: string) {
  const tokenHash = gameSession(req, res, id)
  const player = await ParticipantModel.findOne({ game: id, tokenHash })
  if (!player) throw new HttpError(401, 'Join this game first')
  return player
}
export async function createGame(owner: string, name: string, welcome: string, origin: string) {
  const user = await UserModel.findById(owner)
  if (!user) throw new HttpError(401, 'Login required')
  const id = new mongoose.Types.ObjectId(),
    qrId = new mongoose.Types.ObjectId()
  const base = (process.env.PUBLIC_URL || origin).replace(/\/$/, '')
  const url = `${base}/${user.useAlias ? user.alias : 'q'}/${qrId}`
  const image = await new QrCodeService().generateQrCodeBase64Url(url)
  try {
    const game = await GameModel.create({ _id: id, name, welcome, createdBy: owner, qrCode: qrId })
    const code = await QrCodeModel.create({
      _id: qrId,
      name,
      game: id,
      createdBy: owner,
      owner,
      url,
      qrCode: image,
      status: 'active',
    })
    return { ...game.toObject(), code }
  } catch (error) {
    await Promise.allSettled([
      GameModel.deleteOne({ _id: id }),
      QrCodeModel.deleteOne({ _id: qrId }),
    ])
    throw error
  }
}
