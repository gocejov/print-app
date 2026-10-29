import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export function useCollections() {
  const client = useQueryClient()
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => api.categories(signal),
  })
  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: ({ signal }) => api.campaigns(signal),
  })
  return {
    categories: categories.data || [],
    campaigns: campaigns.data || [],
    loading: categories.isPending || campaigns.isPending,
    error: categories.error || campaigns.error,
    refresh: () =>
      Promise.all(
        ['categories', 'campaigns', 'codes'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  }
}
