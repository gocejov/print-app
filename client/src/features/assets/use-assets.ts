import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export function useAssets() {
  const client = useQueryClient()
  const files = useQuery({ queryKey: ['files'], queryFn: ({ signal }) => api.files(signal) })
  const products = useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => api.products(signal),
  })
  const codes = useQuery({ queryKey: ['codes'], queryFn: ({ signal }) => api.codes(signal) })
  return {
    files: files.data || [],
    products: products.data || [],
    codes: codes.data || [],
    loading: files.isPending || products.isPending || codes.isPending,
    error: files.error || products.error || codes.error,
    refresh: () =>
      Promise.all(
        ['files', 'products', 'codes'].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ),
  }
}
