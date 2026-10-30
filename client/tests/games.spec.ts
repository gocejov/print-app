import { test, expect } from '@playwright/test'

test('create a game QR, join independently and keep every targeted message across scans', async ({
  page,
  browser,
}) => {
  expect(
    (
      await page.request.post('/api/users', {
        data: {
          name: 'Game',
          lastName: 'Host',
          email: `game-ui-${Date.now()}@example.test`,
          password: 'game browser test password',
        },
      })
    ).status(),
  ).toBe(201)
  await page.goto('/admin/games')
  await page.getByRole('button', { name: 'Create game', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create a game' })
  await dialog.getByLabel('Game name', { exact: true }).fill('The Friday circle')
  await dialog
    .getByLabel('Welcome message')
    .fill('Welcome, friends. Leave a little surprise for someone!')
  await dialog.getByRole('button', { name: 'Create game QR' }).click()
  await expect(page.getByRole('dialog', { name: 'Your game QR' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'The Friday circle game QR code' })).toBeVisible()
  await page.keyboard.press('Escape')
  const game = (await (await page.request.get('/api/games')).json())[0]
  const first = await browser.newContext(),
    second = await browser.newContext()
  try {
    const a = await first.newPage(),
      b = await second.newPage()
    const join = async (player: typeof a, name: string) => {
      await player.goto(game.code.url)
      await expect(player.getByRole('heading', { name: 'Start with your name.' })).toBeVisible()
      await expect(
        player.getByText('Welcome, friends. Leave a little surprise for someone!'),
      ).toBeVisible()
      await player.getByLabel('Your name', { exact: true }).fill(name)
      await player.getByRole('button', { name: 'Join game' }).click()
      await expect(player.getByRole('heading', { name: `Hi, ${name}.` })).toBeVisible()
    }
    await join(a, 'Alex')
    await b.setViewportSize({ width: 390, height: 844 })
    await join(b, 'Blair')
    await b.screenshot({ path: '/tmp/qr2share-game-mobile.png', fullPage: true })
    await a.getByRole('button', { name: 'Send a message', exact: true }).click()
    await expect(a.getByRole('button', { name: 'Send a note to Blair', exact: true })).toBeVisible()
    await expect(a.getByRole('button', { name: 'Read messages', exact: true })).toHaveCount(0)
    const search = a.getByLabel('Who are you looking for?', { exact: true })
    // An older search response must not replace the newer empty result.
    let releaseSlow!: () => void
    let finishSlow!: () => void
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve
    })
    const slowDone = new Promise<void>((resolve) => {
      finishSlow = resolve
    })
    await a.route('**/participants?search=Bl*', async (route) => {
      await slowGate
      await route
        .fulfill({
          json: { participants: [{ _id: 'f'.repeat(24), name: 'Stale Blair' }], next: null },
        })
        .catch(() => {})
      finishSlow()
    })
    const slowRequest = a.waitForRequest('**/participants?search=Bl*')
    await search.fill('Bl')
    await slowRequest
    await search.fill('nobody-here')
    await expect(a.locator('#player-results-status')).toContainText('No one matches')
    releaseSlow()
    await slowDone
    await expect(
      a.getByRole('button', { name: 'Send a note to Stale Blair', exact: true }),
    ).toHaveCount(0)
    await a.getByRole('button', { name: 'Clear player search' }).click()
    await expect(a.getByRole('button', { name: 'Send a note to Blair', exact: true })).toBeVisible()
    await a.getByRole('button', { name: 'Send a note to Blair', exact: true }).click()
    await expect(a.locator('#recipient-name')).toHaveText('Blair')
    await a.getByLabel('Your message', { exact: true }).fill('A draft to keep')
    await a.getByRole('button', { name: 'Change player', exact: true }).click()
    await a.getByRole('button', { name: 'Send a note to Blair', exact: true }).click()
    await expect(a.getByLabel('Your message', { exact: true })).toHaveValue('A draft to keep')
    await a.screenshot({ path: '/tmp/qr2share-game-compose-desktop.png', fullPage: true })
    const messages = [
      'Your first surprise: <script>alert("no")</script>',
      'Your second surprise is waiting.',
    ]
    for (const message of messages) {
      await a.getByLabel('Your message', { exact: true }).fill(message)
      await a.getByRole('button', { name: 'Send message', exact: true }).click()
      await expect(a.getByRole('status')).toHaveText(
        'Message sent. It will be waiting in their inbox.',
      )
    }
    await b.goto(game.code.url)
    await expect(b.getByRole('heading', { name: 'Hi, Blair.' })).toBeVisible()
    await expect(b.locator('#message-text')).toHaveText(messages[0])
    await expect(b.locator('#unread-count')).toHaveText('2')
    await expect(b.locator('#message-text script')).toHaveCount(0)
    // Leaving without acknowledging keeps the first message unread.
    await b.goto(game.code.url)
    await expect(b.locator('#message-text')).toHaveText(messages[0])
    await b.getByRole('button', { name: 'Next message', exact: false }).click()
    await expect(b.locator('#message-text')).toHaveText(messages[1])
    await expect(b.locator('#unread-count')).toHaveText('1')
    await b.getByRole('button', { name: 'Mark as read' }).click()
    await expect(b.locator('#unread-count')).toHaveText('0')
    await expect(b.getByRole('button', { name: 'Read messages', exact: true })).toHaveCount(0)
    // Removing the tab does not delete stored read messages.
    const history = await (
      await second.request.get(`/games/${game._id}/messages?status=read`)
    ).json()
    expect(history.readCount).toBe(2)
    expect(history.message.text).toBe(messages[0])
    await b.getByRole('button', { name: 'Send a message', exact: true }).click()
    await b.getByLabel('Who are you looking for?', { exact: true }).fill('Alex')
    await expect(b.getByRole('button', { name: 'Send a note to Alex', exact: true })).toBeVisible()
    await b.screenshot({ path: '/tmp/qr2share-game-search-mobile.png', fullPage: true })
    await b.getByRole('button', { name: 'Send a note to Alex', exact: true }).click()
    await b.screenshot({ path: '/tmp/qr2share-game-compose-mobile.png', fullPage: true })
    expect(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByText('Paused', { exact: true })).toBeVisible()
    expect((await second.request.get(`/games/${game._id}/messages`)).status()).toBe(410)
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await b.goto(game.code.url)
    await expect(b.getByRole('heading', { name: 'Hi, Blair.' })).toBeVisible()
    await expect(b.locator('#unread-count')).toHaveText('0')
    await page.goto('/admin/qr-codes')
    await expect(page.getByText('Game', { exact: true })).toBeVisible()
    const stats = await (await page.request.get('/api/statistics')).json()
    expect(
      stats.filter((scan: { qrCode: string }) => scan.qrCode === game.code._id).length,
    ).toBeGreaterThanOrEqual(5)
  } finally {
    await first.close()
    await second.close()
  }
})
