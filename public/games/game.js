/* One room per URL. Identity stays in its HttpOnly game cookie, never JavaScript storage. */
(() => {
  const base = `/games/${document.body.dataset.game}`
  const el = id => document.getElementById(id)
  let current = null, unread = 0, playerCursor = null, search = '', requestId = null, recipient = null
  let searchTimer, searchController, searchVersion = 0
  async function api(path, body, signal) {
    const response = await fetch(base + path, { signal, credentials: 'same-origin', cache: 'no-store', ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
    if (response.status === 204) return null
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || data.message || 'Unable to connect. Please try again.')
    return data
  }
  function status(message) { el('status').textContent = message; el('status').hidden = !message }
  async function action(button, work) {
    el('error').hidden = true
    if (button) button.disabled = true
    try { await work() } catch (error) { status(''); el('error').textContent = error.message; el('error').hidden = false }
    finally { if (button) button.disabled = false }
  }
  async function inbox() {
    const data = await api('/messages?status=unread')
    current = data.message; unread = data.unreadCount
    el('unread-count').textContent = unread
    el('message-content').hidden = !current; el('empty').hidden = Boolean(current)
    el('message-date').textContent = current ? new Date(current.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''
    el('queue-hint').textContent = unread ? `${unread} unread ${unread === 1 ? 'note' : 'notes'} · Take your time. Your place is saved until you continue.` : 'All caught up. Another scan could bring a new surprise.'
    if (current) {
      el('sender').textContent = `A note from ${current.senderName}`
      el('message-text').textContent = current.text
      el('next-message').textContent = unread > 1 ? 'Next message →' : 'Mark as read ✓'
    }
  }
  function selectPlayer(player) {
    recipient = player; requestId = null
    el('recipient-name').textContent = player.name
    el('recipient-avatar').textContent = player.name.slice(0, 2).toUpperCase()
    el('player-picker').hidden = true; el('send-form').hidden = false
    el('message').focus()
  }
  async function players(more = false) {
    searchController?.abort()
    const controller = new AbortController()
    searchController = controller
    const version = ++searchVersion
    el('more-players').disabled = true
    el('player-results-status').textContent = 'Finding your circle…'
    if (!more) { el('player-results').replaceChildren(); playerCursor = null; el('more-players').hidden = true }
    try {
      const data = await api(`/participants?${search ? `search=${encodeURIComponent(search)}&` : ''}${more && playerCursor ? `after=${playerCursor}` : ''}`, undefined, controller.signal)
      if (version !== searchVersion) return
      for (const player of data.participants) {
        const button = document.createElement('button')
        button.type = 'button'; button.className = 'player-option'
        button.setAttribute('aria-label', `Send a note to ${player.name}`)
        const avatar = document.createElement('span'); avatar.className = 'player-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = player.name.slice(0, 2).toUpperCase()
        const name = document.createElement('strong'); name.textContent = player.name
        const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.className = 'player-arrow'; arrow.setAttribute('aria-hidden', 'true')
        button.append(avatar, name, arrow); button.addEventListener('click', () => selectPlayer(player))
        el('player-results').append(button)
      }
      playerCursor = data.next; el('more-players').hidden = !playerCursor
      const count = el('player-results').childElementCount
      el('player-results-status').textContent = count ? `${count}${playerCursor ? '+' : ''} ${count === 1 ? 'player' : 'players'}${search ? ' found' : ' in your circle'} · Tap a name to write.` : search ? `No one matches “${search}”. Try another name.` : 'Your circle is just getting started. Invite someone to scan this QR.'
    } catch (error) {
      if (version === searchVersion && error.name !== 'AbortError') el('player-results-status').textContent = `${error.message} Try changing your search or reopen this tab.`
    } finally { if (version === searchVersion) el('more-players').disabled = false }
  }
  async function show(section) {
    for (const name of ['inbox', 'send']) el(`${name}-tab`).setAttribute('aria-pressed', String(name === section))
    el('send-panel').hidden = section !== 'send'; el('inbox-panel').hidden = section === 'send'
    status('')
    if (section === 'send') { if (!recipient) await players() }
    else await inbox()
  }
  async function entered(player) {
    document.body.classList.add('player-ready')
    el('join-panel').hidden = true; el('play-panel').hidden = false
    el('player-name').textContent = `Hi, ${player.name}.`
    status(''); await inbox()
  }
  el('join-form').addEventListener('submit', event => {
    event.preventDefault()
    action(event.submitter, async () => entered(await api('/join', { name: el('join-name').value })))
  })
  for (const section of ['inbox', 'send']) el(`${section}-tab`).addEventListener('click', event => action(event.currentTarget, () => show(section)))
  el('refresh').addEventListener('click', event => action(event.currentTarget, async () => { await show('inbox'); status('Inbox updated.') }))
  el('next-message').addEventListener('click', event => action(event.currentTarget, async () => {
    if (!current) return
    await api(`/messages/${current.id}/read`, {}); await inbox()
  }))
  function searchChanged() {
    clearTimeout(searchTimer); searchController?.abort(); ++searchVersion
    search = el('player-search').value.trim(); el('clear-search').hidden = !el('player-search').value
    el('player-results').replaceChildren(); el('more-players').hidden = true
    el('player-results-status').textContent = 'Finding your circle…'
    searchTimer = setTimeout(() => players(), 250)
  }
  el('player-search').addEventListener('input', searchChanged)
  el('clear-search').addEventListener('click', () => { el('player-search').value = ''; searchChanged(); el('player-search').focus() })
  el('change-player').addEventListener('click', () => {
    recipient = null; requestId = null; el('send-form').hidden = true; el('player-picker').hidden = false
    action(null, () => players()); el('player-search').focus()
  })
  el('more-players').addEventListener('click', () => players(true))
  el('message').addEventListener('input', () => { requestId = null; el('character-count').textContent = `${el('message').value.length.toLocaleString()} / 2,000` })
  el('send-form').addEventListener('submit', event => {
    event.preventDefault()
    if (!recipient) return
    action(event.submitter, async () => {
      requestId ||= crypto.randomUUID()
      const text = el('message').value, target = recipient._id
      status('Sending your note…')
      await api('/messages', { recipientId: target, text, requestId })
      if (el('message').value === text) { el('message').value = ''; el('character-count').textContent = '0 / 2,000' }
      requestId = null; status('Message sent. It will be waiting in their inbox.')
    })
  })
  action(null, async () => {
    const data = await api('/state')
    if (data.participant) await entered(data.participant)
    else { el('join-panel').hidden = false; status('') }
  })
})()
