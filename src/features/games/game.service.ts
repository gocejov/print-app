import { createSpace, loadSpace } from '../spaces/space.service'
import { spaceConfiguration } from '../plugins/plugin.registry'
import { createHash, randomBytes } from 'crypto'
import { Request, Response } from 'express'
import { HttpError, text } from '../../utils/http.utils'
import { ParticipantModel } from './game.models'

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
  const { space, code, plugin } = await loadSpace(id)
  if (plugin.id !== 'message-circle')
    throw new HttpError(404, 'This space does not use Message Circle')
  space.welcome = spaceConfiguration(space).welcome
  return { game: space, code }
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
  return createSpace(
    owner,
    { pluginId: 'message-circle', name, configuration: { welcome } },
    origin,
    true,
  )
}
