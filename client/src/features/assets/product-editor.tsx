import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import type { Product } from '../../lib/types'
import { Modal } from '../../components/modal'
import { api } from '../../lib/api'
import { fileName, productName, typeLabel } from '../../lib/format'
import { useToast } from '../../app/providers'
import { useAssets } from './use-assets'
import { FileIcon } from './file-preview'

export function ProductEditor({
  product,
  initialFileId,
  onClose,
  onSaved,
}: {
  product?: Product
  initialFileId?: string
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const assets = useAssets()
  const [name, setName] = useState(product ? productName(product) : '')
  const [description, setDescription] = useState(product?.description || '')
  const [fileId, setFileId] = useState(
    initialFileId || (typeof product?.file === 'object' ? product.file?._id : product?.file) || '',
  )
  const [displayMode, setDisplayMode] = useState<'direct' | 'page'>(
    product?.displayMode || 'direct',
  )
  const [mediaIds, setMediaIds] = useState<string[]>(product?.mediaIds || [])
  const [actionLabel, setActionLabel] = useState(product?.actionLabel || '')
  const [actionUrl, setActionUrl] = useState(product?.actionUrl || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const selected = assets.files.find((file) => file._id === fileId)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const page = { displayMode, mediaIds, actionLabel, actionUrl }
      if (product) await api.editProduct(product._id, { name, description, fileId, ...page })
      else await api.createProduct(name, description, fileId, page)
      await onSaved()
      toast(
        product
          ? 'Product updated. Assigned QR codes follow its scan experience.'
          : 'Product created. You can now assign it to a QR code.',
      )
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={product ? 'Edit product' : 'Create a product'} onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <div className='asset-editor-body'>
          <div className='workflow-note'>
            <Package size={20} />
            <p>
              Connect your files to QR codes. Share a file directly or create a product page with a
              media gallery and action button.
            </p>
          </div>
          <label>
            Product name
            <input
              aria-label='Product name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              placeholder='e.g. Summer menu, Product demo…'
              autoFocus
            />
          </label>
          <label>
            Description <span className='optional-label'>optional</span>
            <textarea
              aria-label='Product description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder='Describe your product. Shown publicly in product-page mode.'
            />
          </label>
          <label>
            Attached file
            <select
              aria-label='Attached file'
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              required
            >
              <option value=''>Choose a file from your library</option>
              {assets.files.map((file) => (
                <option value={file._id} key={file._id}>
                  {fileName(file)} · {typeLabel(file.type)}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <div className='selected-asset'>
              <FileIcon type={selected.type} />
              <div>
                <strong>{fileName(selected)}</strong>
                <span>
                  {typeLabel(selected.type)}
                  {selected.type === 'web-url' ? ` · ${selected.url}` : ''}
                </span>
              </div>
            </div>
          )}
          <label>
            Scan experience
            <select
              aria-label='Scan experience'
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as 'direct' | 'page')}
            >
              <option value='direct'>Open attached file directly</option>
              <option value='page'>Product page with media and action</option>
            </select>
          </label>
          {displayMode === 'page' && (
            <>
              <p className='form-hint'>
                Visitors see your product name, description, attached file and additional media.
                Select media in the order you want them shown.
              </p>
              <fieldset className='product-media-picker'>
                <legend>Additional images and videos ({mediaIds.length}/12)</legend>
                {assets.files
                  .filter((file) => file.type !== 'web-url' && file._id !== fileId)
                  .map((file) => (
                    <label key={file._id}>
                      <input
                        type='checkbox'
                        checked={mediaIds.includes(file._id)}
                        disabled={!mediaIds.includes(file._id) && mediaIds.length >= 12}
                        onChange={(e) =>
                          setMediaIds(
                            e.target.checked
                              ? [...mediaIds, file._id]
                              : mediaIds.filter((id) => id !== file._id),
                          )
                        }
                      />
                      {mediaIds.includes(file._id) ? `${mediaIds.indexOf(file._id) + 1}. ` : ''}
                      {fileName(file)}
                    </label>
                  ))}
              </fieldset>
              <label>
                Action button label <span className='optional-label'>optional</span>
                <input
                  aria-label='Action button label'
                  value={actionLabel}
                  maxLength={60}
                  required={Boolean(actionUrl)}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder='e.g. Order now, Book a visit…'
                />
              </label>
              <label>
                Action button URL
                <input
                  aria-label='Action button URL'
                  type='url'
                  value={actionUrl}
                  maxLength={2048}
                  required={Boolean(actionLabel)}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder='https://example.com/order'
                />
              </label>
            </>
          )}
          {!assets.loading && !assets.files.length && (
            <p className='form-hint'>
              Your file library is empty.{' '}
              <Link to='/files' onClick={onClose}>
                Add an image, video or URL first.
              </Link>
            </p>
          )}
          {assets.error && (
            <div className='form-error' role='alert'>
              {assets.error.message}
            </div>
          )}
          {error && (
            <div className='form-error' role='alert'>
              {error}
            </div>
          )}
        </div>
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className='btn btn-primary' disabled={busy || !selected}>
            {busy ? 'Saving product…' : product ? 'Save product' : 'Create product'}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  )
}
