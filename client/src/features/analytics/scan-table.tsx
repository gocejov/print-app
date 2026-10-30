import { VisitorProfile } from './visitor-profile'
import { visitorSummary } from './visitor-summary'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Search, X, ListFilter } from 'lucide-react'
import { Modal } from '../../components/modal'
import type { QrCode, Scan } from '../../lib/types'
import { codeName } from '../../lib/format'

function flatten(value: unknown, prefix = ''): [string, string][] {
  if (value === null || value === undefined) return [[prefix, 'Unavailable']]
  if (typeof value !== 'object') return [[prefix, String(value)]]
  const entries = Object.entries(value)
  if (!entries.length) return [[prefix, Array.isArray(value) ? '[]' : '{}']]
  return entries.flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key))
}
const joined = (...values: (string | undefined)[]) =>
  values.filter(Boolean).join(' ') || 'Unavailable'

export function ScanTable({
  scans,
  codes,
  loading,
  refresh,
  codeId,
  onCodeChange,
}: {
  scans: Scan[]
  codes: QrCode[]
  loading: boolean
  refresh: () => Promise<unknown>
  codeId: string
  onCodeChange: (id: string) => void
}) {
  const [profile, setProfile] = useState<{ id: string; basis: 'visitor' | 'fingerprint' } | null>(
    null,
  )
  const [audience, setAudience] = useState('all')
  const [visitorId, setVisitorId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Scan | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const names = useMemo(() => new Map(codes.map((code) => [code._id, codeName(code)])), [codes])
  const filtered = useMemo(
    () =>
      scans
        .filter(
          (scan) =>
            (!codeId || scan.qrCode === codeId) &&
            (!visitorId || scan.data?.visitor?.id === visitorId) &&
            (audience === 'all' ||
              (audience === 'unrecognized'
                ? !scan.data?.visitor?.confirmed
                : scan.data?.visitor?.confirmed && scan.data.visitor.audience === audience)) &&
            `${names.get(scan.qrCode) || ''} ${JSON.stringify(scan)}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        )
        .sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at) || a._id.localeCompare(b._id),
        ),
    [scans, names, codeId, search, audience, visitorId],
  )
  const visitorCounts = visitorSummary(filtered)
  const pageCount = Math.max(1, Math.ceil(filtered.length / 25))
  const current = Math.min(page, pageCount - 1)
  const visible = filtered.slice(current * 25, (current + 1) * 25)
  return (
    <section className='panel scan-panel' aria-labelledby='scan-log-title'>
      <div className='section-heading'>
        <div>
          <h2 id='scan-log-title'>
            {codeId ? `Scans for ${names.get(codeId) || codeId}` : 'All scans'}
          </h2>
          <p className='muted small'>
            Every recorded scan, newest first. Open details for every stored field.
          </p>
        </div>
        <button
          className='btn btn-secondary'
          disabled={loading || refreshing}
          onClick={async () => {
            setRefreshing(true)
            try {
              await refresh()
            } finally {
              setRefreshing(false)
            }
          }}
        >
          <RefreshCw size={15} />
          {refreshing ? 'Refreshing…' : 'Refresh scans'}
        </button>
      </div>
      <div className='scan-toolbar'>
        <label className='search-field scan-search'>
          <Search size={20} />
          <input
            type='search'
            aria-label='Search scans'
            placeholder='Search IP, browser, product, parameters…'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
          {search && (
            <button
              type='button'
              aria-label='Clear scan search'
              onClick={() => {
                setSearch('')
                setPage(0)
              }}
            >
              <X size={16} />
            </button>
          )}
        </label>
        <label className='select-control scan-code-filter'>
          <ListFilter size={17} />
          <select
            aria-label='Filter scans by QR code'
            value={codeId}
            onChange={(e) => {
              onCodeChange(e.target.value)
              setPage(0)
            }}
          >
            <option value=''>All QR codes</option>
            {codes.map((code) => (
              <option key={code._id} value={code._id}>
                {codeName(code)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className='scan-toolbar'>
        <label>
          Audience
          <select
            aria-label='Filter visitor audience'
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value)
              setPage(0)
            }}
          >
            <option value='all'>All audiences</option>
            <option value='new'>New browsers</option>
            <option value='returning'>Returning browsers</option>
            <option value='unrecognized'>Unrecognized scans</option>
          </select>
        </label>
        {visitorId && (
          <button className='btn btn-secondary' onClick={() => setVisitorId('')}>
            Clear visitor filter
          </button>
        )}
        <span>
          {visitorCounts.unique} recognized browsers · {visitorCounts.repeats} repeat scans ·{' '}
          {visitorCounts.unrecognized} unrecognized scans
        </span>
      </div>
      <div className='scan-filter-summary'>
        <span className='muted small' role='status'>
          {loading ? 'Loading scans…' : `${filtered.length} matching scans`}
        </span>
        {(codeId || search || visitorId || audience !== 'all') && (
          <button
            className='scan-reset'
            onClick={() => {
              setSearch('')
              setVisitorId('')
              setAudience('all')
              onCodeChange('')
              setPage(0)
            }}
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>
      <div
        className='table-scroll scan-table-scroll'
        tabIndex={0}
        role='region'
        aria-label='Scan records table'
      >
        <table className='codes-table scan-table'>
          <caption className='sr-only'>
            All recorded scans. Times use your browser timezone. Details include all stored
            parameters.
          </caption>
          <thead>
            <tr>
              {[
                'Scanned at',
                'QR code / selection',
                'IP address',
                'Location',
                'Browser / OS',
                'Device / language',
                'Visitor',
                'Browser signals',
                'Parameters',
                'Details',
              ].map((label) => (
                <th key={label} scope='col'>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((scan) => {
              const data = scan.data?.fingerprintData
              const browser = scan.data?.browser
              const ua = data?.ua
              const query = scan.data?.request?.query
              return (
                <tr key={scan._id}>
                  <td>
                    <time dateTime={scan.created_at}>
                      {new Date(scan.created_at).toLocaleString()}
                    </time>
                    <small>{scan._id}</small>
                  </td>
                  <td>
                    <strong>{names.get(scan.qrCode) || scan.qrCode}</strong>
                    <small>Product: {scan.product || 'Not recorded'}</small>
                    <small>Campaign: {scan.campaign || 'None recorded'}</small>
                  </td>
                  <td>{data?.ip || 'Unavailable'}</td>
                  <td>
                    {[data?.geo?.city, data?.geo?.region, data?.geo?.country]
                      .filter(Boolean)
                      .join(', ') || 'IP location unavailable'}
                    <small>
                      {browser?.location
                        ? `Browser: ${browser.location.latitude.toFixed(5)}, ${browser.location.longitude.toFixed(5)} · ±${Math.round(browser.location.accuracyMeters)} m`
                        : `Browser location: ${browser?.locationStatus || 'Not collected'}`}
                    </small>
                  </td>
                  <td>
                    {joined(ua?.browser?.name, ua?.browser?.version)}
                    <small>{joined(ua?.os?.name, ua?.os?.version)}</small>
                  </td>
                  <td>
                    {joined(ua?.device?.type, ua?.device?.vendor, ua?.device?.model)}
                    <small>{browser?.language || data?.language || 'Unavailable'}</small>
                  </td>
                  <td>
                    {scan.data?.visitor?.confirmed && scan.data.visitor.id ? (
                      <>
                        <button
                          className='btn btn-secondary btn-sm'
                          onClick={() => {
                            setVisitorId(scan.data!.visitor!.id!)
                            setPage(0)
                          }}
                        >
                          View browser scans
                        </button>
                        <small>
                          <button
                            className='btn btn-secondary btn-sm'
                            onClick={() =>
                              setProfile({ id: scan.data!.visitor!.id!, basis: 'visitor' })
                            }
                          >
                            View visitor profile
                          </button>
                          {scan.data.visitor.audience} · {scan.data.visitor.id.slice(0, 12)}
                        </small>
                      </>
                    ) : (
                      'Unrecognized'
                    )}
                    {scan.data?.browserFingerprint && (
                      <small>
                        Estimated fingerprint: {scan.data.browserFingerprint.hash.slice(0, 12)}
                        <button
                          className='btn btn-secondary btn-sm'
                          onClick={() =>
                            setProfile({
                              id: scan.data!.browserFingerprint!.hash,
                              basis: 'fingerprint',
                            })
                          }
                        >
                          View fingerprint group
                        </button>
                      </small>
                    )}
                  </td>
                  <td>
                    {browser ? (
                      <>
                        {browser.timezone || 'Timezone unavailable'}
                        <small>
                          {browser.viewportWidth} × {browser.viewportHeight} viewport
                        </small>
                        <small>
                          {browser.effectiveType || 'Connection unavailable'}
                          {browser.saveData ? ' · Data saver' : ''}
                        </small>
                      </>
                    ) : (
                      'Not collected'
                    )}
                  </td>
                  <td className='scan-params'>
                    {query === undefined
                      ? 'Not recorded'
                      : query.length
                        ? query.map(([key, value], i) => (
                            <div key={i}>
                              {key}={value}
                            </div>
                          ))
                        : 'No parameters'}
                  </td>
                  <td>
                    <button
                      className='btn btn-secondary btn-sm'
                      aria-label={`View scan ${scan._id}`}
                      onClick={() => setSelected(scan)}
                    >
                      View details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && !visible.length && (
          <div className='small-empty'>
            <p>
              {scans.length
                ? 'No scans match these filters.'
                : 'No scans recorded yet. Open a public QR link to record a scan.'}
            </p>
          </div>
        )}
      </div>
      <div className='scan-pagination'>
        <span className='muted small'>
          {filtered.length
            ? `${current * 25 + 1}–${Math.min((current + 1) * 25, filtered.length)} of ${filtered.length}`
            : '0 scans'}{' '}
          · 25 per page
        </span>
        <div>
          <button
            className='icon-btn'
            aria-label='Previous scan page'
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Page {current + 1} of {pageCount}
          </span>
          <button
            className='icon-btn'
            aria-label='Next scan page'
            disabled={current + 1 >= pageCount}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {profile && <VisitorProfile {...profile} onClose={() => setProfile(null)} />}
      {selected && (
        <Modal title='Scan details' wide onClose={() => setSelected(null)}>
          <div className='scan-details'>
            <p className='muted small'>
              Stored values for this scan. Missing values were not collected; older records may have
              fewer fields.
            </p>
            <table className='scan-field-table'>
              <caption className='sr-only'>Every stored scan field and value</caption>
              <thead>
                <tr>
                  <th scope='col'>Field</th>
                  <th scope='col'>Value</th>
                </tr>
              </thead>
              <tbody>
                {flatten(selected).map(([field, value]) => (
                  <tr key={field}>
                    <th scope='row'>{field}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </section>
  )
}
