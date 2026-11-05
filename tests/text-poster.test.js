const { test } = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('sharp')
const { validateTextPage, textPage } = require('../src/services/text-page.service')

test('text posters validate choices, escape content and omit absent logos', async () => {
  const settings = await validateTextPage({
    text: 'СЕКОЈА НЕДЕЛА\n<script>alert(1)</script>',
    font: 'handwritten',
    background: 'black',
    logo: '',
  })
  const rendered = textPage({ name: '<Poster>', textPage: settings })
  assert.ok(rendered.includes('СЕКОЈА НЕДЕЛА\n&lt;script&gt;'))
  assert.ok(!rendered.includes('<img'))
  assert.ok(!rendered.includes('<script>'))
  await assert.rejects(validateTextPage({ ...settings, font: '__proto__' }))
  await assert.rejects(validateTextPage({ ...settings, background: 'url(evil)' }))
  await assert.rejects(validateTextPage({ ...settings, text: ' ' }))
  await assert.rejects(validateTextPage({ ...settings, text: 'a'.repeat(5001) }))
  await assert.rejects(
    validateTextPage({ ...settings, logo: 'data:image/svg+xml;base64,PHN2Zz4=' }),
  )
  await assert.rejects(validateTextPage({ ...settings, logo: 'data:image/png;base64,aGVsbG8=' }))
  const logo = await sharp({
    create: { width: 1200, height: 600, channels: 4, background: '#fff' },
  })
    .png()
    .toBuffer()
  const withLogo = await validateTextPage({
    ...settings,
    logo: `data:image/png;base64,${logo.toString('base64')}`,
  })
  const meta = await sharp(Buffer.from(withLogo.logo.split(',')[1], 'base64')).metadata()
  assert.equal(meta.width, 600)
  assert.ok(textPage({ name: 'Logo', textPage: withLogo }).includes('<img'))
})
