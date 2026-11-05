import { Type, Globe2, Image, Video, Shuffle, Gamepad2 } from 'lucide-react'
import type { AssetFile, FileType } from '../../lib/types'
import { fileName } from '../../lib/format'

export function FileIcon({ type, size = 20 }: { type: FileType | 'campaign' | 'space'; size?: number }) {
  if (type === 'text') return <Type size={size} />
  if (type === 'space') return <Gamepad2 size={size} />
  if (type === 'campaign') return <Shuffle size={size} />
  return type === 'image' ? (
    <Image size={size} />
  ) : type === 'video' ? (
    <Video size={size} />
  ) : (
    <Globe2 size={size} />
  )
}
export function FilePreview({ file, compact = false }: { file: AssetFile; compact?: boolean }) {
  if (file.type === 'text' && !compact) return <iframe title={fileName(file)} src={`/api/files/${file._id}/content`} style={{ width: '100%', height: '65vh', border: 0 }} />
  if (file.type === 'image')
    return (
      <img
        className={`asset-preview-image ${compact ? 'compact' : ''}`}
        loading='lazy'
        src={`/api/files/${file._id}/content`}
        alt={fileName(file)}
      />
    )
  if (file.type === 'video' && !compact)
    return (
      <video
        className='asset-preview-video'
        src={`/api/files/${file._id}/content`}
        controls
        playsInline
        preload='metadata'
      />
    )
  return (
    <div className='asset-preview-icon'>
      <FileIcon type={file.type} size={compact ? 26 : 40} />
      {!compact && <span>{file.type === 'web-url' ? file.url : fileName(file)}</span>}
    </div>
  )
}
