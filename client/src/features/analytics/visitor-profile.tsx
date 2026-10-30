import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/modal'
import { api } from '../../lib/api'

export function VisitorProfile({
  id,
  basis,
  onClose,
}: {
  id: string
  basis: 'visitor' | 'fingerprint'
  onClose: () => void
}) {
  const profile = useQuery({
    queryKey: ['visitor-profile', basis, id],
    queryFn: () => api.visitorProfile(id, basis),
    staleTime: 0,
  })
  const data = profile.data
  return (
    <Modal
      title={basis === 'visitor' ? 'Visitor profile' : 'Estimated fingerprint group'}
      wide
      onClose={onClose}
    >
      <div className='scan-details'>
        <p className='muted small'>
          {basis === 'visitor'
            ? 'Combined activity for one recognized browser across your QR codes.'
            : 'Similar browser signals may belong to different people. These records are not merged identities.'}
        </p>
        {profile.isPending && <p role='status'>Loading profile…</p>}
        {profile.error && <p role='alert'>{profile.error.message}</p>}
        {data && (
          <>
            <p>
              <strong>{data.counters.totalScans} scans</strong> · {data.counters.repeatScans}{' '}
              additional scans · {data.counters.activeDaysUTC} active days (UTC)
            </p>
            <p>
              {data.counters.scansTodayUTC} scans today (UTC) · {data.counters.scansLast7Days} scans
              in the last 7 days
            </p>
            <p className='small'>
              First seen: {new Date(data.firstSeen).toLocaleString()}
              <br />
              Last seen: {new Date(data.lastSeen).toLocaleString()}
            </p>
            <p className='small'>
              {data.identityEvidence.matchedVisitorCount} recognized browser IDs ·{' '}
              {data.identityEvidence.fingerprintCount} fingerprint variants
            </p>
            {(['qrCodes', 'products', 'campaigns'] as const).map((kind) => (
              <section key={kind}>
                <h3>
                  {kind === 'qrCodes'
                    ? 'QR code activity'
                    : kind === 'products'
                      ? 'Product activity'
                      : 'Campaign activity'}
                </h3>
                {data.activity[kind].length ? (
                  <table className='scan-field-table'>
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Scans</th>
                        <th>Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.activity[kind].map((item) => (
                        <tr key={item.id}>
                          <th scope='row'>{item.id}</th>
                          <td>{item.scans}</td>
                          <td>{new Date(item.lastSeen).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className='muted small'>No activity recorded.</p>
                )}
              </section>
            ))}
            <details>
              <summary>Observed browser and request signals</summary>
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {JSON.stringify(data.latestSignals, null, 2)}
              </pre>
            </details>
            <details>
              <summary>Identity evidence and source counters</summary>
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {JSON.stringify(
                  { identityEvidence: data.identityEvidence, sources: data.activity.sources },
                  null,
                  2,
                )}
              </pre>
            </details>
            <p className='muted small'>{data.limitations}</p>
          </>
        )}
      </div>
    </Modal>
  )
}
