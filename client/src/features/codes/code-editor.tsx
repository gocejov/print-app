import { useCollections } from '../collections/use-collections'
import { Link } from 'react-router-dom'
import { useAssets } from '../assets/use-assets'
import { FileIcon } from '../assets/file-preview'
import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Download, Package, RefreshCw, ShieldCheck, Shuffle } from 'lucide-react'
import { Modal } from '../../components/modal'
import { QrPreview } from '../../components/qr-preview'
import { api } from '../../lib/api'
import {
  codeName,
  downloadCode,
  productName,
  fileName,
  productFile,
  typeLabel,
  campaignProducts,
} from '../../lib/format'
import type { QrCode } from '../../lib/types'
import { useToast } from '../../app/providers'

export function CodeEditor({
  code,
  initialProductId,
  initialCampaignId,
  onClose,
  onSaved,
}: {
  code?: QrCode
  initialProductId?: string
  initialCampaignId?: string
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const [name, setName] = useState(code ? codeName(code) : '')
  const assets = useAssets()
  const collections = useCollections()
  const [targetKind, setTargetKind] = useState<'product' | 'campaign'>(
    initialCampaignId || code?.campaign ? 'campaign' : 'product',
  )
  const [campaignId, setCampaignId] = useState(
    initialCampaignId ||
      (typeof code?.campaign === 'object' ? code.campaign?._id : code?.campaign) ||
      '',
  )
  const selectedCampaign = collections.campaigns.find((campaign) => campaign._id === campaignId)
  const campaignPool = selectedCampaign
    ? campaignProducts(selectedCampaign, collections.categories, assets.products)
    : []
  const [productId, setProductId] = useState(
    initialProductId ||
      (typeof code?.product === 'object' ? code.product?._id : code?.product) ||
      '',
  )
  const selectedProduct = assets.products.find((product) => product._id === productId)
  const selectedFile = productFile(selectedProduct)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<QrCode>()
  const toast = useToast()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = code
        ? await api.editCode(code._id, {
            name: name.trim(),
            ...(targetKind === 'campaign' ? { campaignId } : { productId }),
          })
        : targetKind === 'campaign'
          ? await api.createCampaignCode(name.trim(), campaignId)
          : await api.createCode(name.trim(), productId)
      await onSaved()
      if (code) {
        toast('QR target updated. Your QR code stays the same.')
        onClose()
      } else setCreated(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  if (created)
    return (
      <Modal title='Your QR code is ready' onClose={onClose}>
        <div className='create-success'>
          <span className='success-check'>
            <Check size={25} />
          </span>
          <h3>A new connection, created.</h3>
          <p className='muted'>Download your code and put it out into the world.</p>
          <div className='success-qr'>
            <QrPreview image={created.qrCode} />
          </div>
          <strong>{codeName(created)}</strong>
          <span className='success-url'>{created.url}</span>
          <button
            className='btn btn-primary full'
            onClick={() => {
              try {
                downloadCode(created)
              } catch (e) {
                toast((e as Error).message, true)
              }
            }}
          >
            <Download size={17} />
            Download PNG
          </button>
          <button className='btn btn-secondary full' onClick={onClose}>
            Back to my QR codes
            <ArrowRight size={16} />
          </button>
        </div>
      </Modal>
    )
  return (
    <Modal title={code ? 'Edit QR code' : 'Create a QR code'} wide onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <div className='editor-layout'>
          <div className='editor-form'>
            <span className='step-label'>
              {code ? 'YOUR CONNECTION' : '01 / SET UP YOUR CONNECTION'}
            </span>
            <h3>{code ? 'New target. Same code.' : 'What would you like to share?'}</h3>
            <p className='muted'>
              {code
                ? 'Choose a product or campaign. Your printed QR code will keep working.'
                : 'Share a single product, or let a campaign randomly choose one product per scan.'}
            </p>
            <div className='content-type'>
              <span className='type-icon'>
                <Package size={21} />
              </span>
              <span>
                <strong>Products or campaigns → QR codes</strong>
                <small>Images, videos and URLs, all in one flow</small>
              </span>
            </div>
            <label>
              QR code name
              <input
                aria-label='QR code name'
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                placeholder='e.g. Summer menu, Product launch…'
              />
              <small>Just for you. Make it easy to find later.</small>
            </label>
            <div className='asset-type-picker qr-target-picker'>
              <button
                type='button'
                className={targetKind === 'product' ? 'selected' : ''}
                aria-pressed={targetKind === 'product'}
                onClick={() => setTargetKind('product')}
              >
                <Package size={17} />
                Single product
              </button>
              <button
                type='button'
                className={targetKind === 'campaign' ? 'selected' : ''}
                aria-pressed={targetKind === 'campaign'}
                onClick={() => setTargetKind('campaign')}
              >
                <Shuffle size={17} />
                Campaign
              </button>
            </div>
            {targetKind === 'product' ? (
              <>
                <label>
                  Assigned product
                  <select
                    aria-label='Assigned product'
                    required
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value)
                      const product = assets.products.find((p) => p._id === e.target.value)
                      if (!name && product) setName(productName(product))
                    }}
                  >
                    <option value=''>Choose a product</option>
                    {assets.products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {productName(product)}
                        {productFile(product) ? ` · ${typeLabel(productFile(product)!.type)}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedFile && (
                  <div className='selected-asset'>
                    <FileIcon type={selectedFile.type} />
                    <div>
                      <strong>{fileName(selectedFile)}</strong>
                      <span>
                        {typeLabel(selectedFile.type)}
                        {selectedFile.type === 'web-url' ? ` · ${selectedFile.url}` : ''}
                      </span>
                    </div>
                  </div>
                )}
                {!assets.loading && !assets.products.length && (
                  <p className='form-hint'>
                    Create a product with an image, video or URL file first.{' '}
                    <Link to='/products' onClick={onClose}>
                      Go to products
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <>
                <label>
                  Assigned campaign
                  <select
                    aria-label='Assigned campaign'
                    required
                    value={campaignId}
                    onChange={(e) => {
                      setCampaignId(e.target.value)
                      if (!name)
                        setName(
                          collections.campaigns.find((campaign) => campaign._id === e.target.value)
                            ?.name || '',
                        )
                    }}
                  >
                    <option value=''>Choose a campaign</option>
                    {collections.campaigns.map((campaign) => (
                      <option key={campaign._id} value={campaign._id}>
                        {campaign.name}
                        {campaign.status === 'paused' ? ' · Paused' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedCampaign && (
                  <div className='selected-asset'>
                    <Shuffle size={20} />
                    <div>
                      <strong>{selectedCampaign.name}</strong>
                      <span>
                        Random display · {campaignPool.length} distinct products · one per scan
                      </span>
                    </div>
                  </div>
                )}
                {!collections.loading && !collections.campaigns.length && (
                  <p className='form-hint'>
                    Create a campaign containing products or categories first.{' '}
                    <Link to='/campaigns' onClick={onClose}>
                      Go to campaigns
                    </Link>
                  </p>
                )}
                {selectedCampaign && !campaignPool.length && (
                  <p className='form-hint'>
                    Add eligible products to this campaign before assigning a QR code.
                  </p>
                )}
              </>
            )}
            {code?.destinationUrl && (
              <p className='form-hint'>
                This code has a custom link. Saving will use the selected product’s attached file
                instead.
              </p>
            )}
            {(assets.error || collections.error) && (
              <div className='form-error' role='alert'>
                {assets.error?.message || collections.error?.message}
              </div>
            )}
            {error && (
              <div className='form-error' role='alert'>
                {error}
              </div>
            )}
          </div>
          <aside className='editor-preview'>
            <span className='step-label'>
              {code ? 'YOUR EXISTING CODE' : 'DESTINATION PREVIEW'}
            </span>
            <div className='editor-qr'>
              <QrPreview image={code?.qrCode} value='https://example.com/preview' />
            </div>
            <span className='pill pill-green'>
              <RefreshCw size={13} /> Dynamic QR code
            </span>
            <p>
              {code
                ? 'Your printed QR code will not change.'
                : 'The saved QR will use a permanent scan link. Download it after creating.'}
            </p>
            <div className='preview-note'>
              <ShieldCheck size={17} />
              <span>
                Change the product or campaign later.
                <br />
                No reprinting needed.
              </span>
            </div>
          </aside>
        </div>
        <div className='modal-actions'>
          <button className='btn btn-secondary' type='button' disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            disabled={
              busy ||
              (targetKind === 'product'
                ? !selectedProduct || !selectedFile
                : !selectedCampaign || !campaignPool.length)
            }
          >
            {busy ? 'Saving your connection…' : code ? 'Save changes' : 'Create QR code'}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </Modal>
  )
}
