import { Router } from 'express'
import { asyncHandler, HttpError, objectBody } from '../../utils/http.utils'
import { createSpace, editSpace, listSpaces, loadSpace } from './space.service'
import { pluginCatalog } from '../plugins/plugin.registry'

export const pluginRoutes = Router()
pluginRoutes.get('/', (_req, res) => res.json(pluginCatalog()))
export const spaceRoutes = Router()
spaceRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res
      .set('Cache-Control', 'no-store')
      .json(await listSpaces(String(res.locals.user._id), req.query.pluginId))
  }),
)
spaceRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = objectBody(req.body, ['pluginId', 'name', 'configuration'])
    res
      .status(201)
      .json(
        await createSpace(
          String(res.locals.user._id),
          { pluginId: input.pluginId, name: input.name, configuration: input.configuration },
          `${req.protocol}://${req.get('host')}`,
        ),
      )
  }),
)
spaceRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = objectBody(req.body, ['name', 'configuration'])
    if (!Object.keys(input).length) throw new HttpError(400, 'No changes supplied')
    res.json(await editSpace(String(res.locals.user._id), req.params.id, input))
  }),
)
export const spaceEntryRoutes = Router()
spaceEntryRoutes.get(
  '/:id/open',
  asyncHandler(async (req, res) => {
    const { space, plugin } = await loadSpace(req.params.id)
    res
      .set('Cache-Control', 'no-store')
      .vary('Cookie')
      .redirect(plugin.entryPath(String(space._id)))
  }),
)
