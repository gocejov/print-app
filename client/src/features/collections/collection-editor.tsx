import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, Layers3, Package, Search, Shuffle, X } from 'lucide-react'
import { Modal } from '../../components/modal'
import { useAssets } from '../assets/use-assets'
import { useCollections } from './use-collections'
import { api } from '../../lib/api'
import { campaignProducts, productName } from '../../lib/format'
import type { Campaign, CampaignEntry, Category } from '../../lib/types'
import { useToast } from '../../app/providers'

type Props = {
  kind: 'category' | 'campaign'
  item?: Category | Campaign
  onClose: () => void
  onSaved: () => Promise<unknown>
}
export function CollectionEditor({ kind, item, onClose, onSaved }: Props) {
  const campaign = kind === 'campaign'
  const assets = useAssets(),
    collections = useCollections()
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [entries, setEntries] = useState<CampaignEntry[]>(
    item
      ? 'entries' in item
        ? item.entries
        : item.products.map((target) => ({ kind: 'product', target }))
      : [],
  )
  const [status, setStatus] = useState<Campaign['status']>(
    item && 'status' in item ? item.status : 'active',
  )
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(
    item && 'entries' in item ? (item.productWeights || []).map((entry) => [entry.product, entry.weight]) : [],
  ))
  const [tab, setTab] = useState<'product' | 'category'>('product')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const toast = useToast()
  const label = (entry: CampaignEntry) =>
    entry.kind === 'product'
      ? productName(
          assets.products.find((product) => product._id === entry.target) || {
            _id: entry.target,
            file: null,
            url: '',
            created_at: '',
          },
        )
      : collections.categories.find((category) => category._id === entry.target)?.name ||
        'Unavailable category'
  const pool = campaignProducts({ entries } as Campaign, collections.categories, assets.products)
  const totalWeight = pool.reduce((sum, product) => sum + (weights[product._id] ?? 1), 0)
  const choices =
    tab === 'category'
      ? collections.categories.map((category) => ({
          kind: 'category' as const,
          target: category._id,
          name: category.name,
          detail: `${category.products.length} products`,
        }))
      : assets.products.map((product) => ({
          kind: 'product' as const,
          target: product._id,
          name: productName(product),
          detail: 'Product',
        }))
  function toggle(entry: CampaignEntry) {
    setEntries((current) =>
      current.some((item) => item.kind === entry.kind && item.target === entry.target)
        ? current.filter((item) => item.kind !== entry.kind || item.target !== entry.target)
        : [...current, entry],
    )
  }
  function move(index: number, direction: number) {
    setEntries((current) => {
      const copy = [...current]
      ;[copy[index], copy[index + direction]] = [copy[index + direction], copy[index]]
      return copy
    })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (campaign)
        await api.saveCampaign({ name, description, entries, status, rule: 'random',
          productWeights: pool.filter((product) => (weights[product._id] ?? 1) !== 1)
            .map((product) => ({ product: product._id, weight: weights[product._id] })),
        }, item?._id)
      else
        await api.saveCategory(
          { name, description, products: entries.map((entry) => entry.target) },
          item?._id,
        )
      await onSaved()
      toast(`${campaign ? 'Campaign' : 'Category'} ${item ? 'updated' : 'created'}.`)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`${item ? 'Edit' : 'Create'} ${campaign ? 'campaign' : 'category'}`}
      wide
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className='collection-editor-body'>
          <div className='workflow-note'>
            {campaign ? <Shuffle size={20} /> : <Layers3 size={20} />}
            <p>
              {campaign
                ? 'Add products or entire categories. Each scan randomly displays one distinct eligible product. Adjust product weights to show some products more often.'
                : 'Group your products and arrange their list. Add this category to a campaign to include its current products.'}
            </p>
          </div>
          <div className='form-row'>
            <label>
              {campaign ? 'Campaign name' : 'Category name'}
              <input
                aria-label={campaign ? 'Campaign name' : 'Category name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                autoFocus
              />
            </label>
            {campaign && (
              <label>
                Campaign status
                <select
                  aria-label='Campaign status'
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Campaign['status'])}
                >
                  <option value='active'>Active</option>
                  <option value='paused'>Paused</option>
                </select>
              </label>
            )}
          </div>
          <label>
            Description
            <textarea
              aria-label='Collection description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder='Optional context for your workspace.'
            />
          </label>
          {campaign && (
            <div className='campaign-rule'>
              <Shuffle size={17} />
              <strong>Random display</strong>
              <span>{pool.length} distinct eligible products · one per scan</span>
            </div>
          )}
          <div className='collection-columns'>
            <section className='collection-picker'>
              <h3>{campaign ? 'Add to campaign' : 'Choose products'}</h3>
              {campaign && (
                <div className='tabs'>
                  <button
                    type='button'
                    className={tab === 'product' ? 'selected' : ''}
                    onClick={() => {
                      setTab('product')
                      setSearch('')
                    }}
                  >
                    Products
                  </button>
                  <button
                    type='button'
                    className={tab === 'category' ? 'selected' : ''}
                    onClick={() => {
                      setTab('category')
                      setSearch('')
                    }}
                  >
                    Categories
                  </button>
                </div>
              )}
              <div className='search-field'>
                <Search size={15} />
                <input
                  aria-label='Search collection items'
                  placeholder='Search…'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className='collection-choices'>
                {choices
                  .filter((choice) => choice.name.toLowerCase().includes(search.toLowerCase()))
                  .map((choice) => (
                    <label className='collection-choice' key={`${choice.kind}:${choice.target}`}>
                      <input
                        type='checkbox'
                        aria-label={`Include ${choice.name}`}
                        checked={entries.some(
                          (entry) => entry.kind === choice.kind && entry.target === choice.target,
                        )}
                        onChange={() => toggle({ kind: choice.kind, target: choice.target })}
                      />
                      {choice.kind === 'category' ? <Layers3 size={16} /> : <Package size={16} />}
                      <span>
                        <strong>{choice.name}</strong>
                        <small>{choice.detail}</small>
                      </span>
                    </label>
                  ))}
              </div>
              {!choices.length && (
                <p className='form-hint'>
                  Nothing here yet.{' '}
                  <Link to={tab === 'category' ? '/categories' : '/products'} onClick={onClose}>
                    Create {tab === 'category' ? 'a category' : 'a product'} first.
                  </Link>
                </p>
              )}
            </section>
            <section className='collection-selected'>
              <h3>
                {campaign ? 'Campaign entries' : 'Product order'}{' '}
                <span className='count-badge'>{entries.length}</span>
              </h3>
              <p>
                {campaign
                  ? 'Category contents stay live. Duplicate products count once.'
                  : 'Use the arrows to arrange this category’s product list.'}
              </p>
              <ol>
                {entries.map((entry, index) => (
                  <li key={`${entry.kind}:${entry.target}`}>
                    <span className='entry-index'>{index + 1}</span>
                    <div>
                      <strong>{label(entry)}</strong>
                      <small>{entry.kind === 'category' ? 'Category' : 'Product'}</small>
                    </div>
                    <div className='entry-actions'>
                      <button
                        type='button'
                        className='icon-btn'
                        aria-label={`Move ${label(entry)} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type='button'
                        className='icon-btn'
                        aria-label={`Move ${label(entry)} down`}
                        disabled={index === entries.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type='button'
                        className='icon-btn'
                        aria-label={`Remove ${label(entry)}`}
                        onClick={() => toggle(entry)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              {!entries.length && (
                <p className='collection-empty'>Select items from the list to get started.</p>
              )}
            </section>
          </div>
          {campaign && pool.length > 0 && (
            <section className='campaign-weights'>
              <h3>Product weights</h3>
              <p className='form-hint'>All products start at 1. A weight of 3 gets three times the chance of a weight of 1. Category products appear once; new products start at 1.</p>
              <button type='button' className='btn btn-secondary' onClick={() => setWeights({})}>Reset to equal weights</button>
              <div className='campaign-weight-list'>
                {pool.map((product) => (
                  <label className='campaign-weight-row' key={product._id}>
                    <span>{productName(product)}</span>
                    <input type='number' min={1} max={1000} step={1} required
                      aria-label={`Weight for ${productName(product)}`}
                      value={weights[product._id] ?? 1}
                      onChange={(event) => setWeights((current) => ({ ...current, [product._id]: Number(event.target.value) }))} />
                    <small>{totalWeight > 0 ? (((weights[product._id] ?? 1) / totalWeight) * 100).toFixed(1) : '0'}% chance</small>
                  </label>
                ))}
              </div>
            </section>
          )}
          {campaign && !pool.length && (
            <p className='form-hint'>
              You can save an empty campaign while organizing it. Add an eligible product before
              assigning it to a QR code.
            </p>
          )}
          {(error || assets.error || collections.error) && (
            <div className='form-error' role='alert'>
              {error || assets.error?.message || collections.error?.message}
            </div>
          )}
        </div>
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            disabled={busy || assets.loading || collections.loading}
          >
            {busy ? 'Saving…' : `${item ? 'Save' : 'Create'} ${campaign ? 'campaign' : 'category'}`}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  )
}
