import { Blocks, LockKeyhole, QrCode } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import { AdminDialog } from '../../components/admin-dialog'
import { api } from '../../lib/api'
import type { PluginDefinition, Space } from '../../lib/types'
const defaults = (plugin?: PluginDefinition) =>
  Object.fromEntries(
    (plugin?.configurationFields || []).map((field) => [field.key, field.defaultValue]),
  )
export function SpaceEditor({
  plugins,
  initialPlugin,
  space,
  onClose,
  onSaved,
}: {
  plugins: PluginDefinition[]
  initialPlugin?: string
  space?: Space
  onClose: () => void
  onSaved: (space: Space) => Promise<void>
}) {
  const [pluginId, setPluginId] = useState(space?.pluginId || initialPlugin || plugins[0]?.id || '')
  const plugin = plugins.find((item) => item.id === pluginId)
  const [name, setName] = useState(space?.name || '')
  const [configuration, setConfiguration] = useState(space?.configuration || defaults(plugin))
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = space
        ? await api.editSpace(space._id, name.trim(), configuration)
        : await api.createSpace(pluginId, name.trim(), configuration)
      await onSaved(result)
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AdminDialog title={space ? 'Space settings' : 'Create a space'} busy={busy} onClose={onClose}>
      <Box
        component='form'
        onSubmit={save}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '24px !important' }}
        >
          <p className='space-mui-intro'>
            {space
              ? 'Make this space feel like yours. Changes appear the next time someone opens its QR.'
              : 'Give your group a place of its own. Choose a plugin, add a name, and your QR is ready.'}
          </p>
          <TextField
            select
            label='Space plugin'
            value={pluginId}
            disabled={Boolean(space) || busy}
            onChange={(event) => {
              setPluginId(event.target.value)
              setConfiguration(defaults(plugins.find((item) => item.id === event.target.value)))
            }}
          >
            {plugins.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          {plugin && (
            <div className='space-editor-app'>
              <span>
                <Blocks size={21} />
              </span>
              <div>
                <strong>{plugin.name}</strong>
                <p>{plugin.description}</p>
              </div>
              {space && <LockKeyhole size={15} aria-label='Plugin type is fixed' />}
            </div>
          )}
          {!plugin && (
            <Alert severity='error'>
              This plugin is unavailable. Choose an available plugin to continue.
            </Alert>
          )}
          <TextField
            label='Space name'
            required
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            placeholder='e.g. Acme Summer Party'
            slotProps={{ htmlInput: { maxLength: 120, 'aria-label': 'Space name' } }}
            helperText='A name your team will recognize.'
          />
          {plugin?.configurationFields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              multiline={field.type === 'textarea'}
              minRows={field.type === 'textarea' ? 4 : undefined}
              maxRows={field.type === 'textarea' ? 8 : undefined}
              required={field.required}
              disabled={busy}
              value={configuration[field.key] || ''}
              slotProps={{ htmlInput: { maxLength: field.maxLength, 'aria-label': field.label } }}
              helperText={`${(configuration[field.key] || '').length.toLocaleString()} / ${field.maxLength.toLocaleString()} characters`}
              onChange={(event) =>
                setConfiguration((previous) => ({ ...previous, [field.key]: event.target.value }))
              }
            />
          ))}
          <p className='space-editor-note'>
            <QrCode size={17} aria-hidden='true' />
            {space
              ? 'Plugin type is fixed. Saving settings keeps the QR, participants, and messages.'
              : 'Creating a space also creates its one permanent QR. Anyone with that QR can enter this space.'}
          </p>
          {error && <Alert severity='error'>{error}</Alert>}
        </DialogContent>
        <DialogActions
          sx={{ flexShrink: 0, '& > .MuiButton-root': { flex: { xs: 1, sm: 'initial' } } }}
        >
          <Button variant='outlined' disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='submit'
            variant='contained'
            loading={busy}
            disabled={!plugin || !name.trim()}
          >
            {space ? 'Save space' : 'Create space and QR'}
          </Button>
        </DialogActions>
      </Box>
    </AdminDialog>
  )
}
