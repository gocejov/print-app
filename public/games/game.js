/* One room per URL. Identity stays in its HttpOnly game cookie, never JavaScript storage. */
(() => {
  const base = `/games/${document.body.dataset.game}`
  const el = id => document.getElementById(id)
  let mode = 'unread', current = null, hasMore = false, unread = 0, playerCursor = null, search = '', requestId = null
  async function api(path, body) {
    const response = await fetch(base + path, { credentials: 'same-origin', cache: 'no-store', ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
    if (response.status === 204) return null
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || data.message || 'Unable to connect. Please try again.')
    return data
  }
  function status(message) { el('status').textContent = message; el('status').hidden = !message }
  async function action(button, work) {
    el('error').hidden = true
    if (button) button.disabled = true
    try { await work() } catch (error) { el('error').textContent = error.message; el('error').hidden = false }
    finally { if (button) button.disabled = false }
  }
  async function inbox(after) {
    const data = await api(`/messages?status=${mode}${after ? `&after=${after}` : ''}`)
    current = data.message; hasMore = data.hasMore; unread = data.unreadCount
    el('unread-count').textContent = unread
    el('message-content').hidden = !current; el('empty').hidden = Boolean(current)
    el('message-date').textContent = current ? new Date(current.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''
    el('inbox-label').textContent = mode === 'read' ? 'READ MESSAGES' : 'YOUR INBOX'
    el('empty-title').textContent = mode === 'read' ? 'No read messages yet.' : 'Your next message is on its way.'
    el('empty-description').textContent = mode === 'read' ? 'Messages you finish reading remain here, ready to revisit.' : 'Send a note to someone in the circle, then scan this QR again to check your inbox.'
    el('queue-hint').textContent = mode === 'read' ? 'Read messages are kept here. Switch to Inbox for unread notes.' : `${unread} unread ${unread === 1 ? 'message' : 'messages'}. Opening a message does not mark it as read.`
    if (current) {
      el('sender').textContent = `From ${current.senderName}`
      el('message-text').textContent = current.text
      el('next-message').hidden = mode === 'read' && !hasMore
      el('next-message').textContent = mode === 'read' ? 'Next read message →' : unread > 1 ? 'Next message →' : 'Mark as read ✓'
    }
  }
  async function players(more = false) {
    const data = await api(`/participants?${search ? `search=${encodeURIComponent(search)}&` : ''}${more && playerCursor ? `after=${playerCursor}` : ''}`)
    if (!more) { el('recipient').replaceChildren(new Option('Choose a player', '')) }
    for (const player of data.participants) el('recipient').add(new Option(player.name, player._id))
    playerCursor = data.next; el('more-players').hidden = !playerCursor
    if (!data.participants.length && !more) status('No other players found. Invite someone to scan this game’s QR.')
  }
  async function show(section) {
    for (const name of ['inbox', 'send', 'history']) el(`${name}-tab`).setAttribute('aria-pressed', String(name === section))
    el('send-panel').hidden = section !== 'send'; el('inbox-panel').hidden = section === 'send'
    status('')
    if (section === 'send') await players()
    else { mode = section === 'history' ? 'read' : 'unread'; await inbox() }
  }
  async function entered(player) {
    el('join-panel').hidden = true; el('play-panel').hidden = false
    el('player-name').textContent = `Hi, ${player.name}.`
    status(''); await inbox()
  }
  el('join-form').addEventListener('submit', event => {
    event.preventDefault()
    action(event.submitter, async () => entered(await api('/join', { name: el('join-name').value })))
  })
  for (const section of ['inbox', 'send', 'history']) el(`${section}-tab`).addEventListener('click', event => action(event.currentTarget, () => show(section)))
  el('refresh').addEventListener('click', event => action(event.currentTarget, async () => { await show('inbox'); status('Inbox updated.') }))
  el('next-message').addEventListener('click', event => action(event.currentTarget, async () => {
    if (!current) return
    if (mode === 'read') await inbox(current.id)
    else { await api(`/messages/${current.id}/read`, {}); await inbox() }
  }))
  el('search-form').addEventListener('submit', event => { event.preventDefault(); search = el('player-search').value.trim(); action(event.submitter, () => players()) })
  el('more-players').addEventListener('click', event => action(event.currentTarget, () => players(true)))
  for (const id of ['message', 'recipient']) el(id).addEventListener('input', () => { requestId = null })
  el('send-form').addEventListener('submit', event => {
    event.preventDefault()
    action(event.submitter, async () => {
      requestId ||= crypto.randomUUID()
      await api('/messages', { recipientId: el('recipient').value, text: el('message').value, requestId })
      el('message').value = ''; requestId = null; status('Message sent. It will be waiting in their inbox.')
    })
  })
  action(null, async () => {
    const data = await api('/state')
    if (data.participant) await entered(data.participant)
    else { el('join-panel').hidden = false; status('') }
  })
})()
