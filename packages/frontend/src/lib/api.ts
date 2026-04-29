const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  // Try cookie first
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
  if (match) return decodeURIComponent(match[1])
  // Fallback: read from Zustand persisted localStorage
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token ?? null
    }
  } catch {}
  return null
}

function setTokenCookie(token: string): void {
  document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

function updateStoredToken(newToken: string): void {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.state) {
        parsed.state.token = newToken
        localStorage.setItem('auth-storage', JSON.stringify(parsed))
      }
    }
  } catch {}
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
  _isRetry?: boolean
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!response.ok) return null
    const data = await response.json() as { accessToken?: string }
    if (data.accessToken) {
      setTokenCookie(data.accessToken)
      updateStoredToken(data.accessToken)
      return data.accessToken
    }
    return null
  } catch {
    return null
  }
}

export async function fetchAPI<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, _isRetry = false, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  }

  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...rest,
  })

  // Auto-refresh on 401 (once)
  if (response.status === 401 && !skipAuth && !_isRetry) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      // Retry with new token
      return fetchAPI<T>(path, { ...options, _isRetry: true })
    }
    // Refresh failed — clear auth state and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage')
      document.cookie = 'auth_token=; path=/; max-age=0'
      window.location.href = '/auth/login'
    }
  }

  if (!response.ok) {
    let errorData: unknown
    try {
      errorData = await response.json()
    } catch {
      errorData = null
    }
    const message =
      (errorData as { message?: string })?.message ?? `HTTP ${response.status}`
    throw new ApiError(response.status, message, errorData)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// API helpers
export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    fetchAPI<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body: unknown, options?: FetchOptions) =>
    fetchAPI<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown, options?: FetchOptions) =>
    fetchAPI<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(path: string, body: unknown, options?: FetchOptions) =>
    fetchAPI<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: FetchOptions) =>
    fetchAPI<T>(path, { method: 'DELETE', ...options }),
}
