import { useId, type ReactNode } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { X } from 'lucide-react'

/** MUI handles focus trapping, portals, scrolling and keyboard dismissal. */
export function AdminDialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const titleId = useId()
  return (
    <Dialog
      open
      maxWidth='sm'
      aria-labelledby={titleId}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <DialogTitle
        id={titleId}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexShrink: 0,
        }}
      >
        {title}
        <IconButton aria-label='Close dialog' disabled={busy} onClick={onClose} size='small'>
          <X size={19} />
        </IconButton>
      </DialogTitle>
      {children}
    </Dialog>
  )
}
