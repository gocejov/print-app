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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const selected = assets.files.find((file) => file._id === fileId)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (product) await api.editProduct(product._id, { name, description, fileId })
      else await api.createProduct(name, description, fileId)
      await onSaved()
      toast(
        product
          ? 'Product updated. Assigned QR codes follow its attached file.'
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
              A product connects a file to your QR codes. Update its attached file whenever the
              content changes.
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
              placeholder='A little context for your workspace.'
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
