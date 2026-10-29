import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, FolderOpen, PackagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { AssetFile } from '../../lib/types'
import { date, fileName, fileSize, typeLabel } from '../../lib/format'
import { api } from '../../lib/api'
import { useToast } from '../../app/providers'
import { Modal } from '../../components/modal'
import { useAssets } from './use-assets'
import { FileEditor } from './file-editor'
import { FileIcon, FilePreview } from './file-preview'

export function FilesPage() {
  const assets = useAssets()
  const [editor, setEditor] = useState<AssetFile | 'new'>()
  const [preview, setPreview] = useState<AssetFile>()
  const [deleting, setDeleting] = useState<AssetFile>()
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const navigate = useNavigate()
  const toast = useToast()
  const filtered = assets.files
    .filter(
      (file) =>
        (type === 'all' || type === file.type) &&
        `${fileName(file)} ${file.url}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  const uses = (file: AssetFile) =>
    assets.products.filter(
      (product) =>
        (typeof product.file === 'object' ? product.file?._id : product.file) === file._id,
    ).length
  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await api.deleteFile(deleting._id)
      await assets.refresh()
      setDeleting(undefined)
      toast('File deleted.')
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
          <div className='eyebrow'>01 / YOUR CONTENT LIBRARY</div>
          <h1>
            Files<span className='heading-dot'>.</span>
          </h1>
          <p>Upload images and videos, or save URLs. Reuse them in your products.</p>
        </div>
        <button className='btn btn-primary' onClick={() => setEditor('new')}>
          <Plus size={18} />
          Add file
        </button>
      </header>
      <div className='workflow-strip'>
        <span className='current'>
          <FolderOpen size={16} />
          Files
        </span>
        <i>→</i>
        <span>Products</span>
        <i>→</i>
        <span>QR codes</span>
        <p>Start with the content you want to share.</p>
      </div>
      <section className='library-section'>
        <div className='section-heading'>
          <div className='section-heading-label'>
            <h2>File library</h2>
            <span className='count-badge'>{assets.files.length}</span>
          </div>
          <div className='search-field'>
            <Search size={16} />
            <input
              aria-label='Search files'
              placeholder='Search files…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className='library-toolbar'>
          <div className='tabs'>
            {[
              ['all', 'All files'],
              ['image', 'Images'],
              ['video', 'Videos'],
              ['web-url', 'URLs'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={value === type ? 'selected' : ''}
                onClick={() => setType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {assets.error ? (
          <div className='empty-state'>
            <h3>Your library couldn’t load.</h3>
            <p>{assets.error.message}</p>
            <button className='btn btn-secondary' onClick={() => assets.refresh()}>
              Try again
            </button>
          </div>
        ) : assets.loading ? (
          <div className='table-skeleton'>
            <div />
            <div />
          </div>
        ) : filtered.length ? (
          <div className='table-scroll'>
            <table className='codes-table'>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Used by</th>
                  <th>Added</th>
                  <th>
                    <span className='sr-only'>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((file) => (
                  <tr key={file._id}>
                    <td>
                      <div className='code-name-cell'>
                        <button
                          className='file-thumb'
                          aria-label={`Preview ${fileName(file)}`}
                          onClick={() => setPreview(file)}
                        >
                          <FilePreview file={file} compact />
                        </button>
                        <div>
                          <button className='code-title' onClick={() => setPreview(file)}>
                            {fileName(file)}
                          </button>
                          <span className='destination-label'>
                            {file.type === 'web-url'
                              ? file.url
                              : file.size
                                ? fileSize(file.size)
                                : file.originalname}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className='type-label'>
                        <FileIcon type={file.type} size={15} />
                        {typeLabel(file.type)}
                      </span>
                    </td>
                    <td className='date-cell'>
                      {uses(file)} {uses(file) === 1 ? 'product' : 'products'}
                    </td>
                    <td className='date-cell'>{date(file.created_at)}</td>
                    <td>
                      <div className='row-actions'>
                        <button
                          className='icon-btn'
                          title='Create a product with this file'
                          aria-label={`Create product from ${fileName(file)}`}
                          onClick={() => navigate(`/products?fileId=${file._id}`)}
                        >
                          <PackagePlus size={17} />
                        </button>
                        <button
                          className='icon-btn'
                          aria-label={`Edit ${fileName(file)}`}
                          onClick={() => setEditor(file)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className='icon-btn danger-text'
                          aria-label={`Delete ${fileName(file)}`}
                          disabled={uses(file) > 0}
                          title={uses(file) ? 'This file is attached to a product' : 'Delete file'}
                          onClick={() => setDeleting(file)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='empty-state'>
            <div className='empty-qr'>
              <FolderOpen size={32} />
            </div>
            <h3>{assets.files.length ? 'No matching files.' : 'Build your content library.'}</h3>
            <p>
              {assets.files.length
                ? 'Try another search or file type.'
                : 'Add an image, video or URL, then attach it to a product.'}
            </p>
            <button className='btn btn-primary' onClick={() => setEditor('new')}>
              <Plus size={17} />
              Add your first file
            </button>
          </div>
        )}
        <div className='library-footer'>
          <span>
            {filtered.length} of {assets.files.length} files
          </span>
          <span>One file can be used by several products.</span>
        </div>
      </section>
      {editor && (
        <FileEditor
          file={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(undefined)}
          onSaved={assets.refresh}
        />
      )}
      {preview && (
        <Modal title={fileName(preview)} wide onClose={() => setPreview(undefined)}>
          <div className='file-preview-dialog'>
            <FilePreview file={preview} />
            {preview.type === 'web-url' && (
              <a className='btn btn-secondary' href={preview.url} target='_blank' rel='noreferrer'>
                Open URL
                <ExternalLink size={15} />
              </a>
            )}
            <p className='muted small'>
              {typeLabel(preview.type)} · {date(preview.created_at)}
            </p>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title='Delete this file?' onClose={() => setDeleting(undefined)} busy={busy}>
          <div className='delete-content'>
            <h3>{fileName(deleting)}</h3>
            <p>
              This removes the file from your library and deletes its uploaded media. Attached files
              must be detached from their products first.
            </p>
          </div>
          <div className='modal-actions'>
            <button
              className='btn btn-secondary'
              disabled={busy}
              onClick={() => setDeleting(undefined)}
            >
              Keep file
            </button>
            <button className='btn btn-danger' disabled={busy} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete file'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
