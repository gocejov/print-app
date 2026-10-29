import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, LockKeyhole, UserRound } from 'lucide-react'
import { useAuth } from '../auth/use-auth'
import { api } from '../../lib/api'
import { useToast } from '../../app/providers'

export function SettingsPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null
  async function submit(event: FormEvent<HTMLFormElement>, password = false) {
    event.preventDefault()
    if (!user) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy(true)
    setError('')
    try {
      const payload = password
        ? {
            currentPassword: String(form.get('currentPassword')),
            password: String(form.get('password')),
          }
        : {
            name: String(form.get('name')),
            lastName: String(form.get('lastName')),
            alias: String(form.get('alias')),
            useAlias: form.get('useAlias') === 'on',
          }
      const updated = await api.updateProfile(user._id, payload)
      client.setQueryData(['me'], updated)
      toast(
        password
          ? 'Password updated. Your other sessions have been signed out.'
          : 'Your profile is up to date.',
      )
      if (password) formElement.reset()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>MAKE YOURSELF AT HOME</div>
          <h1>
            Workspace settings<span className='heading-dot'>.</span>
          </h1>
          <p>A few details that make this space yours.</p>
        </div>
      </header>
      {error && (
        <div className='form-error' role='alert'>
          {error}
        </div>
      )}
      <div className='settings-grid'>
        <section className='panel settings-panel'>
          <div className='settings-title'>
            <span className='metric-icon'>
              <UserRound size={20} />
            </span>
            <div>
              <h2>Your profile</h2>
              <p className='muted small'>The person behind the connections.</p>
            </div>
          </div>
          <form onSubmit={(e) => submit(e)}>
            <div className='form-row'>
              <label>
                First name
                <input name='name' defaultValue={user.name} required maxLength={200} />
              </label>
              <label>
                Last name
                <input name='lastName' defaultValue={user.lastName} required maxLength={200} />
              </label>
            </div>
            <label>
              Email address
              <input value={user.email} readOnly type='email' />
              <small>Your account’s sign-in email.</small>
            </label>
            <label>
              Link alias
              <input
                name='alias'
                defaultValue={user.alias || 'q'}
                required
                maxLength={40}
                pattern='[a-zA-Z0-9_-]+'
              />
              <small>Letters, numbers, underscores and hyphens.</small>
            </label>
            <label className='checkbox-label'>
              <input name='useAlias' type='checkbox' defaultChecked={user.useAlias} />
              Use my alias for new QR links
            </label>
            <p className='muted small'>Existing printed QR codes keep their original scan links.</p>
            <button className='btn btn-primary' disabled={busy}>
              <Check size={16} />
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>
        <section className='panel settings-panel'>
          <div className='settings-title'>
            <span className='metric-icon metric-peach'>
              <LockKeyhole size={20} />
            </span>
            <div>
              <h2>Password & security</h2>
              <p className='muted small'>Keep your workspace in good hands.</p>
            </div>
          </div>
          <form onSubmit={(e) => submit(e, true)}>
            <label>
              Current password
              <input
                name='currentPassword'
                type='password'
                autoComplete='current-password'
                required
                maxLength={128}
              />
            </label>
            <label>
              New password
              <input
                name='password'
                type='password'
                autoComplete='new-password'
                required
                minLength={12}
                maxLength={128}
              />
              <small>Use 12–128 characters.</small>
            </label>
            <div className='security-note'>
              <LockKeyhole size={18} />
              <p>
                Changing your password signs out your other sessions. You’ll stay signed in on this
                device.
              </p>
            </div>
            <button className='btn btn-secondary' disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
