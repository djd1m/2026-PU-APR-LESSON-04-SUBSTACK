'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from './api'

export interface User {
  id: string
  name: string
  email: string
  role: 'author' | 'reader' | 'admin'
  publicationSlug?: string
  avatarUrl?: string
  createdAt: string
}

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  name: string
  email: string
  password: string
}

interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  clearError: () => void
  setUser: (user: User) => void
}

function setTokenCookie(token: string) {
  document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

function clearTokenCookie() {
  document.cookie = 'auth_token=; path=/; max-age=0'
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.post<AuthResponse>('/auth/login', payload, {
            skipAuth: true,
          })
          setTokenCookie(data.accessToken)
          set({
            user: data.user,
            token: data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Ошибка входа'
          set({ error: message, isLoading: false })
          throw err
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.post<AuthResponse>('/auth/register', payload, {
            skipAuth: true,
          })
          setTokenCookie(data.accessToken)
          set({
            user: data.user,
            token: data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Ошибка регистрации'
          set({ error: message, isLoading: false })
          throw err
        }
      },

      logout: () => {
        clearTokenCookie()
        set({ user: null, token: null, isAuthenticated: false })
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true
        }
      },
    }
  )
)
