import { Link, useSearchParams } from 'react-router-dom'
import { FileIcon } from '../assets/file-preview'
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ArrowDown,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Grid2X2,
  Link2,
  List,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  QrCode as QrIcon,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  Pencil,
} from 'lucide-react'
import { useWorkspace } from './use-workspace'
import { CodeEditor } from './code-editor'
import { Modal } from '../../components/modal'
import { QrPreview } from '../../components/qr-preview'
import {
  codeName,
  date,
  destination,
  downloadCode,
  hostname,
  codeType,
  typeLabel,
  number,
} from '../../lib/format'
import type { QrCode } from '../../lib/types'
import { api } from '../../lib/api'
import { useToast } from '../../app/providers'

export function CodeLibrary({ overview = false }: { overview?: boolean }) {
  const workspace = useWorkspace()
  const { codes, scans } = workspace
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('newest')
  const [grid, setGrid] = useState(false)
  const [editor, setEditor] = useState<QrCode | 'new'>()
  const [detail, setDetail] = useState<QrCode>()
  const [deleting, setDeleting] = useState<QrCode>()
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [initialCampaignId, setInitialCampaignId] = useState<string>()
  const [initialProductId, setInitialProductId] = useState<string>()
  useEffect(() => {
    const campaignId = params.get('campaignId')
    if (campaignId) {
      setInitialCampaignId(campaignId)
      setInitialProductId(undefined)
      setEditor('new')
      setParams({}, { replace: true })
      return
    }
    const id = params.get('productId')
    if (id) {
      setInitialCampaignId(undefined)
      setInitialProductId(id)
      setEditor('new')
      setParams({}, { replace: true })
    }
  }, [params, setParams])
  function create() {
    setInitialProductId(undefined)
    setInitialCampaignId(undefined)
    setEditor('new')
  }
  const counts = useMemo(
    () =>
      scans.reduce<Record<string, number>>((result, scan) => {
        result[scan.qrCode] = (result[scan.qrCode] || 0) + 1
        return result
      }, {}),
    [scans],
  )
  const filtered = useMemo(
    () =>
      codes
        .filter((code) => {
          const fileType = codeType(code)
          return (
            `${codeName(code)} ${destination(code)}`.toLowerCase().includes(search.toLowerCase()) &&
            (type === 'all' || type === fileType) &&
            (status === 'all' || (code.status || 'active') === status)
          )
        })
        .sort((a, b) =>
          sort === 'scans'
            ? (counts[b._id] || 0) - (counts[a._id] || 0)
            : sort === 'name'
              ? codeName(a).localeCompare(codeName(b))
              : +new Date(b.created_at) - +new Date(a.created_at),
        ),
    [codes, search, type, status, sort, counts],
  )
  async function copy(code: QrCode) {
    try {
      await navigator.clipboard.writeText(code.url || '')
      toast('Scan link copied to clipboard.')
    } catch {
      toast('Clipboard unavailable. Copy the link from QR details.', true)
    }
  }
  async function toggle(code: QrCode) {
    setBusy(true)
    try {
      await api.editCode(code._id, { status: code.status === 'paused' ? 'active' : 'paused' })
      await workspace.refresh()
      toast(
        code.status === 'paused'
          ? 'Your QR code is active again.'
          : 'QR code paused. You can resume it anytime.',
      )
    } catch (e) {
      toast((e as Error).message, true)
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await api.deleteCode(deleting._id)
      await workspace.refresh()
      setDeleting(undefined)
      toast('QR code deleted.')
    } catch (e) {
      toast((e as Error).message, true)
    } finally {
      setBusy(false)
    }
  }
  function download(code: QrCode) {
    try {
      downloadCode(code)
      toast('Your PNG download is ready.')
    } catch (e) {
      toast((e as Error).message, true)
    }
  }
  function exportCsv() {
    const cell = (value: string) =>
      `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
    const csv = [
      ['Name', 'Destination', 'Scan link', 'Status', 'Scans'],
      ...filtered.map((code) => [
        codeName(code),
        destination(code),
        code.url || '',
        code.status || 'active',
        String(counts[code._id] || 0),
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr2share-codes.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('QR library exported.')
  }
  function menu(code: QrCode) {
    return (
      <details className='row-menu'>
        <summary className='icon-btn' aria-label={`Actions for ${codeName(code)}`}>
          <MoreHorizontal size={20} />
        </summary>
        <div
          className='menu-popover'
          onClick={(e) => e.currentTarget.parentElement?.removeAttribute('open')}
        >
          <button onClick={() => setDetail(code)}>
            <QrIcon size={15} />
            View QR code
          </button>
          {
            <button onClick={() => setEditor(code)}>
              <Pencil size={15} />
              Edit QR target
            </button>
          }
          <Link to={`/analytics?tab=scans&qrCode=${encodeURIComponent(code._id)}`}>
            <BarChart3 size={15} />
            View scans
          </Link>
          <button onClick={() => copy(code)}>
            <Copy size={15} />
            Copy scan link
          </button>
          <button disabled={busy} onClick={() => toggle(code)}>
            {code.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}{' '}
            {code.status === 'paused' ? 'Resume code' : 'Pause code'}
          </button>
          <button className='danger-text' onClick={() => setDeleting(code)}>
            <Trash2 size={15} />
            Delete code
          </button>
        </div>
      </details>
    )
  }
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>YOUR WORKSPACE, CONNECTED</div>
          <h1>
            {overview ? 'A little code. A lot of possibility' : 'My QR codes'}
            <span className='heading-dot'>.</span>
          </h1>
          <p>
            {overview
              ? 'A clear view of your codes and the connections they’re making.'
              : 'Create, manage, and keep your connections moving.'}
          </p>
        </div>
        <button className='btn btn-primary' onClick={create}>
          <Plus size={18} />
          Create QR code
        </button>
      </header>
      <section className='metrics-grid' aria-label='Workspace summary'>
        <div className='metric-card'>
          <div>
            <span>Total QR codes</span>
            <strong>{workspace.loading ? '—' : number(codes.length)}</strong>
            <small>All your connections in one place</small>
          </div>
          <span className='metric-icon'>
            <QrIcon size={21} />
          </span>
        </div>
        <div className='metric-card'>
          <div>
            <span>Total scans</span>
            <strong>{workspace.loading ? '—' : number(scans.length)}</strong>
            <small>Every scan is a new possibility</small>
          </div>
          <span className='metric-icon metric-peach'>
            <ArrowUpRight size={23} />
          </span>
        </div>
        <div className='metric-card'>
          <div>
            <span>Active QR codes</span>
            <strong>
              {workspace.loading ? '—' : number(codes.filter((c) => c.status !== 'paused').length)}
            </strong>
            <small>
              <span className='live-dot' />
              Ready for their next scan
            </small>
          </div>
          <span className='metric-icon metric-lilac'>
            <Link2 size={21} />
          </span>
        </div>
      </section>
      {overview && (
        <section className='connection-banner'>
          <div>
            <span className='eyebrow'>PRINT ONCE. KEEP EVOLVING.</span>
            <h2>Your next connection starts here.</h2>
            <p>Upload a file. Attach it to a product. Connect it to a QR code.</p>
            <div className='workflow-links'>
              <Link to='/files'>01 Files</Link>
              <span>→</span>
              <Link to='/products'>02 Products</Link>
              <span>→</span>
              <Link to='/qr-codes'>03 QR codes</Link>
            </div>
            <button className='text-link' onClick={create}>
              Let’s make something scannable
              <ArrowRightIcon />
            </button>
          </div>
          <div className='banner-art' aria-hidden='true'>
            <div className='banner-orbit' />
            <div className='banner-label'>
              <FileIcon type='web-url' size={16} />
              your next big idea
              <ArrowUpRight size={16} />
            </div>
            <div className='banner-qr'>
              <QrPreview value='https://qr2share.example' />
            </div>
            <span className='banner-plus'>+</span>
            <span className='banner-dot' />
          </div>
        </section>
      )}
      <section className='library-section'>
        <div className='section-heading'>
          <div className='section-heading-label'>
            <h2>{overview ? 'Your QR codes' : 'QR code library'}</h2>
            <span className='count-badge'>{codes.length}</span>
          </div>
          <button
            className='btn btn-secondary btn-sm'
            disabled={!filtered.length || !!workspace.error}
            onClick={exportCsv}
          >
            <ArrowDownToLine size={15} />
            Export CSV
          </button>
        </div>
        <div className='library-toolbar'>
          <div className='tabs' aria-label='Content type'>
            {[
              ['all', 'All codes'],
              ['web-url', 'URLs'],
              ['image', 'Images'],
              ['campaign', 'Campaigns'],
              ['video', 'Video'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={type === value ? 'selected' : ''}
                onClick={() => setType(value)}
              >
                {label}
                {value === 'all' && <span>{codes.length}</span>}
              </button>
            ))}
          </div>
          <div className='library-controls'>
            <div className='search-field'>
              <Search size={17} />
              <input
                aria-label='Search QR codes'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search QR codes…'
              />
              {search && (
                <button aria-label='Clear search' onClick={() => setSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <label className='select-control'>
              <SlidersHorizontal size={15} />
              <select
                aria-label='Filter by status'
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value='all'>All status</option>
                <option value='active'>Active</option>
                <option value='paused'>Paused</option>
              </select>
            </label>
            <div className='view-switch'>
              <button
                className={!grid ? 'selected' : ''}
                aria-label='List view'
                aria-pressed={!grid}
                onClick={() => setGrid(false)}
              >
                <List size={17} />
              </button>
              <button
                className={grid ? 'selected' : ''}
                aria-label='Grid view'
                aria-pressed={grid}
                onClick={() => setGrid(true)}
              >
                <Grid2X2 size={16} />
              </button>
            </div>
          </div>
        </div>
        {workspace.error ? (
          <div className='empty-state'>
            <h3>We couldn’t load your workspace.</h3>
            <p>{workspace.error.message}</p>
            <button className='btn btn-secondary' onClick={() => workspace.refresh()}>
              Try again
            </button>
          </div>
        ) : workspace.loading ? (
          <div className='table-skeleton' aria-label='Loading QR codes'>
            {[1, 2, 3].map((i) => (
              <div key={i} />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className='empty-state'>
            <div className='empty-qr'>
              <QrIcon size={34} />
              <span>
                <Plus size={14} />
              </span>
            </div>
            <h3>
              {codes.length
                ? 'No matching connections.'
                : 'Your next great connection starts here.'}
            </h3>
            <p>
              {codes.length
                ? 'Try another search or clear your filters.'
                : 'Create your first dynamic QR code. Change where it leads anytime.'}
            </p>
            {codes.length ? (
              <button
                className='btn btn-secondary'
                onClick={() => {
                  setSearch('')
                  setType('all')
                  setStatus('all')
                }}
              >
                Clear filters
              </button>
            ) : (
              <button className='btn btn-primary' onClick={create}>
                <Plus size={17} />
                Create your first QR code
              </button>
            )}
            <div className='empty-note'>
              <Check size={14} />
              Editable destinations
              <Check size={14} />
              Scan insights
              <Check size={14} />
              High-resolution downloads
            </div>
          </div>
        ) : grid ? (
          <div className='code-grid'>
            {filtered.map((code) => (
              <article className='code-card' key={code._id}>
                <div className='code-card-top'>
                  <span className={`status-badge ${code.status === 'paused' ? 'paused' : ''}`}>
                    <i />
                    {code.status === 'paused' ? 'Paused' : 'Active'}
                  </span>
                  {menu(code)}
                </div>
                <button
                  className='code-card-qr'
                  aria-label={`View ${codeName(code)}`}
                  onClick={() => setDetail(code)}
                >
                  <QrPreview image={code.qrCode} />
                </button>
                <button className='code-title' onClick={() => setDetail(code)}>
                  {codeName(code)}
                </button>
                <p className='muted'>{hostname(destination(code))}</p>
                <div className='code-card-footer'>
                  <span>
                    <ArrowUpRight size={16} />
                    {number(counts[code._id] || 0)} scans
                  </span>
                  <button
                    className='icon-btn'
                    aria-label={`Download ${codeName(code)}`}
                    onClick={() => download(code)}
                  >
                    <Download size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className='table-scroll'>
            <table className='codes-table'>
              <thead>
                <tr>
                  <th>
                    <button onClick={() => setSort(sort === 'name' ? 'newest' : 'name')}>
                      QR code name
                      <ArrowDown size={13} />
                    </button>
                  </th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>
                    <button onClick={() => setSort('scans')}>
                      Scans
                      <ArrowDown size={13} />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => setSort('newest')}>
                      Created
                      <ArrowDown size={13} />
                    </button>
                  </th>
                  <th>
                    <span className='sr-only'>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((code) => (
                  <tr key={code._id}>
                    <td>
                      <div className='code-name-cell'>
                        <button
                          className='table-qr'
                          aria-label={`View ${codeName(code)}`}
                          onClick={() => setDetail(code)}
                        >
                          <QrPreview image={code.qrCode} />
                        </button>
                        <div>
                          <button className='code-title' onClick={() => setDetail(code)}>
                            {codeName(code)}
                          </button>
                          <span className='destination-label'>
                            {hostname(destination(code))}
                            <ArrowUpRight size={12} />
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className='type-label'>
                        <FileIcon type={codeType(code)} size={15} /> {typeLabel(codeType(code))}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${code.status === 'paused' ? 'paused' : ''}`}>
                        <i />
                        {code.status === 'paused' ? 'Paused' : 'Active'}
                      </span>
                    </td>
                    <td className='scan-count'><Link className='scan-count-link' aria-label={`View scans for ${codeName(code)}`} to={`/analytics?tab=scans&qrCode=${encodeURIComponent(code._id)}`}>{number(counts[code._id] || 0)}</Link></td>
                    <td className='date-cell'>{date(code.created_at)}</td>
                    <td>
                      <div className='row-actions'>
                        <button
                          className='icon-btn'
                          aria-label={`Download ${codeName(code)}`}
                          onClick={() => download(code)}
                        >
                          <Download size={17} />
                        </button>
                        {menu(code)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className='library-footer'>
          <span>
            {workspace.loading
              ? 'Loading your workspace…'
              : `Showing ${filtered.length} of ${codes.length} QR codes`}
          </span>
          <span>
            <span className='live-dot' />
            Your next scan is just around the corner.
          </span>
        </div>
      </section>
      <div className='workspace-footnote'>
        <ShieldIcon />
        Made to connect. Built to keep up.<span>QR2Share workspace</span>
      </div>
      {editor && (
        <CodeEditor
          code={editor === 'new' ? undefined : editor}
          initialProductId={initialProductId}
          initialCampaignId={initialCampaignId}
          onClose={() => setEditor(undefined)}
          onSaved={workspace.refresh}
        />
      )}
      {detail && (
        <Modal title={codeName(detail)} onClose={() => setDetail(undefined)}>
          <div className='detail-content'>
            <div className='detail-qr'>
              <QrPreview image={detail.qrCode} />
            </div>
            <span className='pill pill-green'>
              {number(counts[detail._id] || 0)} recorded scans
            </span>
            <label>
              Permanent scan link
              <div className='copy-field'>
                <input aria-label='Permanent scan link' value={detail.url || ''} readOnly />
                <button
                  className='icon-btn'
                  aria-label='Copy scan link'
                  onClick={() => copy(detail)}
                >
                  <Copy size={17} />
                </button>
              </div>
            </label>
            <label>
              Current target<span className='detail-destination'>{destination(detail)}</span>
            </label>
            <Link className='btn btn-secondary' to={`/analytics?tab=scans&qrCode=${encodeURIComponent(detail._id)}`}><BarChart3 size={16} />View scans</Link>
            <div className='detail-actions'>
              <button className='btn btn-primary' onClick={() => download(detail)}>
                <Download size={16} />
                Download PNG
              </button>
              {detail.url && (
                <a className='btn btn-secondary' target='_blank' rel='noreferrer' href={detail.url}>
                  Test scan
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
            <p className='muted small'>Opening the scan link adds a scan to your analytics.</p>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title='Delete this QR code?' onClose={() => setDeleting(undefined)} busy={busy}>
          <div className='delete-content'>
            <div className='delete-icon'>
              <Trash2 size={23} />
            </div>
            <h3>{codeName(deleting)}</h3>
            <p>
              Its printed QR code and scan link will stop working. This can’t be undone. You can
              pause it instead if you just need a break.
            </p>
          </div>
          <div className='modal-actions'>
            <button
              className='btn btn-secondary'
              disabled={busy}
              onClick={() => setDeleting(undefined)}
            >
              Keep QR code
            </button>
            <button className='btn btn-danger' disabled={busy} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete QR code'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
function ArrowRightIcon() {
  return <ArrowUpRight size={17} />
}
function ShieldIcon() {
  return <Check size={14} />
}
