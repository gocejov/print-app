import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export function useWorkspace() {
  const client = useQueryClient()
  const codes = useQuery({ queryKey: ['codes'], queryFn: ({ signal }) => api.codes(signal) })
  const scans = useQuery({
    queryKey: ['scans'],
    queryFn: ({ signal }) => api.scans(signal),
    refetchInterval: 60_000,
  })
  return {
    codes: codes.data || [],
    scans: scans.data || [],
    loading: codes.isPending || scans.isPending,
    error: codes.error || scans.error,
    refresh: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['codes'] }),
        client.invalidateQueries({ queryKey: ['scans'] }),
      ]),
  }
}
