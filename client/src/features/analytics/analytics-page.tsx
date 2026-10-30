import { VisitorTable } from './visitor-table'
import { visitorSummary } from './visitor-summary'
import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ArrowUpRight, BarChart3, Globe2, MousePointer2, QrCode, Users } from 'lucide-react'
import { useWorkspace } from '../codes/use-workspace'
import { ScanTable } from './scan-table'
import { codeName, number } from '../../lib/format'

export function AnalyticsPage() {
  const { codes, scans, loading, error, refresh } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const tab =
    params.get('tab') === 'visitors'
      ? 'visitors'
      : params.get('tab') === 'scans' || params.has('qrCode') || params.has('visitor')
        ? 'scans'
        : 'overview'
  const visitorId = params.get('visitor') || ''
  const setVisitorId = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('tab', 'scans')
    if (id) next.set('visitor', id)
    else next.delete('visitor')
    setParams(next)
  }
  const codeId = params.get('qrCode') || ''
  const setCodeId = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('tab', 'scans')
    if (id) next.set('qrCode', id)
    else next.delete('qrCode')
    setParams(next)
  }
  const [days, setDays] = useState(14)
  const buckets = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = Array.from({ length: days }, (_, i) => {
      const day = new Date(today)
      day.setDate(day.getDate() - days + i + 1)
      const end = new Date(day)
      end.setDate(end.getDate() + 1)
      return {
        label: day.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        count: scans.filter(
          (scan) => +new Date(scan.created_at) >= +day && +new Date(scan.created_at) < +end,
        ).length,
      }
    })
    return result
  }, [scans, days])
  const visitors = visitorSummary(scans)
  const total = buckets.reduce((sum, b) => sum + b.count, 0)
  const max = Math.max(...buckets.map((b) => b.count), 1)
  const counts = scans.reduce<Record<string, number>>((result, scan) => {
    result[scan.qrCode] = (result[scan.qrCode] || 0) + 1
    return result
  }, {})
  const countries = scans.reduce<Record<string, number>>((result, scan) => {
    const country = scan.data?.fingerprintData?.geo?.country || 'Unknown'
    result[country] = (result[country] || 0) + 1
    return result
  }, {})
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>EVERY SCAN TELLS A STORY</div>
          <h1>
            Connection insights<span className='heading-dot'>.</span>
          </h1>
          <p>See how your QR codes are bringing people closer.</p>
        </div>
        {tab === 'overview' && (
          <label className='select-control'>
            <BarChart3 size={16} />
            <select
              aria-label='Analytics time period'
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
        )}
      </header>
      <nav className='analytics-tabs' aria-label='Analytics views'>
        <Link to='/analytics' aria-current={tab === 'overview' ? 'page' : undefined}>
          <BarChart3 size={17} />
          Overview
        </Link>
        <Link to='/analytics?tab=visitors' aria-current={tab === 'visitors' ? 'page' : undefined}>
          <Users size={17} />
          Visitors<span>{number(visitors.unique)}</span>
        </Link>
        <Link
          to={`/analytics?tab=scans${codeId ? `&qrCode=${encodeURIComponent(codeId)}` : ''}`}
          aria-current={tab === 'scans' ? 'page' : undefined}
        >
          <MousePointer2 size={17} />
          Scan details<span>{number(scans.length)}</span>
        </Link>
      </nav>
      {error ? (
        <div className='empty-state'>
          <h2>Insights couldn’t be loaded.</h2>
          <p>{error.message}</p>
          <button className='btn btn-secondary' onClick={() => refresh()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {tab === 'overview' ? (
            <>
              <section className='metrics-grid'>
                <div className='metric-card'>
                  <div>
                    <span>Scans in this period</span>
                    <strong>{loading ? '—' : number(total)}</strong>
                    <small>Across the last {days} days</small>
                  </div>
                  <span className='metric-icon'>
                    <MousePointer2 size={21} />
                  </span>
                </div>
                <div className='metric-card'>
                  <div>
                    <span>All-time scans</span>
                    <strong>{loading ? '—' : number(scans.length)}</strong>
                    <small>Every recorded connection</small>
                  </div>
                  <span className='metric-icon metric-peach'>
                    <ArrowUpRight size={22} />
                  </span>
                </div>
                <div className='metric-card'>
                  <div>
                    <span>QR codes with scans</span>
                    <strong>
                      {loading ? '—' : number(codes.filter((c) => counts[c._id]).length)}
                    </strong>
                    <small>Codes making connections</small>
                  </div>
                  <span className='metric-icon metric-lilac'>
                    <QrCode size={21} />
                  </span>
                </div>
              </section>
              <section
                className='panel'
                style={{ padding: 24, marginBottom: 24 }}
                aria-label='Visitor metrics'
              >
                <h2>Returning browsers</h2>
                <p>
                  {number(visitors.unique)} recognized browsers · {number(visitors.repeats)} repeat
                  scans · {number(visitors.unrecognized)} unrecognized scans
                </p>
                <p className='muted small'>
                  All-time across your QR codes. Browsers are not unique people; clearing cookies or
                  changing devices creates a new identity. Fingerprints are estimates and do not
                  merge recognized browsers.
                </p>
              </section>
              <section className='panel chart-panel'>
                <div className='section-heading'>
                  <div>
                    <h2>Scans over time</h2>
                    <p className='muted small'>A daily view of your connections.</p>
                  </div>
                  <span className='pill'>
                    <span className='live-dot' /> Recorded scans
                  </span>
                </div>
                <div
                  className='chart'
                  role='img'
                  aria-label={`${total} scans in the last ${days} days. ${buckets.map((b) => `${b.label}: ${b.count}`).join('; ')}`}
                >
                  <div className='chart-axis'>
                    <span>{max}</span>
                    <span>{Math.round(max / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className='chart-bars'>
                    {buckets.map((bucket, i) => (
                      <div className='chart-column' key={bucket.label}>
                        <div className='chart-bar-space'>
                          <div
                            title={`${bucket.label}: ${bucket.count} scans`}
                            className='chart-bar'
                            style={{
                              height: bucket.count
                                ? `${Math.max((bucket.count / max) * 100, 2)}%`
                                : '2px',
                              opacity: bucket.count ? 1 : 0.18,
                            }}
                          />
                        </div>
                        <span>{i % Math.ceil(days / 7) === 0 ? bucket.label : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {total === 0 && (
                  <p className='chart-note'>
                    Your first scan will show up here. Share a QR code to get things moving.
                  </p>
                )}
              </section>
              <div className='analytics-grid'>
                <section className='panel'>
                  <div className='section-heading'>
                    <h2>Your top connections</h2>
                    <QrCode size={18} />
                  </div>
                  {codes.length ? (
                    <div className='ranking-list'>
                      {[...codes]
                        .sort((a, b) => (counts[b._id] || 0) - (counts[a._id] || 0))
                        .slice(0, 5)
                        .map((code, i) => (
                          <div key={code._id}>
                            <span className='rank-number'>{String(i + 1).padStart(2, '0')}</span>
                            <strong>{codeName(code)}</strong>
                            <span>{number(counts[code._id] || 0)} scans</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className='small-empty'>
                      <QrCode size={25} />
                      <p>Your codes will appear here.</p>
                    </div>
                  )}
                </section>
                <section className='panel'>
                  <div className='section-heading'>
                    <h2>Where scans come from</h2>
                    <Globe2 size={18} />
                  </div>
                  {Object.keys(countries).length ? (
                    <div className='ranking-list'>
                      {Object.entries(countries)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([country, count]) => (
                          <div key={country}>
                            <Globe2 size={17} />
                            <strong>
                              {country === 'Unknown' ? 'Location unavailable' : country}
                            </strong>
                            <span>{number(count)} scans</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className='small-empty'>
                      <Globe2 size={25} />
                      <p>A world of connections, waiting to happen.</p>
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : tab === 'visitors' ? (
            <VisitorTable scans={scans} codes={codes} loading={loading} refresh={refresh} />
          ) : (
            <ScanTable
              scans={scans}
              codes={codes}
              loading={loading}
              refresh={refresh}
              codeId={codeId}
              onCodeChange={setCodeId}
              visitorId={visitorId}
              onVisitorChange={setVisitorId}
              onClearFilters={() => setParams({ tab: 'scans' })}
            />
          )}
          <p className='muted small analytics-note'>
            Counts represent recorded requests, including repeat visits and test scans. Locations
            are approximate and may be unavailable. Insights refresh every minute.
          </p>
        </>
      )}
    </>
  )
}
