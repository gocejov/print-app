import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => {
      dialog.close()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby='modal-title'
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) closeRef.current()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) closeRef.current()
      }}
    >
      <div className='modal-header'>
        <h2 id='modal-title'>{title}</h2>
        <button
          className='icon-btn'
          type='button'
          aria-label='Close dialog'
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
