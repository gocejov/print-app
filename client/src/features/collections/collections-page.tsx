import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers3, Pencil, Plus, QrCode, Search, Shuffle, Trash2 } from 'lucide-react'
import { useAssets } from '../assets/use-assets'
import { useCollections } from './use-collections'
import { CollectionEditor } from './collection-editor'
import { Modal } from '../../components/modal'
import { api } from '../../lib/api'
import type { Campaign, Category } from '../../lib/types'
import { campaignProducts, productName } from '../../lib/format'
import { useToast } from '../../app/providers'

export function CategoriesPage() {
  return <CollectionsPage kind='category' />
}
export function CampaignsPage() {
  return <CollectionsPage kind='campaign' />
}
function CollectionsPage({ kind }: { kind: 'category' | 'campaign' }) {
  const campaign = kind === 'campaign'
  const collections = useCollections(),
    assets = useAssets()
  const [editor, setEditor] = useState<Category | Campaign | 'new'>()
  const [deleting, setDeleting] = useState<Category | Campaign>()
  const [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false)
  const navigate = useNavigate(),
    toast = useToast()
  const items = (campaign ? collections.campaigns : collections.categories).filter((item) =>
    `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()),
  )
  function uses(item: Category | Campaign) {
    return campaign
      ? assets.codes.filter(
          (code) =>
            (typeof code.campaign === 'object' ? code.campaign?._id : code.campaign) === item._id,
        ).length
      : collections.campaigns.filter((c) =>
          c.entries.some((entry) => entry.kind === 'category' && entry.target === item._id),
        ).length
  }
  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      if (campaign) await api.deleteCampaign(deleting._id)
      else await api.deleteCategory(deleting._id)
      await collections.refresh()
      setDeleting(undefined)
      toast(`${campaign ? 'Campaign' : 'Category'} deleted. Its products are preserved.`)
    } catch (e) {
      toast((e as Error).message, true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>
            {campaign ? 'ONE CODE. A WHOLE COLLECTION.' : 'GIVE YOUR PRODUCTS SOME ORDER'}
          </div>
          <h1>
            {campaign ? 'Campaigns' : 'Categories'}
            <span className='heading-dot'>.</span>
          </h1>
          <p>
            {campaign
              ? 'Combine products and categories. Let each scan discover something different.'
              : 'Group products into reusable lists and arrange them your way.'}
          </p>
        </div>
        <button className='btn btn-primary' onClick={() => setEditor('new')}>
          <Plus size={18} />
          Create {kind}
        </button>
      </header>
      <div className='workflow-strip'>
        {campaign ? <Shuffle size={18} /> : <Layers3 size={18} />}
        <span className='current'>{campaign ? 'Random display' : 'Reusable product lists'}</span>
        <p>
          {campaign
            ? 'One product per scan, with adjustable weights. Categories expand live; duplicates count once.'
            : 'Arrange products in a category, then include the whole category in a campaign.'}
        </p>
      </div>
      <section className='library-section'>
        <div className='section-heading'>
          <div className='section-heading-label'>
            <h2>{campaign ? 'Your campaigns' : 'Your categories'}</h2>
            <span className='count-badge'>{items.length}</span>
          </div>
          <div className='search-field'>
            <Search size={16} />
            <input
              aria-label={`Search ${campaign ? 'campaigns' : 'categories'}`}
              placeholder='Search…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {collections.error || assets.error ? (
          <div className='empty-state'>
            <h3>Your collections couldn’t load.</h3>
            <p>{collections.error?.message || assets.error?.message}</p>
            <button
              className='btn btn-secondary'
              onClick={() => {
                collections.refresh()
                assets.refresh()
              }}
            >
              Try again
            </button>
          </div>
        ) : collections.loading || assets.loading ? (
          <div className='table-skeleton'>
            <div />
            <div />
          </div>
        ) : !items.length ? (
          <div className='empty-state'>
            <div className='empty-qr'>
              {campaign ? <Shuffle size={32} /> : <Layers3 size={32} />}
            </div>
            <h3>{campaign ? 'Let one code share more.' : 'Make room for a collection.'}</h3>
            <p>
              {campaign
                ? 'Add single products or categories to a campaign, then connect it to a QR code.'
                : 'Create a category and arrange the products you want to keep together.'}
            </p>
            <button className='btn btn-primary' onClick={() => setEditor('new')}>
              <Plus size={17} />
              Create your first {kind}
            </button>
          </div>
        ) : (
          <div className='product-grid'>
            {items.map((item) => {
              const pool =
                'entries' in item
                  ? campaignProducts(item, collections.categories, assets.products)
                  : item.products
                      .map((id) => assets.products.find((product) => product._id === id))
                      .filter(Boolean)
              return (
                <article className='product-card collection-card' key={item._id}>
                  <div className='collection-card-top'>
                    <span className='metric-icon'>
                      {campaign ? <Shuffle size={23} /> : <Layers3 size={23} />}
                    </span>
                    {'status' in item && (
                      <span className={`status-badge ${item.status === 'paused' ? 'paused' : ''}`}>
                        <i />
                        {item.status === 'paused' ? 'Paused' : 'Active'}
                      </span>
                    )}
                  </div>
                  <div className='product-card-body'>
                    <h3>{item.name}</h3>
                    <p>
                      {item.description ||
                        (campaign
                          ? 'A fresh selection with every scan.'
                          : 'Your products, brought together.')}
                    </p>
                    <div className='collection-pool-count'>
                      <strong>{pool.length}</strong>
                      <span>
                        {campaign ? 'distinct eligible products' : 'products in this list'}
                      </span>
                    </div>
                    <ol className='collection-card-products'>
                      {pool.slice(0, 4).map((product) => (
                        <li key={product!._id}>{productName(product!)}</li>
                      ))}
                      {pool.length > 4 && <li className='muted'>+{pool.length - 4} more</li>}
                    </ol>
                    <div className='product-card-meta'>
                      <span>
                        {uses(item)} {campaign ? 'QR codes' : 'campaigns'}
                      </span>
                      <div className='row-actions'>
                        <button
                          className='icon-btn'
                          aria-label={`Edit ${item.name}`}
                          onClick={() => setEditor(item)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className='icon-btn danger-text'
                          aria-label={`Delete ${item.name}`}
                          disabled={uses(item) > 0}
                          title={uses(item) ? 'Remove its references first' : 'Delete'}
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {campaign && (
                      <button
                        className='btn btn-secondary full'
                        disabled={!pool.length}
                        onClick={() => navigate(`/qr-codes?campaignId=${item._id}`)}
                      >
                        <QrCode size={17} />
                        Create QR code
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
      {editor && (
        <CollectionEditor
          kind={kind}
          item={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(undefined)}
          onSaved={collections.refresh}
        />
      )}
      {deleting && (
        <Modal title={`Delete this ${kind}?`} busy={busy} onClose={() => setDeleting(undefined)}>
          <div className='delete-content'>
            <h3>{deleting.name}</h3>
            <p>
              This removes the {kind}, while preserving its products and files. Referenced records
              must be detached first.
            </p>
          </div>
          <div className='modal-actions'>
            <button
              className='btn btn-secondary'
              disabled={busy}
              onClick={() => setDeleting(undefined)}
            >
              Keep {kind}
            </button>
            <button className='btn btn-danger' disabled={busy} onClick={remove}>
              Delete {kind}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
