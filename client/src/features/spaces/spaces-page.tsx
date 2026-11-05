import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import DialogContent from '@mui/material/DialogContent'
import Alert from '@mui/material/Alert'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Download,
  Layers3,
  Pause,
  Pencil,
  Play,
  Plus,
  Users,
  Search,
  X,
  QrCode,
  Blocks,
} from 'lucide-react'
import { api } from '../../lib/api'
import { downloadCode, number } from '../../lib/format'
import { AdminDialog } from '../../components/admin-dialog'
import { QrPreview } from '../../components/qr-preview'
import type { Space } from '../../lib/types'
import { useSpaces } from './use-spaces'
import { SpaceEditor } from './space-editor'
export function SpacesPage() {
  const { plugins, spaces, refresh } = useSpaces()
  const [params, setParams] = useSearchParams()
  const pluginId = params.get('plugin') || ''
  const [creating, setCreating] = useState(false),
    [editing, setEditing] = useState<Space>(),
    [detail, setDetail] = useState<Space>()
  const [search, setSearch] = useState(''),
    [busyId, setBusyId] = useState<string | null>(null),
    [error, setError] = useState('')
  const items = (spaces.data || []).filter(
    (space) =>
      (!pluginId || space.pluginId === pluginId) &&
      space.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const createPlugin = params.get('create') || undefined
  function closeEditor() {
    setCreating(false)
    setEditing(undefined)
    if (params.has('create')) {
      const next = new URLSearchParams(params)
      next.delete('create')
      setParams(next, { replace: true })
    }
  }
  async function saved(space: Space) {
    const wasCreating = !editing
    await refresh()
    closeEditor()
    if (wasCreating) setDetail(space)
  }
  async function toggle(space: Space) {
    if (!space.code) return
    setBusyId(space._id)
    setError('')
    try {
      await api.editCode(space.code._id, {
        status: space.code.status === 'paused' ? 'active' : 'paused',
      })
      await refresh()
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setBusyId(null)
    }
  }
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>ONE PLUGIN. YOUR OWN SPACE.</div>
          <h1>
            Spaces<span className='heading-dot'>.</span>
          </h1>
          <p>Independent spaces, each powered by one plugin and opened through its own QR.</p>
        </div>
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
          disabled={!plugins.data?.length}
          onClick={() => setCreating(true)}
        >
          Create space
        </Button>
      </header>
      <div className='workflow-strip spaces-workflow'>
        <Layers3 size={18} />
        <span>Choose a plugin → configure a space → share its QR.</span>
        <Link to='/plugins'>Explore plugins →</Link>
      </div>
      <section className='spaces-mui-toolbar panel' aria-label='Find spaces'>
        <TextField
          label='Search spaces'
          type='search'
          placeholder='Search by space name…'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position='end'>
                  <IconButton
                    size='small'
                    aria-label='Clear space search'
                    onClick={() => setSearch('')}
                  >
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
            htmlInput: { autoComplete: 'off' },
          }}
        />
        <TextField
          select
          label='Filter spaces by plugin'
          slotProps={{
            inputLabel: { shrink: true },
            select: {
              displayEmpty: true,
              renderValue: (value) =>
                plugins.data?.find((plugin) => plugin.id === value)?.name || 'All plugins',
            },
          }}
          value={pluginId}
          onChange={(event) => {
            const next = new URLSearchParams(params)
            if (event.target.value) next.set('plugin', event.target.value)
            else next.delete('plugin')
            setParams(next)
          }}
        >
          <MenuItem value=''>All plugins</MenuItem>
          {plugins.data?.map((plugin) => (
            <MenuItem key={plugin.id} value={plugin.id}>
              {plugin.name}
            </MenuItem>
          ))}
        </TextField>
      </section>
      {!spaces.isPending && !spaces.error && (
        <div className='spaces-result-summary'>
          <span>
            {items.length} {items.length === 1 ? 'space' : 'spaces'}
            {search || pluginId ? ' found' : ' in your workspace'}
          </span>
          {(search || pluginId) && (
            <Button
              variant='text'
              size='small'
              onClick={() => {
                setSearch('')
                setParams({})
              }}
            >
              Reset filters
            </Button>
          )}
        </div>
      )}
      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {(spaces.error || plugins.error) && (
        <Alert
          severity='error'
          sx={{ mt: 2 }}
          action={
            <Button
              color='inherit'
              onClick={() => {
                spaces.refetch()
                plugins.refetch()
              }}
            >
              Try again
            </Button>
          }
        >
          {spaces.error?.message || plugins.error?.message}
        </Alert>
      )}
      {(spaces.isPending || plugins.isPending) && <p role='status'>Loading spaces…</p>}
      {!spaces.isPending && !spaces.error && !plugins.error && !items.length && (
        <div className='empty-state'>
          <Layers3 size={32} />
          <h2>{spaces.data?.length ? 'No matching spaces' : 'Make room for your first space.'}</h2>
          <p>
            Choose a plugin and give your space a name. Its participants and content stay together.
          </p>
          <Button
            variant='contained'
            disabled={!plugins.data?.length}
            onClick={() => {
              if (search || pluginId) {
                setSearch('')
                setParams({})
              } else setCreating(true)
            }}
          >
            {search || pluginId ? 'Show all spaces' : 'Create your first space'}
          </Button>
        </div>
      )}
      <div className='spaces-grid'>
        {items.map((space) => {
          const plugin = plugins.data?.find((item) => item.id === space.pluginId)
          return (
            <article className='space-card' key={space._id}>
              <div className='space-card-header'>
                <span className='space-app-label'>
                  <Blocks size={15} />
                  {plugin?.name || space.pluginId}
                </span>
                <span
                  className={`space-status ${!space.code ? 'unavailable' : space.code.status === 'paused' ? 'paused' : 'active'}`}
                >
                  {!space.code
                    ? 'Unavailable'
                    : space.code.status === 'paused'
                      ? 'Paused'
                      : 'Active'}
                </span>
              </div>
              <h2>{space.name}</h2>
              <p className='space-card-description'>
                {plugin?.description || 'An independent space for your participants.'}
              </p>
              {space.pluginId === 'message-circle' && (
                <div className='space-welcome-preview'>
                  <span>Welcome message</span>
                  <p>{space.configuration.welcome}</p>
                </div>
              )}
              <div className='space-card-meta'>
                <Users size={16} />
                {number(space.participants)} {plugin?.participantLabel || 'participants'}
                <span>One shared QR</span>
              </div>
              <div className='space-card-actions'>
                <Button
                  variant='contained'
                  startIcon={<QrCode size={17} />}
                  endIcon={<ArrowUpRight size={15} />}
                  disabled={!space.code}
                  onClick={() => setDetail(space)}
                  sx={{ gridColumn: '1 / -1' }}
                >
                  View space QR
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<Pencil size={15} />}
                  onClick={() => setEditing(space)}
                >
                  Settings
                </Button>
                <Button
                  variant='outlined'
                  loading={busyId === space._id}
                  disabled={Boolean(busyId) || !space.code}
                  startIcon={
                    space.code?.status === 'paused' ? <Play size={15} /> : <Pause size={15} />
                  }
                  onClick={() => toggle(space)}
                >
                  {space.code?.status === 'paused' ? 'Resume' : 'Pause'}
                </Button>
              </div>
              {space.code && (
                <Link
                  className='space-visitors-link'
                  to={`/analytics?tab=visitors&qrCode=${space.code._id}`}
                >
                  View this space’s visitors →
                </Link>
              )}
            </article>
          )
        })}
      </div>
      {(creating || createPlugin || editing) && plugins.data && (
        <SpaceEditor
          key={editing?._id || createPlugin || 'new'}
          plugins={plugins.data}
          initialPlugin={createPlugin}
          space={editing}
          onClose={closeEditor}
          onSaved={saved}
        />
      )}
      {detail?.code && (
        <AdminDialog title='Your space QR' onClose={() => setDetail(undefined)}>
          <DialogContent className='space-qr-detail' sx={{ pt: '24px !important' }}>
            <span className='space-qr-label'>READY TO SHARE</span>
            <h2>{detail.name}</h2>
            <div className='space-qr-frame'>
              <QrPreview
                image={detail.code.qrCode}
                value={detail.code.url}
                label={`${detail.name} space QR code`}
              />
            </div>
            <p>
              One QR for this space. Its plugin settings, participants, and content stay separate
              from other spaces.
            </p>
            <div className='space-qr-actions'>
              <Button
                variant='contained'
                startIcon={<Download size={16} />}
                onClick={() => downloadCode(detail.code!)}
              >
                Download space QR
              </Button>
              <Button
                component='a'
                variant='outlined'
                href={detail.code.url}
                target='_blank'
                rel='noreferrer'
                endIcon={<ArrowUpRight size={16} />}
              >
                Open space
              </Button>
            </div>
          </DialogContent>
        </AdminDialog>
      )}
    </>
  )
}
