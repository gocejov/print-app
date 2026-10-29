import { useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUpRight, Link2, ScanLine, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from './use-auth'
import { Brand } from '../../components/brand'
import { QrPreview } from '../../components/qr-preview'

export function AuthPage() {
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const auth = useAuth()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const email = String(form.get('email')),
        password = String(form.get('password'))
      const user = register
        ? await api.register({
            name: String(form.get('name')),
            lastName: String(form.get('lastName')),
            email,
            password,
          })
        : await api.login(email, password)
      auth.authenticated(user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className='auth-layout'>
      <section className='auth-story'>
        <Brand />
        <div className='auth-pitch'>
          <span className='eyebrow'>SMALL CODE. BIG POSSIBILITIES.</span>
          <h1>
            A better way
            <br />
            to connect
            <br />
            <span>the dots.</span>
          </h1>
          <p>
            Turn a simple scan into your next connection.
            <br />
            Create once. Keep the possibilities open.
          </p>
          <div className='auth-qr-art'>
            <div className='orbit orbit-one' />
            <div className='orbit orbit-two' />
            <div className='auth-floating-link'>
              <Link2 size={16} />
              <span>Your next great idea</span>
              <ArrowUpRight size={16} />
            </div>
            <div className='auth-qr-card'>
              <QrPreview value='https://qr2share.example' />
              <span>One scan. A new connection.</span>
            </div>
            <div className='auth-floating-scan'>
              <ScanLine size={18} />
              <span>Always connected</span>
              <span className='live-dot' />
            </div>
          </div>
        </div>
        <span className='auth-footer'>Built for the things you want to share.</span>
      </section>
      <section className='auth-form-side'>
        <div className='auth-form-wrap'>
          <span className='pill'>
            <ShieldCheck size={14} /> YOUR QR WORKSPACE
          </span>
          <h2>{register ? 'Make your first connection.' : 'Welcome back.'}</h2>
          <p className='muted'>
            {register
              ? 'A few details, then you’re ready to create.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <div className='form-row'>
                <label>
                  First name
                  <input
                    name='name'
                    autoComplete='given-name'
                    maxLength={200}
                    required
                    placeholder='Alex'
                  />
                </label>
                <label>
                  Last name
                  <input
                    name='lastName'
                    autoComplete='family-name'
                    maxLength={200}
                    required
                    placeholder='Morgan'
                  />
                </label>
              </div>
            )}
            <label>
              Email address
              <input
                name='email'
                type='email'
                autoComplete='username'
                maxLength={254}
                required
                placeholder='you@company.com'
              />
            </label>
            <label>
              Password
              <input
                name='password'
                type='password'
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={register ? 12 : 1}
                maxLength={128}
                required
                placeholder={register ? 'At least 12 characters' : 'Enter your password'}
              />
            </label>
            {error && (
              <div className='form-error' role='alert'>
                {error}
              </div>
            )}
            <button className='btn btn-primary full' disabled={busy}>
              {busy
                ? 'Connecting…'
                : register
                  ? 'Create your account'
                  : 'Sign in to your workspace'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className='auth-switch'>
            {register ? 'Already have an account?' : 'New to QR2Share?'}{' '}
            <button
              onClick={() => {
                setRegister(!register)
                setError('')
              }}
            >
              {register ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className='auth-small'>
            <ShieldCheck size={14} /> Your workspace is private. Your connections are yours.
          </p>
        </div>
      </section>
    </main>
  )
}
