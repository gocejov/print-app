import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Download, Gamepad2, Pause, Play, Plus, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { downloadCode, number } from '../../lib/format'
import { Modal } from '../../components/modal'
import { QrPreview } from '../../components/qr-preview'
import type { Game } from '../../lib/types'

export function GamesPage() {
  const client = useQueryClient()
  const games = useQuery({ queryKey: ['games'], queryFn: ({ signal }) => api.games(signal) })
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [welcome, setWelcome] = useState(
    'Welcome to our circle! Enter your name, send a note to another player, and scan this QR again to discover your messages.',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Game>()
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['games'] }),
      client.invalidateQueries({ queryKey: ['codes'] }),
    ])
  }
  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const game = await api.createGame(name.trim(), welcome.trim())
      await refresh()
      setCreating(false)
      setName('')
      setDetail(game)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function toggle(game: Game) {
    if (!game.code) return
    setBusy(true)
    setError('')
    try {
      await api.editCode(game.code._id, {
        status: game.code.status === 'paused' ? 'active' : 'paused',
      })
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>ONE QR. A SHARED EXPERIENCE.</div>
          <h1>
            Games<span className='heading-dot'>.</span>
          </h1>
          <p>Bring a circle together. Each game has its own QR, players, and private inboxes.</p>
        </div>
        <button
          className='btn btn-primary'
          onClick={() => {
            setError('')
            setCreating(true)
          }}
        >
          <Plus size={18} />
          Create game
        </button>
      </header>
      <div className='workflow-strip'>
        <Gamepad2 size={18} />
        <span>
          <strong>Message circle</strong> · Scan → join with a name → send a note → scan again to
          read.
        </span>
      </div>
      {error && !creating && <p role='alert'>{error}</p>}
      {games.error && (
        <div role='alert'>
          <p>{games.error.message}</p>
          <button className='btn btn-secondary' onClick={() => games.refetch()}>
            Try again
          </button>
        </div>
      )}
      {games.isPending && <p role='status'>Loading games…</p>}
      {games.data?.length === 0 && (
        <div className='empty-state'>
          <Gamepad2 size={32} />
          <h2>Your first circle starts here.</h2>
          <p>Create a game, share its QR, and let your visitors connect through text messages.</p>
        </div>
      )}
      <div className='games-grid'>
        {games.data?.map((game) => (
          <article className='game-admin-card' key={game._id}>
            <div className='game-admin-card-top'>
              <Gamepad2 size={22} />
              <span
                className={`status-badge ${game.code?.status === 'paused' ? 'paused' : 'active'}`}
              >
                {!game.code ? 'Unavailable' : game.code.status === 'paused' ? 'Paused' : 'Active'}
              </span>
            </div>
            <h2>{game.name}</h2>
            <p>{game.welcome}</p>
            <div className='game-admin-meta'>
              <Users size={16} />
              {number(game.participants || 0)} players <span>· Text messages</span>
            </div>
            <div className='game-admin-actions'>
              <button
                className='btn btn-primary'
                disabled={!game.code}
                onClick={() => setDetail(game)}
              >
                View game QR <ArrowUpRight size={15} />
              </button>
              <button
                className='btn btn-secondary'
                disabled={busy || !game.code}
                onClick={() => toggle(game)}
              >
                {game.code?.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}
                {game.code?.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            </div>
            {game.code && (
              <Link className='text-link' to={`/analytics?tab=scans&qrCode=${game.code._id}`}>
                View this game’s scans →
              </Link>
            )}
          </article>
        ))}
      </div>
      {creating && (
        <Modal
          title='Create a game'
          onClose={() => {
            if (!busy) setCreating(false)
          }}
        >
          <form className='editor-form' onSubmit={create}>
            <p className='form-hint'>
              Message circle gives each participant a persistent inbox. Only players in this game
              can find and target each other.
            </p>
            <label className='field'>
              <span>Game name</span>
              <input
                aria-label='Game name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                placeholder='Friday’s message circle'
              />
            </label>
            <label className='field'>
              <span>Welcome message</span>
              <textarea
                aria-label='Welcome message'
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                required
                maxLength={1000}
                rows={5}
              />
            </label>
            <p className='form-hint'>
              Anyone with this QR can join. Names are visible to other participants; messages are
              visible to their recipient. The game remembers players using a browser cookie.
            </p>
            {error && <p role='alert'>{error}</p>}
            <button className='btn btn-primary' disabled={busy || !name.trim() || !welcome.trim()}>
              {busy ? 'Creating…' : 'Create game QR'}
            </button>
          </form>
        </Modal>
      )}
      {detail?.code && (
        <Modal title='Your game QR' onClose={() => setDetail(undefined)}>
          <div className='game-qr-detail'>
            <QrPreview
              image={detail.code.qrCode}
              value={detail.code.url}
              label={`${detail.name} game QR code`}
            />
            <h2>{detail.name}</h2>
            <p>Print or share this single QR for joining and every return visit.</p>
            <button className='btn btn-primary' onClick={() => downloadCode(detail.code!)}>
              <Download size={16} />
              Download game QR
            </button>
            <a
              className='btn btn-secondary'
              href={detail.code.url}
              target='_blank'
              rel='noreferrer'
            >
              Open game <ArrowUpRight size={16} />
            </a>
          </div>
        </Modal>
      )}
    </>
  )
}
