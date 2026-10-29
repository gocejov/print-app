import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrPreview({
  value,
  image,
  label = 'QR code preview',
}: {
  value?: string
  image?: string
  label?: string
}) {
  const [generated, setGenerated] = useState('')
  useEffect(() => {
    let active = true
    if (!image && value)
      QRCode.toDataURL(value, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: 'Q',
        color: { dark: '#143e35', light: '#ffffff' },
      })
        .then((result) => {
          if (active) setGenerated(result)
        })
        .catch(() => {
          if (active) setGenerated('')
        })
    return () => {
      active = false
    }
  }, [value, image])
  return image || generated ? (
    <img className='qr-image' src={image || generated} alt={label} />
  ) : (
    <div className='qr-placeholder' aria-label='QR preview loading' />
  )
}
