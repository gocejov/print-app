import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {})
export const useToast = () => useContext(ToastContext)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: true } },
})

export function Providers({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; error: boolean; id: number }>()
  useEffect(() => {
    const expire = () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
      queryClient.setQueryData(['me'], null)
    }
    window.addEventListener('qr2share:session-expired', expire)
    return () => window.removeEventListener('qr2share:session-expired', expire)
  }, [])
  function notify(message: string, error = false) {
    const id = Date.now()
    setToast({ message, error, id })
    window.setTimeout(() => setToast((current) => (current?.id === id ? undefined : current)), 5000)
  }
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename='/admin'>
        <ToastContext.Provider value={notify}>
          {children}
          {toast && (
            <div
              className={`toast ${toast.error ? 'toast-error' : ''}`}
              role={toast.error ? 'alert' : 'status'}
            >
              {toast.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
              <span>{toast.message}</span>
              <button aria-label='Dismiss notification' onClick={() => setToast(undefined)}>
                <X size={17} />
              </button>
            </div>
          )}
        </ToastContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
