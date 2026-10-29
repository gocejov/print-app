import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { User } from '../../lib/types'

export function useAuth() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => api.me(signal),
    staleTime: 60_000,
  })
  return {
    user: query.data,
    loading: query.isPending,
    error: query.error,
    authenticated: (user: User) => {
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
      client.setQueryData(['me'], user)
    },
    logout: async () => {
      await api.logout()
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
      client.setQueryData(['me'], null)
    },
    retry: query.refetch,
  }
}
