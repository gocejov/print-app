import { Link } from 'react-router-dom'
import { Modal } from '../../components/modal'
import { codeName, number, productName } from '../../lib/format'
import type { Campaign, Product, QrCode, Scan } from '../../lib/types'

export function VisitorProductHits({
  scans,
  codes,
  campaigns,
  products,
  onClose,
}: {
  scans: Scan[]
  codes: QrCode[]
  campaigns: Campaign[]
  products: Product[]
  onClose: () => void
}) {
  const hits = new Map<
    string,
    { qrCode: string; campaign?: string; product: string; count: number; lastSeen: string }
  >()
  for (const scan of scans) {
    if (!scan.product) continue
    const key = `${scan.qrCode}:${scan.campaign || ''}:${scan.product}`
    const previous = hits.get(key)
    hits.set(key, {
      qrCode: scan.qrCode,
      campaign: scan.campaign,
      product: scan.product,
      count: (previous?.count || 0) + 1,
      lastSeen:
        previous && previous.lastSeen > scan.created_at ? previous.lastSeen : scan.created_at,
    })
  }
  const entries = [...hits.values()].sort(
    (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen),
  )
  const visitor = scans[0]?.data?.visitor
  return (
    <Modal title='Products received' wide onClose={onClose}>
      <div className='visitor-hits-detail'>
        <h3>{visitor?.name || `Visitor ${visitor?.id?.slice(0, 6).toUpperCase()}`}</h3>
        <p className='form-hint'>
          Recorded product selections within the current QR, campaign, and product filters. These
          are QR deliveries, not proof of viewing or clicking the content.
        </p>
        <div className='table-scroll'>
          <table className='codes-table'>
            <caption className='sr-only'>
              Products selected for this visitor within the current filters
            </caption>
            <thead>
              <tr>
                <th>Product selected</th>
                <th>Campaign</th>
                <th>QR code</th>
                <th>Selections</th>
                <th>Last selected</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((hit) => {
                const product = products.find((p) => p._id === hit.product)
                const code = codes.find((c) => c._id === hit.qrCode)
                const campaign = campaigns.find((c) => c._id === hit.campaign)
                const params = new URLSearchParams({
                  tab: 'scans',
                  visitor: visitor?.id || '',
                  qrCode: hit.qrCode,
                  product: hit.product,
                  ...(hit.campaign ? { campaign: hit.campaign } : {}),
                })
                return (
                  <tr key={`${hit.qrCode}:${hit.campaign}:${hit.product}`}>
                    <td>
                      <strong>
                        {product ? productName(product) : `Product · ${hit.product.slice(-6)}`}
                      </strong>
                      <Link to={`/analytics?${params}`} onClick={onClose}>
                        View matching scans →
                      </Link>
                    </td>
                    <td>
                      {hit.campaign
                        ? campaign?.name || `Campaign · ${hit.campaign.slice(-6)}`
                        : 'Direct or visitor target'}
                    </td>
                    <td>{code ? codeName(code) : `QR · ${hit.qrCode.slice(-6)}`}</td>
                    <td>{number(hit.count)}</td>
                    <td>{new Date(hit.lastSeen).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!entries.length && <p>No product was recorded for these scans.</p>}
        {scans.some((scan) => !scan.product) && (
          <p className='form-hint'>
            {number(scans.filter((scan) => !scan.product).length)} scans without a product
            selection, such as game entries, are excluded from this breakdown.
          </p>
        )}
      </div>
    </Modal>
  )
}
