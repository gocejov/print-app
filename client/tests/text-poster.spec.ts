import sharp from 'sharp'
import { test, expect } from '@playwright/test'

test('text posters save, edit and render without an absent logo', async ({ page }) => {
  await page.goto('/admin/')
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await page.getByLabel('First name').fill('Poster')
  await page.getByLabel('Last name').fill('Tester')
  await page.getByLabel('Email address').fill(`poster-${Date.now()}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill('poster test password')
  await page.getByRole('button', { name: 'Create your account', exact: true }).click()
  await page.getByRole('link', { name: 'Files', exact: true }).click()
  await page.getByRole('button', { name: 'Add file', exact: true }).click()
  await page.getByRole('button', { name: 'Text', exact: true }).click()
  await expect(page.getByLabel('Text poster preview').locator('img')).toHaveCount(0)
  await page.getByLabel('File name', { exact: true }).fill('Неделен одмор')
  await page
    .getByLabel('Your text', { exact: true })
    .fill('НЕ МИ ТРЕБА\nПСИХОЛОГ\nМИ ТРЕБААТ 5\nСЛОБОДНИ ДЕНА\nОД РАБОТА\nСЕКОЈА НЕДЕЛА')
  await page.screenshot({ path: '/tmp/text-poster-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '/tmp/text-poster-mobile.png', fullPage: true })
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Add file', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const files = await (await page.request.get('/api/files')).json()
  const file = files.find((item: { type: string }) => item.type === 'text')
  expect(file.textPage.logo).toBe('')
  const content = await page.request.get(`/api/files/${file._id}/content`)
  expect(content.status()).toBe(200)
  expect(await content.text()).not.toContain('<img')
  await page.getByRole('button', { name: 'Edit Неделен одмор', exact: true }).click()
  await expect(page.getByLabel('Your text', { exact: true })).toHaveValue(file.textPage.text)
  await page.getByLabel('Background', { exact: true }).click()
  await page.getByRole('option', { name: 'Warm paper', exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  const logo = await sharp({
    create: { width: 240, height: 80, channels: 4, background: '#dc9a22' },
  })
    .png()
    .toBuffer()
  await page
    .getByLabel('Logo image', { exact: true })
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logo })
  await expect(page.getByRole('img', { name: 'Logo preview' })).toBeVisible()
  await page.getByLabel('Text poster preview').scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/text-poster-logo-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Remove logo', exact: true }).click()
  await expect(page.getByLabel('Text poster preview').locator('img')).toHaveCount(0)
  await page.getByRole('button', { name: 'Save file', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const product = await (
    await page.request.post('/api/products/create/', {
      data: { name: 'Poster product', fileId: file._id },
    })
  ).json()
  const code = await (
    await page.request.post('/api/qrcodes', { data: { productId: product.product._id } })
  ).json()
  await page.goto(`/l/q/t/${code._id}`)
  await expect(page.locator('.text-poster')).toContainText('СЕКОЈА НЕДЕЛА')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.text-poster img')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/text-poster-public-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: '/tmp/text-poster-public-desktop.png', fullPage: true })
  const updated = await page.request.put(`/api/files/${file._id}`, {
    data: { textPage: { ...file.textPage, text: 'W'.repeat(5000) } },
  })
  expect(updated.status()).toBe(200)
  await page.reload()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 320, height: 720 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
