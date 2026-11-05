import { useState, type FormEvent } from 'react'
import { ArrowRight, UploadCloud } from 'lucide-react'
import { AdminDialog } from '../../components/admin-dialog'
import { Alert, Box, Button, DialogActions, DialogContent, TextField } from '@mui/material'
import { TextPosterEditor } from './text-poster-editor'
import type { TextPage } from '../../lib/types'
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
  const [textPage, setTextPage] = useState<TextPage>(
    file?.textPage || { text: '', font: 'handwritten', background: 'black', logo: '' },
  )
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
      if (file)
        await api.editFile(file._id, {
          name,
          ...(type === 'text' ? { textPage } : {}),
          ...(type === 'web-url' ? { url } : {}),
        })
      else if (type === 'text') await api.createTextFile(name, textPage)
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
    <AdminDialog title={file ? 'Edit file' : 'Add a file'} onClose={onClose} busy={busy}>
      <Box
        component='form'
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            {!file && (
              <Box
                role='group'
                aria-label='File type'
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
              >
                {(['image', 'video', 'web-url', 'text'] as const).map((value) => (
                  <Button
                    key={value}
                    type='button'
                    variant={type === value ? 'contained' : 'outlined'}
                    aria-pressed={type === value}
                    disabled={busy}
                    startIcon={<FileIcon type={value} size={18} />}
                    onClick={() => {
                      setType(value)
                      setUpload(undefined)
                      setError('')
                    }}
                  >
                    {typeLabel(value)}
                  </Button>
                ))}
              </Box>
            )}
            <TextField
              label='File name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={busy}
              slotProps={{ htmlInput: { 'aria-label': 'File name', maxLength: 120 } }}
            />
            {type === 'text' ? (
              <TextPosterEditor value={textPage} onChange={setTextPage} disabled={busy} />
            ) : type === 'web-url' ? (
              <TextField
                label='Website URL'
                type='url'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={busy}
                slotProps={{
                  htmlInput: {
                    'aria-label': 'Website URL',
                    maxLength: 2048,
                    pattern: 'https?://.*',
                  },
                }}
                helperText='Editing this URL updates products that use this file.'
              />
            ) : !file ? (
              <Box>
                <Button
                  component='label'
                  variant='outlined'
                  startIcon={<UploadCloud size={20} />}
                  disabled={busy}
                >
                  {upload ? upload.name : `Choose ${type}`}
                  <input
                    aria-label={type === 'image' ? 'Image file' : 'Video file'}
                    type='file'
                    hidden
                    accept={
                      type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'video/*'
                    }
                    onChange={(e) => {
                      const selected = e.target.files?.[0]
                      setUpload(selected)
                      if (!name && selected) setName(selected.name.slice(0, 120))
                    }}
                  />
                </Button>
                <p className='muted small'>
                  {type === 'image'
                    ? 'JPEG, PNG, WebP or GIF · up to 10 MB'
                    : 'MP4, MOV, AVI or MKV · up to 50 MB'}
                </p>
              </Box>
            ) : (
              <p className='muted small'>
                To replace the media, add another file and select it in your product.
              </p>
            )}
            {error && <Alert severity='error'>{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={busy}
            endIcon={<ArrowRight size={16} />}
          >
            {busy ? 'Saving file…' : file ? 'Save file' : 'Add file'}
          </Button>
        </DialogActions>
      </Box>
    </AdminDialog>
  )
}
