import { useCollections } from '../collections/use-collections'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, Pencil, Plus, QrCode, Search, Trash2 } from 'lucide-react'
import type { Product } from '../../lib/types'
import { fileName, productFile, productName, typeLabel } from '../../lib/format'
import { api } from '../../lib/api'
import { useToast } from '../../app/providers'
import { Modal } from '../../components/modal'
import { useAssets } from './use-assets'
import { ProductEditor } from './product-editor'
import { FileIcon, FilePreview } from './file-preview'

export function ProductsPage() {
  const assets = useAssets()
  const collections = useCollections()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editor, setEditor] = useState<Product | 'new'>()
  const [initialFile, setInitialFile] = useState<string>()
  const [deleting, setDeleting] = useState<Product>()
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  useEffect(() => {
    const id = params.get('fileId')
    if (id) {
      setInitialFile(id)
      setEditor('new')
      setParams({}, { replace: true })
    }
  }, [params, setParams])
  const filtered = assets.products
    .filter(
      (product) =>
        !categoryFilter ||
        collections.categories
          .find((category) => category._id === categoryFilter)
          ?.products.includes(product._id),
    )
    .filter((product) =>
      `${productName(product)} ${product.description || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  const uses = (product: Product) =>
    assets.codes.filter(
      (code) =>
        (typeof code.product === 'object' ? code.product?._id : code.product) === product._id ||
        code.visitorTarget?.productId === product._id,
    ).length +
    collections.categories.filter((category) => category.products.includes(product._id)).length +
    collections.campaigns.filter((campaign) =>
      campaign.entries.some((entry) => entry.kind === 'product' && entry.target === product._id),
    ).length
  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await api.deleteProduct(deleting._id)
      await assets.refresh()
      setDeleting(undefined)
      toast('Product deleted. Its file stays in your library.')
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
          <div className='eyebrow'>02 / ORGANIZE WHAT YOU SHARE</div>
          <h1>
            Products<span className='heading-dot'>.</span>
          </h1>
          <p>Attach a file to a product, then assign that product to a QR code.</p>
        </div>
        <button
          className='btn btn-primary'
          onClick={() => {
            setInitialFile(undefined)
            setEditor('new')
          }}
        >
          <Plus size={18} />
          Create product
        </button>
      </header>
      <div className='workflow-strip'>
        <span>Files</span>
        <i>→</i>
        <span className='current'>
          <Package size={16} />
          Products
        </span>
        <i>→</i>
        <span>QR codes</span>
        <p>A reusable home for the content you share.</p>
      </div>
      <section className='library-section'>
        <div className='section-heading'>
          <div className='section-heading-label'>
            <h2>Your products</h2>
            <span className='count-badge'>{assets.products.length}</span>
          </div>
          <div className='search-field'>
            <Search size={16} />
            <input
              aria-label='Search products'
              placeholder='Search products…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className='library-toolbar'>
          <label className='select-control'>
            Category
            <select
              aria-label='Filter products by category'
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value=''>All products</option>
              {collections.categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {assets.error || collections.error ? (
          <div className='empty-state'>
            <h3>Products couldn’t load.</h3>
            <p>{assets.error?.message || collections.error?.message}</p>
            <button className='btn btn-secondary' onClick={() => assets.refresh()}>
              Try again
            </button>
          </div>
        ) : assets.loading || collections.loading ? (
          <div className='table-skeleton'>
            <div />
            <div />
          </div>
        ) : filtered.length ? (
          <div className='product-grid'>
            {filtered.map((product) => {
              const file = productFile(product)
              return (
                <article className='product-card' key={product._id}>
                  <div className='product-art'>
                    {file ? <FilePreview file={file} compact /> : <Package size={40} />}
                  </div>
                  <div className='product-card-body'>
                    <span className='type-label'>
                      {file && (
                        <>
                          <FileIcon type={file.type} size={14} />
                          {typeLabel(file.type)}
                        </>
                      )}
                    </span>
                    <h3>{productName(product)}</h3>
                    <p>{product.description || 'Ready to share through your QR codes.'}</p>
                    {product.displayMode === 'page' && (
                      <span className='type-label'>
                        Product page · {(product.mediaIds || []).length} additional media
                      </span>
                    )}
                    <div className='category-chips'>
                      {collections.categories
                        .filter((category) => category.products.includes(product._id))
                        .map((category) => (
                          <span key={category._id}>{category.name}</span>
                        ))}
                    </div>
                    <div className='product-attachment'>
                      <span>Attached file</span>
                      <strong>{file ? fileName(file) : 'File unavailable'}</strong>
                    </div>
                    <div className='product-card-meta'>
                      <span>{uses(product)} references</span>
                      <div className='row-actions'>
                        <button
                          className='icon-btn'
                          aria-label={`Edit ${productName(product)}`}
                          onClick={() => setEditor(product)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className='icon-btn danger-text'
                          aria-label={`Delete ${productName(product)}`}
                          disabled={uses(product) > 0}
                          title={
                            uses(product)
                              ? 'Remove category, campaign and QR references before deleting'
                              : 'Delete product'
                          }
                          onClick={() => setDeleting(product)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <button
                      className='btn btn-secondary full'
                      disabled={!file}
                      onClick={() => navigate(`/qr-codes?productId=${product._id}`)}
                    >
                      <QrCode size={17} />
                      Create QR code
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className='empty-state'>
            <div className='empty-qr'>
              <Package size={32} />
            </div>
            <h3>
              {assets.products.length ? 'No matching products.' : 'Give your content a product.'}
            </h3>
            <p>
              A product holds your image, video or URL file. Your QR codes point to that product.
            </p>
            <button
              className='btn btn-primary'
              onClick={() => {
                setInitialFile(undefined)
                setEditor('new')
              }}
            >
              <Plus size={17} />
              Create your first product
            </button>
          </div>
        )}
        <div className='library-footer'>
          <span>
            {filtered.length} of {assets.products.length} products
          </span>
          <span>Replace a product’s file without reprinting its QR codes.</span>
        </div>
      </section>
      {editor && (
        <ProductEditor
          product={editor === 'new' ? undefined : editor}
          initialFileId={initialFile}
          onClose={() => setEditor(undefined)}
          onSaved={assets.refresh}
        />
      )}
      {deleting && (
        <Modal title='Delete this product?' onClose={() => setDeleting(undefined)} busy={busy}>
          <div className='delete-content'>
            <h3>{productName(deleting)}</h3>
            <p>
              Your file stays in the library. Products assigned to QR codes must be detached first.
            </p>
          </div>
          <div className='modal-actions'>
            <button
              className='btn btn-secondary'
              disabled={busy}
              onClick={() => setDeleting(undefined)}
            >
              Keep product
            </button>
            <button className='btn btn-danger' disabled={busy} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete product'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
