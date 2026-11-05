import { HttpError, objectBody, text } from '../../utils/http.utils'
import { ParticipantModel } from '../games/game.models'

export interface ConfigurationField {
  key: string
  label: string
  type: 'text' | 'textarea'
  required: boolean
  maxLength: number
  defaultValue: string
}
export interface PluginDefinition {
  id: string
  version: number
  name: string
  description: string
  category: string
  participantLabel: string
  configurationFields: ConfigurationField[]
  validateConfiguration(value: unknown): Record<string, string>
  entryPath(spaceId: string): string
  participantCounts(spaceIds: unknown[]): Promise<Map<string, number>>
}
const definitions: PluginDefinition[] = [
  {
    id: 'message-circle',
    version: 1,
    name: 'Message Circle',
    category: 'Social game',
    description:
      'Bring people together with named players, targeted text notes, and private inboxes.',
    participantLabel: 'players',
    configurationFields: [
      {
        key: 'welcome',
        label: 'Welcome message',
        type: 'textarea',
        required: true,
        maxLength: 1000,
        defaultValue:
          'Welcome to our circle! Enter your name, send a note to another player, and scan this QR again to discover your messages.',
      },
    ],
    validateConfiguration(value) {
      const input = objectBody(value, ['welcome'])
      const welcome = text(input.welcome, 'welcome message', 1, 1000)
      if ([...welcome].some((c) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\t'))
        throw new HttpError(400, 'Invalid welcome message')
      return { welcome }
    },
    // Preserve the functional cookie's existing path and all shared public links.
    entryPath: (spaceId) => `/games/${spaceId}`,
    async participantCounts(spaceIds) {
      const counts = await ParticipantModel.aggregate([
        { $match: { game: { $in: spaceIds } } },
        { $group: { _id: '$game', count: { $sum: 1 } } },
      ])
      return new Map(counts.map((row) => [String(row._id), row.count]))
    },
  },
]
export function pluginDefinition(id: unknown, version?: number) {
  const plugin = definitions.find((definition) => definition.id === id)
  if (!plugin || (version !== undefined && plugin.version !== version))
    throw new HttpError(400, 'Unsupported plugin or plugin version')
  return plugin
}
export const pluginCatalog = () =>
  definitions.map(
    ({ id, version, name, description, category, participantLabel, configurationFields }) => ({
      id,
      version,
      name,
      description,
      category,
      participantLabel,
      configurationFields,
    }),
  )
export function spaceDefinition(space: {
  pluginId?: string | null
  pluginVersion?: number | null
  kind?: string | null
}) {
  return pluginDefinition(
    space.pluginId || space.kind || 'message-circle',
    space.pluginVersion || 1,
  )
}
export function spaceConfiguration(space: {
  configuration?: unknown
  welcome?: string | null
  pluginId?: string | null
  pluginVersion?: number | null
  kind?: string | null
}) {
  const plugin = spaceDefinition(space)
  return plugin.validateConfiguration(
    space.configuration ?? (plugin.id === 'message-circle' ? { welcome: space.welcome } : {}),
  )
}
