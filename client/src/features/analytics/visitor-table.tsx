import { VisitorProductHits } from './visitor-product-hits'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react'
import type { QrCode, Scan, Campaign, Product } from '../../lib/types'
import { codeName, number } from '../../lib/format'
import { VisitorProfile } from './visitor-profile'

function groupVisitors(scans: Scan[]) {
  const groups = new Map<string, Scan[]>()
  for (const scan of scans) {
    const visitor = scan.data?.visitor
    if (!visitor?.confirmed || !visitor.id) continue
    const existing = groups.get(visitor.id) || []
    existing.push(scan)
    groups.set(visitor.id, existing)
  }
  return [...groups].map(([id, history]) => {
    history.sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at) || a._id.localeCompare(b._id),
    )
    return {
      id,
      scans: history,
      latest: history[0],
      first: history[history.length - 1],
      geo: history.find(
        (scan) => scan.data?.fingerprintData?.geo?.city || scan.data?.fingerprintData?.geo?.country,
      )?.data?.fingerprintData?.geo,
      searchable: JSON.stringify(history).toLowerCase(),
      qrCount: new Set(history.map((scan) => scan.qrCode)).size,
    }
  })
}
export function VisitorTable({
  scans,
  codes,
  loading,
  refresh,
  products = [],
  campaigns = [],
  scoped = false,
  scopeQuery = '',
}: {
  products?: Product[]
  campaigns?: Campaign[]
  scoped?: boolean
  scopeQuery?: string
  scans: Scan[]
  codes: QrCode[]
  loading: boolean
  refresh: () => Promise<unknown>
}) {
  const [hits, setHits] = useState<Scan[] | null>(null)
  const [search, setSearch] = useState('')
  const [audience, setAudience] = useState('all')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [profile, setProfile] = useState<string | null>(null)
  const groups = useMemo(() => groupVisitors(scans), [scans])
  const names = useMemo(() => new Map(codes.map((code) => [code._id, codeName(code)])), [codes])
  const rows = useMemo(
    () =>
      groups
        .filter(
          (visitor) =>
            (audience === 'all' ||
              (audience === 'returning' ? visitor.scans.length > 1 : visitor.scans.length === 1)) &&
            `${visitor.id} ${visitor.searchable} ${visitor.scans.map((scan) => names.get(scan.qrCode) || '').join(' ')}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        )
        .sort(
          (a, b) =>
            (sort === 'scans'
              ? b.scans.length - a.scans.length
              : sort === 'first'
                ? +new Date(b.first.created_at) - +new Date(a.first.created_at)
                : +new Date(b.latest.created_at) - +new Date(a.latest.created_at)) ||
            a.id.localeCompare(b.id),
        ),
    [groups, audience, search, sort, names],
  )
  const pages = Math.max(1, Math.ceil(rows.length / 25))
  const current = Math.min(page, pages - 1)
  const visible = rows.slice(current * 25, current * 25 + 25)
  const recognized = groups.reduce((sum, row) => sum + row.scans.length, 0)
  const returning = groups.filter((row) => row.scans.length > 1).length
  return (
    <section className='visitor-workspace' aria-labelledby='visitors-heading'>
      <div className='visitor-heading'>
        <div>
          <div className='eyebrow'>YOUR AUDIENCE</div>
          <h2 id='visitors-heading'>Meet your returning visitors</h2>
          <p>One row per recognized browser. Explore the activity behind each connection.</p>
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
          <RefreshCw size={16} className={refreshing ? 'visitor-refreshing' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh visitors'}
        </button>
      </div>
      <div className='visitor-metrics'>
        <div>
          <span className='visitor-metric-icon'>
            <Users size={20} />
          </span>
          <div>
            <span>Recognized browsers</span>
            <strong>{loading ? '—' : number(groups.length)}</strong>
            <small>{scoped ? 'Within the selected filters' : 'Across all your QR codes'}</small>
          </div>
        </div>
        <div>
          <span className='visitor-metric-icon returning'>
            <ArrowUpRight size={20} />
          </span>
          <div>
            <span>Returning browsers</span>
            <strong>{loading ? '—' : number(returning)}</strong>
            <small>Browsers with more than one scan</small>
          </div>
        </div>
        <div>
          <span className='visitor-metric-icon unknown'>
            <ShieldCheck size={20} />
          </span>
          <div>
            <span>Unrecognized scans</span>
            <strong>{loading ? '—' : number(scans.length - recognized)}</strong>
            <small>Kept separate from visitor counts</small>
          </div>
        </div>
      </div>
      <div className='panel visitor-panel'>
        <div className='visitor-controls'>
          <label className='search-field visitor-search'>
            <Search size={18} />
            <input
              aria-label='Search visitors'
              type='search'
              placeholder='Search visitor, location, device or QR code…'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
            {search && (
              <button
                aria-label='Clear visitor search'
                onClick={() => {
                  setSearch('')
                  setPage(0)
                }}
              >
                <X size={16} />
              </button>
            )}
          </label>
          <label className='visitor-filter'>
            <span>Audience</span>
            <select
              aria-label='Visitor audience'
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value)
                setPage(0)
              }}
            >
              <option value='all'>All visitors</option>
              <option value='returning'>Returning browsers</option>
              <option value='new'>Single-scan browsers</option>
            </select>
          </label>
          <label className='visitor-filter'>
            <span>Sort by</span>
            <select
              aria-label='Sort visitors'
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(0)
              }}
            >
              <option value='recent'>Last seen</option>
              <option value='scans'>Most scans</option>
              <option value='first'>Newest browsers</option>
            </select>
          </label>
        </div>
        <div className='visitor-results'>
          <span role='status'>
            {loading
              ? 'Loading visitors…'
              : `${number(rows.length)} ${rows.length === 1 ? 'visitor' : 'visitors'}`}
          </span>
          <span>
            <ArrowDownWideNarrow size={14} />
            {sort === 'recent'
              ? 'Most recent first'
              : sort === 'scans'
                ? 'Highest activity first'
                : 'Newest first'}
          </span>
          {(search || audience !== 'all') && (
            <button
              className='scan-reset'
              onClick={() => {
                setSearch('')
                setAudience('all')
                setPage(0)
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className='visitor-table-scroll'>
          <table className='visitor-table'>
            <caption className='sr-only'>Recognized visitors and their scan activity</caption>
            <thead>
              <tr>
                {[
                  'Visitor',
                  'Activity',
                  'Products received',
                  'Last known location',
                  'Device',
                  'Last seen',
                  'Actions',
                ].map((label) => (
                  <th scope='col' key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((visitor) => {
                const data = visitor.latest.data?.fingerprintData
                const browser = visitor.latest.data?.browser
                const geo = visitor.geo
                const country = geo?.country
                let countryName = country
                try {
                  if (country)
                    countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(country)
                } catch {
                  /* keep stored country code */
                }
                const location = [geo?.city, countryName].filter(Boolean).join(', ')
                const mobile = ['mobile', 'tablet'].includes(data?.ua?.device?.type || '')
                const productCount = new Set(visitor.scans.map(scan => scan.product).filter(Boolean)).size
                return (
                  <tr key={visitor.id}>
                    <td data-label='Visitor'>
                      <div className='visitor-identity'>
                        <span className='visitor-avatar' aria-hidden='true'>
                          {visitor.id.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <button className='visitor-name' onClick={() => setProfile(visitor.id)}>
                            {visitor.latest.data?.visitor?.name ||
                              `Visitor ${visitor.id.slice(0, 6).toUpperCase()}`}
                          </button>
                          <span
                            className={`visitor-badge ${visitor.scans.length > 1 ? 'is-returning' : ''}`}
                          >
                            {visitor.scans.length > 1 ? 'Returning' : 'Single scan'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label='Activity'>
                      <strong className='visitor-count'>
                        {number(visitor.scans.length)}{' '}
                        {visitor.scans.length === 1 ? 'scan' : 'scans'}
                      </strong>
                      <small>
                        {visitor.qrCount} QR {visitor.qrCount === 1 ? 'code' : 'codes'}
                      </small>
                    </td>
                    <td data-label='Products received'>
                      {visitor.scans.some((scan) => scan.product) ? (
                        <>
                          <strong className='visitor-count'>
                            {productCount} {productCount === 1 ? 'product' : 'products'}
                          </strong>
                          <button
                            className='visitor-hits-link'
                            aria-label={`View products for visitor ${visitor.id.slice(0, 6).toUpperCase()}`}
                            onClick={() => setHits(visitor.scans)}
                          >
                            View product hits →
                          </button>
                        </>
                      ) : (
                        <span className='muted small'>No product recorded</span>
                      )}
                    </td>
                    <td data-label='Last known location'>
                      <span className='visitor-with-icon'>
                        <Globe2 size={15} />
                        {location || 'Not available'}
                      </span>
                      <small>
                        {location
                          ? 'Approximate IP location'
                          : browser?.timezone || 'Location not provided'}
                      </small>
                    </td>
                    <td data-label='Device'>
                      <span className='visitor-with-icon'>
                        {mobile ? <Smartphone size={15} /> : <Monitor size={15} />}
                        {data?.ua?.browser?.name || 'Browser not available'}
                      </span>
                      <small>
                        {[data?.ua?.os?.name, browser?.language || data?.language]
                          .filter(Boolean)
                          .join(' · ') || 'Details not provided'}
                      </small>
                    </td>
                    <td data-label='Last seen'>
                      <time dateTime={visitor.latest.created_at}>
                        {new Date(visitor.latest.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </time>
                      <small>
                        {new Date(visitor.latest.created_at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </td>
                    <td data-label='Actions'>
                      <div className='visitor-actions'>
                        <button
                          className='btn btn-secondary btn-sm'
                          aria-label={`View profile for visitor ${visitor.id.slice(0, 6).toUpperCase()}`}
                          onClick={() => setProfile(visitor.id)}
                        >
                          View profile
                          <ArrowUpRight size={14} />
                        </button>
                        <Link
                          to={`/analytics?tab=scans&visitor=${visitor.id}${scopeQuery ? `&${scopeQuery}` : ''}`}
                          aria-label={`View scans for visitor ${visitor.id.slice(0, 6).toUpperCase()}`}
                        >
                          Scan history
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && !rows.length && (
          <div className='visitor-empty'>
            <span className='visitor-empty-icon'>
              <Users size={30} />
            </span>
            <h3>{groups.length ? 'No matching visitors' : 'Your audience starts with a scan'}</h3>
            <p>
              {groups.length
                ? 'Try another search or clear the audience filter.'
                : 'Recognized browsers will appear here when someone opens a QR code. Unrecognized scans remain in Scan details.'}
            </p>
            {groups.length > 0 && (
              <button
                className='btn btn-secondary'
                onClick={() => {
                  setSearch('')
                  setAudience('all')
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}
        <div className='visitor-pagination'>
          <span>
            {rows.length
              ? `${current * 25 + 1}–${Math.min(current * 25 + 25, rows.length)} of ${number(rows.length)} visitors`
              : '0 visitors'}
            <small>25 per page</small>
          </span>
          <div>
            <button
              className='icon-btn'
              aria-label='Previous visitor page'
              disabled={!current}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {current + 1} / {pages}
            </span>
            <button
              className='icon-btn'
              aria-label='Next visitor page'
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <p className='visitor-footnote'>
        <ShieldCheck size={15} />
        Visitors represent browsers, not verified people. Fingerprint matches remain estimates.
      </p>
      {hits && (
        <VisitorProductHits
          scans={hits}
          codes={codes}
          campaigns={campaigns}
          products={products}
          onClose={() => setHits(null)}
        />
      )}
      {profile && <VisitorProfile id={profile} basis='visitor' onClose={() => setProfile(null)} />}
    </section>
  )
}
