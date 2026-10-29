import { QrCode } from 'lucide-react'
export function Brand() {
  return (
    <div className='brand'>
      <span className='brand-symbol'>
        <QrCode size={25} strokeWidth={2.3} />
      </span>
      <span>
        qr<span className='brand-two'>2</span>share<span className='brand-period'>.</span>
      </span>
    </div>
  )
}
