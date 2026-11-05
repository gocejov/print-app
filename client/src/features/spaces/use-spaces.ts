import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
export function useSpaces() {
  const client = useQueryClient()
  const plugins = useQuery({ queryKey: ['plugins'], queryFn: ({ signal }) => api.plugins(signal) })
  const spaces = useQuery({ queryKey: ['spaces'], queryFn: ({ signal }) => api.spaces(signal) })
  return {
    plugins,
    spaces,
    refresh: () =>
      Promise.all(
        ['spaces', 'games', 'codes'].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ),
  }
}
