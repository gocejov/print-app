import type { AssetFile, Campaign, Category, Product, QrCode, Scan, User } from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })
  if (response.status === 401 && path !== '/users/login')
    window.dispatchEvent(new Event('qr2share:session-expired'))
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error || data.message || 'Something went wrong. Please try again.',
    )
  return data as T
}

export const api = {
  me: async (signal?: AbortSignal) => {
    try {
      return await request<User>('/users/me', { signal })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  login: (email: string, password: string) =>
    request<User>('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { name: string; lastName: string; email: string; password: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/users/logout', { method: 'POST', body: '{}' }),
  codes: (signal?: AbortSignal) => request<QrCode[]>('/qrcodes/with-options', { signal }),
  scans: (signal?: AbortSignal) => request<Scan[]>('/statistics', { signal }),
  categories: (signal?: AbortSignal) => request<Category[]>('/categories', { signal }),
  campaigns: (signal?: AbortSignal) => request<Campaign[]>('/campaigns', { signal }),
  saveCategory: (data: { name: string; description: string; products: string[] }, id?: string) =>
    request<Category>(`/categories${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),
  saveCampaign: (
    data: {
      name: string
      description: string
      entries: Campaign['entries']
      productWeights?: Campaign['productWeights']
      rule: 'random'
      status: Campaign['status']
    },
    id?: string,
  ) =>
    request<Campaign>(`/campaigns${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request<Category>(`/categories/${id}`, { method: 'DELETE', body: '{}' }),
  deleteCampaign: (id: string) =>
    request<Campaign>(`/campaigns/${id}`, { method: 'DELETE', body: '{}' }),
  createCampaignCode: (name: string, campaignId: string) =>
    request<QrCode>('/qrcodes', { method: 'POST', body: JSON.stringify({ name, campaignId }) }),
  files: (signal?: AbortSignal) => request<AssetFile[]>('/files', { signal }),
  products: (signal?: AbortSignal) => request<Product[]>('/products/with-options', { signal }),
  createUrlFile: (name: string, url: string) =>
    request<AssetFile>('/files', {
      method: 'POST',
      body: JSON.stringify({ name, type: 'web-url', url }),
    }),
  uploadFile: async (userId: string, type: 'image' | 'video', name: string, file: File) => {
    const body = new FormData()
    body.append('name', name)
    body.append(type, file)
    return (
      await request<{ file: AssetFile }>(`/upload/${type}/${userId}`, { method: 'POST', body })
    ).file
  },
  editFile: (id: string, changes: { name: string; url?: string }) =>
    request<AssetFile>(`/files/${id}`, { method: 'PUT', body: JSON.stringify(changes) }),
  deleteFile: (id: string) => request<AssetFile>(`/files/${id}`, { method: 'DELETE', body: '{}' }),
  createProduct: async (name: string, description: string, fileId: string) =>
    (
      await request<{ product: Product }>('/products/create/', {
        method: 'POST',
        body: JSON.stringify({ name, description, fileId }),
      })
    ).product,
  editProduct: (id: string, data: { name: string; description: string; fileId: string }) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request<Product>(`/products/${id}`, { method: 'DELETE', body: '{}' }),
  createCode: (name: string, productId: string) =>
    request<QrCode>('/qrcodes', { method: 'POST', body: JSON.stringify({ name, productId }) }),
  editCode: (
    id: string,
    data: {
      name?: string
      status?: 'active' | 'paused'
      destinationUrl?: string
      productId?: string
      campaignId?: string
    },
  ) => request<QrCode>(`/qrcodes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCode: (id: string) => request<QrCode>(`/qrcodes/${id}`, { method: 'DELETE', body: '{}' }),
  updateProfile: (id: string, data: Record<string, unknown>) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}
