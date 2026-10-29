import { Component, type ErrorInfo, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }
  render() {
    if (this.state.failed)
      return (
        <main className='fatal-error'>
          <h1>Something didn’t load as expected.</h1>
          <p>Your saved QR codes are still in your workspace.</p>
          <button className='btn btn-primary' onClick={() => window.location.reload()}>
            Reload workspace
          </button>
        </main>
      )
    return this.props.children
  }
}
