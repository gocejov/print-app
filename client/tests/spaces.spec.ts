import { test, expect } from '@playwright/test'

test('one plugin powers separate named spaces, with validated settings and permanent QRs', async ({
  page,
}) => {
  await page.request.post('/api/users', {
    data: {
      name: 'Space',
      lastName: 'Host',
      email: `spaces-${Date.now()}@example.test`,
      password: 'spaces test password',
    },
  })
  const legacy = await (
    await page.request.post('/api/games', {
      data: { name: 'Existing circle', welcome: 'Existing welcome.' },
    })
  ).json()
  await page.goto('/admin/plugins')
  await expect(page.getByRole('heading', { name: 'Message Circle', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Create space', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Create a space' })
  await expect(editor.getByRole('combobox', { name: 'Space plugin' })).toHaveText('Message Circle')
  await editor.getByRole('combobox', { name: 'Space plugin' }).click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.getByRole('option', { name: 'Message Circle', exact: true }).click()
  await expect(editor).toBeVisible()
  await page.screenshot({ path: '/tmp/qr2share-space-editor-desktop.png', animations: 'disabled' })
  await editor.getByLabel('Space name', { exact: true }).fill('Acme Summer Party')
  await editor.getByLabel('Welcome message').fill('Welcome to our summer party.')
  let releaseSave!: () => void
  const pendingSave = new Promise<void>((resolve) => {
    releaseSave = resolve
  })
  await page.route('**/api/spaces', async (route) => {
    if (route.request().method() === 'POST') await pendingSave
    await route.continue()
  })
  await editor.getByRole('button', { name: 'Create space and QR' }).click()
  await expect(editor.getByRole('button', { name: 'Close dialog' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(editor).toBeVisible()
  releaseSave()
  await expect(page.getByRole('dialog', { name: 'Your space QR' })).toBeVisible()
  const qrDialog = page.getByRole('dialog', { name: 'Your space QR' })
  const qr = qrDialog.getByRole('img')
  expect((await qr.boundingBox())!.width).toBeLessThanOrEqual(240)
  await page.screenshot({ path: '/tmp/qr2share-space-qr-desktop.png', animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await qrDialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/qr2share-space-qr-mobile.png', animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Acme Summer Party', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Existing circle', exact: true })).toBeVisible()
  const spaces = await (await page.request.get('/api/spaces')).json()
  const created = spaces.find((space: { name: string }) => space.name === 'Acme Summer Party')
  expect(created.code.space).toBe(created._id)
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Acme Summer Party', exact: true }) })
  await card.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Space settings' })
  await expect(settings.getByLabel('Space plugin')).toBeDisabled()
  await settings.getByLabel('Space name', { exact: true }).fill('Acme Evening Party')
  await settings.getByLabel('Welcome message').fill('Updated only in this space.')
  await settings.getByRole('button', { name: 'Save space', exact: true }).click()
  await expect(settings).toHaveCount(0)
  const updated = await (await page.request.get('/api/spaces')).json()
  expect(updated.find((space: { _id: string }) => space._id === created._id).code.url).toBe(
    created.code.url,
  )
  expect(updated.find((space: { _id: string }) => space._id === created._id).code.qrCode).toBe(
    created.code.qrCode,
  )
  expect(
    updated.find((space: { _id: string }) => space._id === legacy._id).configuration.welcome,
  ).toBe('Existing welcome.')
  await page.getByLabel('Search spaces').fill('Existing')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByLabel('Search spaces').fill('')
  await page.screenshot({
    path: '/tmp/qr2share-spaces-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByLabel('Filter spaces by plugin')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: '/tmp/qr2share-spaces-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page
    .getByRole('article')
    .first()
    .getByRole('button', { name: 'Settings', exact: true })
    .click()
  await expect(page.getByRole('dialog', { name: 'Space settings' })).toBeVisible()
  const mobileEditor = page.getByRole('dialog', { name: 'Space settings' })
  expect(await mobileEditor.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
  await mobileEditor
    .getByRole('button', { name: 'Save space', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/qr2share-space-editor-mobile.png', animations: 'disabled' })
  await page.keyboard.press('Escape')
  await page.goto('/admin/games')
  await expect(page).toHaveURL(/\/admin\/spaces$/)
})

test('spaces handle loading, errors, empty results and long content on small screens', async ({
  page,
}) => {
  await page.request.post('/api/users', {
    data: {
      name: 'Visual',
      lastName: 'Review',
      email: `space-visual-${Date.now()}@example.test`,
      password: 'visual spaces password',
    },
  })
  let finishLoading!: () => void
  const loading = new Promise<void>((resolve) => {
    finishLoading = resolve
  })
  await page.route('**/api/spaces', async (route) => {
    await loading
    await route.fulfill({ json: [] })
  })
  await page.goto('/admin/spaces')
  await expect(page.getByText('Loading spaces…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Make room for your first space.' })).toHaveCount(
    0,
  )
  await page.screenshot({ path: '/tmp/qr2share-spaces-loading.png', animations: 'disabled' })
  finishLoading()
  await expect(page.getByRole('heading', { name: 'Make room for your first space.' })).toBeVisible()
  await page.screenshot({ path: '/tmp/qr2share-spaces-empty.png', animations: 'disabled' })
  await page.unroute('**/api/spaces')
  await page.route('**/api/spaces', (route) =>
    route.fulfill({ status: 503, json: { error: 'Spaces temporarily unavailable.' } }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Spaces temporarily unavailable.')
  await expect(page.getByRole('heading', { name: 'Make room for your first space.' })).toHaveCount(
    0,
  )
  await page.screenshot({ path: '/tmp/qr2share-spaces-error.png', animations: 'disabled' })
  await page.unroute('**/api/spaces')
  await page.route('**/api/spaces', (route) =>
    route.fulfill({
      json: [
        {
          _id: 'a'.repeat(24),
          pluginId: 'message-circle',
          pluginVersion: 1,
          name: 'A very long summer party name for every colleague and friend in our community',
          configuration: { welcome: 'LongWelcomeTextWithoutSpaces'.repeat(35) },
          participants: 42,
          code: { _id: 'b'.repeat(24), status: 'paused' },
        },
        {
          _id: 'c'.repeat(24),
          pluginId: 'message-circle',
          pluginVersion: 1,
          name: 'Unavailable space',
          configuration: { welcome: 'A short welcome.' },
          participants: 0,
        },
      ],
    }),
  )
  await page.reload()
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.getByText('Paused', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `/tmp/qr2share-spaces-stress-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  await page.getByLabel('Search spaces').fill('no-match')
  await expect(page.getByRole('heading', { name: 'No matching spaces' })).toBeVisible()
  await page.getByRole('button', { name: 'Show all spaces', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
})
