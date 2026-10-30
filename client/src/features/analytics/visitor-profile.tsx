import { useState, type FormEvent } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Fingerprint,
  Globe2,
  Monitor,
  ShieldCheck,
} from 'lucide-react'
import { Modal } from '../../components/modal'
import { api } from '../../lib/api'
import { codeName, number, productName } from '../../lib/format'
import type { BrowserMetrics, Scan } from '../../lib/types'

const shown = (value: unknown) =>
  value === undefined || value === null || value === '' ? 'Not available' : String(value)
export function VisitorProfile({
  id,
  basis,
  onClose,
}: {
  id: string
  basis: 'visitor' | 'fingerprint'
  onClose: () => void
}) {
  const client = useQueryClient()
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  async function saveName(event: FormEvent) {
    event.preventDefault()
    setNameBusy(true)
    setNameError('')
    setNameSaved(false)
    try {
      await api.renameVisitor(id, nameDraft ?? profile.data?.name ?? '')
      await Promise.all([
        client.invalidateQueries({ queryKey: ['visitor-profile', 'visitor', id] }),
        client.invalidateQueries({ queryKey: ['scans'] }),
      ])
      setNameDraft(null)
      setNameSaved(true)
    } catch (error) {
      setNameError((error as Error).message)
    } finally {
      setNameBusy(false)
    }
  }
  const [assignCodeId, setAssignCodeId] = useState('')
  const [assignProductId, setAssignProductId] = useState('')
  const [assignmentBusy, setAssignmentBusy] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [assignmentSaved, setAssignmentSaved] = useState(false)
  const profile = useQuery({
    queryKey: ['visitor-profile', basis, id],
    queryFn: () => api.visitorProfile(id, basis),
    staleTime: 0,
  })
  const codes = useQuery({ queryKey: ['codes'], queryFn: ({ signal }) => api.codes(signal) })
  const products = useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => api.products(signal),
  })
  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: ({ signal }) => api.campaigns(signal),
  })
  const assignedCodes = (codes.data || []).filter((code) => code.visitorTarget?.visitorId === id)
  const selectedCode = codes.data?.find((code) => code._id === assignCodeId)
  async function assign(event: FormEvent) {
    event.preventDefault()
    setAssignmentBusy(true)
    setAssignmentError('')
    setAssignmentSaved(false)
    try {
      await api.editCode(assignCodeId, {
        visitorTarget: { visitorId: id, productId: assignProductId },
      })
      await client.invalidateQueries({ queryKey: ['codes'] })
      setAssignmentSaved(true)
    } catch (error) {
      setAssignmentError((error as Error).message)
    } finally {
      setAssignmentBusy(false)
    }
  }
  const data = profile.data
  const browser = data?.latestSignals.browser as BrowserMetrics | undefined
  const server = data?.latestSignals.server as NonNullable<Scan['data']>['fingerprintData']
  const referenceName = (kind: 'qrCodes' | 'products' | 'campaigns', value: string) => {
    if (kind === 'qrCodes') {
      const code = codes.data?.find((item) => item._id === value)
      return code ? codeName(code) : `QR code · ${value.slice(-6)}`
    }
    if (kind === 'products') {
      const product = products.data?.find((item) => item._id === value)
      return product ? productName(product) : `Product · ${value.slice(-6)}`
    }
    return (
      campaigns.data?.find((item) => item._id === value)?.name || `Campaign · ${value.slice(-6)}`
    )
  }
  return (
    <Modal
      title={basis === 'visitor' ? 'Visitor profile' : 'Estimated fingerprint group'}
      wide
      onClose={onClose}
    >
      <div className='visitor-profile'>
        <div className='visitor-profile-intro'>
          <span className='visitor-avatar large' aria-hidden='true'>
            {basis === 'visitor' ? id.slice(0, 2).toUpperCase() : <Fingerprint size={26} />}
          </span>
          <div>
            <h3>
              {basis === 'visitor'
                ? data?.name || `Visitor ${id.slice(0, 6).toUpperCase()}`
                : 'Similar browser signals'}
            </h3>
            <p>
              {basis === 'visitor'
                ? 'Activity from one recognized browser across your QR codes.'
                : 'These records may belong to different people and are not merged identities.'}
            </p>
            <span
              className={`visitor-badge ${basis === 'visitor' ? 'is-returning' : 'is-estimated'}`}
            >
              <ShieldCheck size={12} />
              {basis === 'visitor' ? 'Recognized browser' : 'Estimated match'}
            </span>
          </div>
        </div>
        {profile.isPending && (
          <div className='visitor-profile-loading' role='status'>
            <span />
            Loading visitor activity…
          </div>
        )}
        {profile.error && (
          <div className='visitor-profile-error' role='alert'>
            <p>We couldn’t load this profile. {profile.error.message}</p>
            <button className='btn btn-secondary' onClick={() => profile.refetch()}>
              Try again
            </button>
          </div>
        )}
        {data && (
          <>
            {basis === 'visitor' && (
              <form className='visitor-name-editor' onSubmit={saveName}>
                <label className='field'>
                  <span>Visitor name</span>
                  <input
                    aria-label='Visitor name'
                    maxLength={120}
                    value={nameDraft ?? data.name ?? ''}
                    placeholder='e.g. Alex — event guest'
                    onChange={(event) => {
                      setNameDraft(event.target.value)
                      setNameSaved(false)
                    }}
                  />
                </label>
                <button className='btn btn-secondary' disabled={nameBusy}>
                  {nameBusy ? 'Saving…' : 'Save visitor name'}
                </button>
                <p className='form-hint'>
                  A private label for your account. Leave blank to remove it. This does not verify
                  the visitor’s identity.
                </p>
                {nameError && <p role='alert'>{nameError}</p>}
                {nameSaved && <p role='status'>Visitor name saved.</p>}
              </form>
            )}
            <div className='visitor-profile-metrics'>
              {[
                {
                  label: 'Total scans',
                  value: data.counters.totalScans,
                  icon: <Activity size={17} />,
                },
                {
                  label: 'Active days · UTC',
                  value: data.counters.activeDaysUTC,
                  icon: <CalendarDays size={17} />,
                },
                {
                  label: 'Last 7 days',
                  value: data.counters.scansLast7Days,
                  icon: <ArrowUpRight size={17} />,
                },
                {
                  label: 'QR codes shown',
                  value: data.activity.qrCodes.length,
                  icon: <Globe2 size={17} />,
                },
              ].map((metric) => (
                <div key={metric.label}>
                  {metric.icon}
                  <strong>{number(metric.value)}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            {basis === 'visitor' && (
              <section
                className='visitor-profile-section visitor-target-editor'
                aria-label='Personalized QR codes'
              >
                <h3>Personalized QR codes</h3>
                <p className='form-hint'>
                  Choose a QR and a product for this browser. Other visitors keep seeing that QR’s
                  default product or campaign.
                </p>
                {assignedCodes.length > 0 && (
                  <ul className='visitor-assignment-list'>
                    {assignedCodes.map((code) => (
                      <li key={code._id}>
                        <strong>{codeName(code)}</strong>
                        <span>
                          {products.data?.find(
                            (product) => product._id === code.visitorTarget?.productId,
                          )?.name || 'Assigned product'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={assign}>
                  <label>
                    QR code
                    <select
                      aria-label='QR code to personalize'
                      required
                      value={assignCodeId}
                      disabled={assignmentBusy}
                      onChange={(event) => {
                        setAssignCodeId(event.target.value)
                        setAssignmentSaved(false)
                      }}
                    >
                      <option value=''>Choose one of your QR codes</option>
                      {codes.data?.filter(code => !code.game).map((code) => (
                        <option key={code._id} value={code._id}>
                          {codeName(code)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Product for this browser
                    <select
                      aria-label='Personalized product'
                      required
                      value={assignProductId}
                      disabled={assignmentBusy}
                      onChange={(event) => {
                        setAssignProductId(event.target.value)
                        setAssignmentSaved(false)
                      }}
                    >
                      <option value=''>Choose a product</option>
                      {products.data?.map((product) => (
                        <option key={product._id} value={product._id}>
                          {productName(product)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedCode?.visitorTarget && selectedCode.visitorTarget.visitorId !== id && (
                    <p className='form-hint'>
                      This QR is personalized for another browser. Saving replaces that assignment;
                      its default target stays the same.
                    </p>
                  )}
                  {assignmentError && (
                    <p className='form-error' role='alert'>
                      {assignmentError}
                    </p>
                  )}
                  {assignmentSaved && <p role='status'>QR code personalized for this visitor.</p>}
                  <button
                    className='btn btn-primary'
                    disabled={assignmentBusy || !assignCodeId || !assignProductId}
                  >
                    {assignmentBusy ? 'Saving…' : 'Assign visitor product'}
                    <ArrowUpRight size={15} />
                  </button>
                </form>
                <p className='form-hint'>
                  Manage or remove this assignment in the QR editor. Cookies identify this browser;
                  a similar fingerprint alone will not receive the product.
                </p>
              </section>
            )}
            <div className='visitor-profile-dates'>
              <div>
                <span>First seen</span>
                <strong>{new Date(data.firstSeen).toLocaleString()}</strong>
              </div>
              <div>
                <span>Last seen</span>
                <strong>{new Date(data.lastSeen).toLocaleString()}</strong>
              </div>
            </div>
            <section className='visitor-profile-section'>
              <div className='visitor-section-title'>
                <Monitor size={17} />
                <h3>Last observed browser</h3>
              </div>
              <dl className='visitor-signal-grid'>
                {[
                  [
                    'Browser & OS',
                    [server?.ua?.browser?.name, server?.ua?.os?.name].filter(Boolean).join(' · '),
                  ],
                  ['Language', browser?.language || server?.language],
                  ['Timezone', browser?.timezone],
                  [
                    'Approximate IP location',
                    [server?.geo?.city, server?.geo?.country].filter(Boolean).join(', '),
                  ],
                  [
                    'Viewport',
                    browser?.viewportWidth && browser.viewportHeight
                      ? `${browser.viewportWidth} × ${browser.viewportHeight}`
                      : undefined,
                  ],
                  [
                    'Connection',
                    browser?.effectiveType
                      ? `${browser.effectiveType}${browser.saveData ? ' · Data saver' : ''}`
                      : undefined,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{shown(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {(['qrCodes', 'products', 'campaigns'] as const).map((kind) => (
              <section key={kind} className='visitor-profile-section'>
                <div className='visitor-section-title'>
                  <Activity size={17} />
                  <h3>
                    {kind === 'qrCodes'
                      ? 'QR code activity'
                      : kind === 'products'
                        ? 'Product activity'
                        : 'Campaign activity'}
                  </h3>
                  <span>{data.activity[kind].length}</span>
                </div>
                {data.activity[kind].length ? (
                  <div className='visitor-activity-scroll'>
                    <table className='visitor-activity-table'>
                      <caption className='sr-only'>{kind} visited by this browser</caption>
                      <thead>
                        <tr>
                          <th scope='col'>Name</th>
                          <th scope='col'>Scans</th>
                          <th scope='col'>Last seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.activity[kind].map((item) => (
                          <tr key={item.id}>
                            <th scope='row' title={item.id}>
                              {referenceName(kind, item.id)}
                            </th>
                            <td>{number(item.scans)}</td>
                            <td>{new Date(item.lastSeen).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className='visitor-inline-empty'>
                    No {kind === 'products' ? 'product' : 'campaign'} activity recorded yet.
                  </p>
                )}
              </section>
            ))}
            {data.activity.sources.length > 0 && (
              <section className='visitor-profile-section'>
                <h3>Where scans came from</h3>
                <div className='visitor-source-list'>
                  {data.activity.sources.map((item) => (
                    <span key={item.source}>
                      {item.source}
                      <strong>{number(item.scans)}</strong>
                    </span>
                  ))}
                </div>
              </section>
            )}
            <details className='visitor-technical'>
              <summary>
                <Fingerprint size={16} />
                Technical data & identity evidence<span>Advanced</span>
              </summary>
              <p>
                Browser signals are self-reported. Fingerprint groups are estimates, and a browser
                is not a verified person.
              </p>
              <pre>
                {JSON.stringify(
                  {
                    identityEvidence: data.identityEvidence,
                    latestSignals: data.latestSignals,
                    counters: data.counters,
                    activity: data.activity,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            <p className='visitor-footnote'>
              <ShieldCheck size={15} />
              {basis === 'visitor'
                ? 'Cookies identify a browser. Shared devices, cleared cookies and private sessions can change recognition.'
                : 'Similar fingerprints can include different people. Use this group as evidence, not proof of identity.'}
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
