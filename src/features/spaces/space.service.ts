import mongoose from 'mongoose'
import { SpaceModel } from './space.model'
import { QrCodeModel } from '../../models/qrcode.model'
import { QrCodeService } from '../../services/qrcode.service'
import { UserModel } from '../../models/user.model'
import { HttpError, text } from '../../utils/http.utils'
import { pluginDefinition, spaceDefinition, spaceConfiguration } from '../plugins/plugin.registry'

export function spaceId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value))
    throw new HttpError(400, 'Invalid space ID')
  return value
}
export function spaceView(space: any) {
  const plugin = spaceDefinition(space)
  return {
    ...space,
    pluginId: plugin.id,
    pluginVersion: space.pluginVersion || 1,
    configuration: spaceConfiguration(space),
  }
}
export async function loadSpace(id: string) {
  const space = await SpaceModel.findById(spaceId(id))
  if (!space) throw new HttpError(404, 'Space not found')
  const code = await QrCodeModel.findOne({
    _id: space.qrCode,
    createdBy: space.createdBy,
    $or: [{ space: space._id }, { game: space._id }],
  })
  if (!code) throw new HttpError(410, 'This space is no longer available')
  if (code.status === 'paused') throw new HttpError(410, 'This space is paused')
  const plugin = spaceDefinition(space)
  spaceConfiguration(space)
  return { space, code, plugin }
}
export async function createSpace(
  owner: string,
  input: { pluginId: unknown; name: unknown; configuration: unknown },
  origin: string,
  legacyTarget = false,
) {
  const plugin = pluginDefinition(input.pluginId)
  const name = text(input.name, 'space name', 1, 120)
  const configuration = plugin.validateConfiguration(input.configuration)
  const user = await UserModel.findById(owner)
  if (!user) throw new HttpError(401, 'Login required')
  const id = new mongoose.Types.ObjectId(),
    qrId = new mongoose.Types.ObjectId()
  const url = `${(process.env.PUBLIC_URL || origin).replace(/\/$/, '')}/${user.useAlias ? user.alias : 'q'}/${qrId}`
  const image = await new QrCodeService().generateQrCodeBase64Url(url)
  try {
    const space = await SpaceModel.create({
      _id: id,
      name,
      pluginId: plugin.id,
      pluginVersion: plugin.version,
      configuration,
      kind: plugin.id,
      welcome: configuration.welcome,
      createdBy: owner,
      qrCode: qrId,
    })
    const code = await QrCodeModel.create({
      _id: qrId,
      name,
      ...(legacyTarget ? { game: id } : { space: id }),
      createdBy: owner,
      owner,
      url,
      qrCode: image,
      status: 'active',
    })
    return { ...spaceView(space.toObject()), code, participants: 0 }
  } catch (error) {
    await Promise.allSettled([
      SpaceModel.deleteOne({ _id: id, createdBy: owner }),
      QrCodeModel.deleteOne({ _id: qrId, createdBy: owner }),
    ])
    throw error
  }
}
export async function listSpaces(owner: string, pluginId?: unknown) {
  if (pluginId !== undefined) pluginDefinition(pluginId)
  const spaces = await SpaceModel.find({ createdBy: owner }).sort({ _id: -1 }).lean()
  const views = spaces.map(spaceView).filter((space) => !pluginId || space.pluginId === pluginId)
  const codes = await QrCodeModel.find({
    createdBy: owner,
    _id: { $in: views.map((space) => space.qrCode) },
  }).lean()
  const counts = new Map<string, number>()
  for (const id of new Set(views.map((space) => space.pluginId))) {
    const pluginCounts = await pluginDefinition(id).participantCounts(
      views.filter((space) => space.pluginId === id).map((space) => space._id),
    )
    for (const [space, count] of pluginCounts) counts.set(space, count)
  }
  return views.map((space) => ({
    ...space,
    code: codes.find(
      (code) =>
        String(code._id) === String(space.qrCode) &&
        String(code.space || code.game) === String(space._id),
    ),
    participants: counts.get(String(space._id)) || 0,
  }))
}
export async function editSpace(
  owner: string,
  id: string,
  changes: { name?: unknown; configuration?: unknown },
) {
  const space = await SpaceModel.findOne({ _id: spaceId(id), createdBy: owner })
  if (!space) throw new HttpError(404, 'Space not found')
  const plugin = spaceDefinition(space)
  if (changes.name !== undefined) space.name = text(changes.name, 'space name', 1, 120)
  const configuration =
    changes.configuration === undefined
      ? spaceConfiguration(space)
      : plugin.validateConfiguration(changes.configuration)
  space.pluginId = plugin.id
  space.pluginVersion = plugin.version
  space.configuration = configuration
  if (plugin.id === 'message-circle') space.welcome = configuration.welcome
  await space.save()
  await QrCodeModel.updateOne(
    { _id: space.qrCode, createdBy: owner, $or: [{ space: space._id }, { game: space._id }] },
    { $set: { name: space.name } },
  )
  return spaceView(space.toObject())
}
