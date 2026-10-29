import { useState, type FormEvent } from 'react'
import { ArrowRight, UploadCloud } from 'lucide-react'
import { Modal } from '../../components/modal'
import { useAuth } from '../auth/use-auth'
import type { AssetFile, FileType } from '../../lib/types'
import { api } from '../../lib/api'
import { fileName, typeLabel } from '../../lib/format'
import { useToast } from '../../app/providers'
import { FileIcon } from './file-preview'

export function FileEditor({
  file,
  onClose,
  onSaved,
}: {
  file?: AssetFile
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const [type, setType] = useState<FileType>(file?.type || 'image')
  const [name, setName] = useState(file ? fileName(file) : '')
  const [url, setUrl] = useState(file?.url || '')
  const [upload, setUpload] = useState<File>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const toast = useToast()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setBusy(true)
    setError('')
    try {
      if (file) await api.editFile(file._id, { name, ...(type === 'web-url' ? { url } : {}) })
      else if (type === 'web-url') await api.createUrlFile(name, url)
      else {
        if (!upload) throw new Error('Choose a file to upload.')
        if (upload.size > (type === 'image' ? 10 : 50) * 1024 * 1024)
          throw new Error(
            `${typeLabel(type)} must be smaller than ${type === 'image' ? 10 : 50} MB.`,
          )
        await api.uploadFile(user._id, type, name, upload)
      }
      await onSaved()
      toast(file ? 'File updated.' : 'File added. It’s ready to attach to a product.')
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={file ? 'Edit file' : 'Add a file'} onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <div className='asset-editor-body'>
          <p className='muted'>
            Your library holds the images, videos and URLs you’ll attach to products.
          </p>
          {!file && (
            <div className='asset-type-picker' aria-label='File type'>
              {(['image', 'video', 'web-url'] as const).map((value) => (
                <button
                  key={value}
                  type='button'
                  aria-pressed={type === value}
                  className={type === value ? 'selected' : ''}
                  onClick={() => {
                    setType(value)
                    setUpload(undefined)
                    setError('')
                  }}
                >
                  <FileIcon type={value} size={18} />
                  {typeLabel(value)}
                </button>
              ))}
            </div>
          )}
          <label>
            File name
            <input
              aria-label='File name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              placeholder='e.g. Product photo, Demo video…'
            />
          </label>
          {type === 'web-url' ? (
            <label>
              Website URL
              <input
                aria-label='Website URL'
                type='url'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                maxLength={2048}
                placeholder='https://example.com'
                pattern='https?://.*'
              />
              <small>Editing this URL updates products that use this file.</small>
            </label>
          ) : !file ? (
            <label className='upload-field'>
              <UploadCloud size={28} />
              <strong>
                {upload
                  ? upload.name
                  : `Choose an ${type === 'image' ? 'image' : 'uploaded video'}`}
              </strong>
              <span>
                {type === 'image'
                  ? 'JPEG, PNG, WebP or GIF · up to 10 MB'
                  : 'MP4, MOV, AVI or MKV · up to 50 MB'}
              </span>
              <input
                key={type}
                aria-label={type === 'image' ? 'Image file' : 'Video file'}
                type='file'
                required
                accept={
                  type === 'image'
                    ? 'image/jpeg,image/png,image/webp,image/gif'
                    : 'video/mp4,video/quicktime,video/x-msvideo,video/avi,video/mkv,video/x-matroska,video/mov'
                }
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  setUpload(selected)
                  if (!name && selected) setName(selected.name.slice(0, 120))
                }}
              />
            </label>
          ) : (
            <p className='muted small'>
              To replace the media, add another file and select it when editing your product.
            </p>
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
          <button className='btn btn-primary' disabled={busy}>
            {busy ? 'Saving file…' : file ? 'Save file' : 'Add file'}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  )
}
