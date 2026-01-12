import type { ReactNode } from 'react'
import { createContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { authApi, userApi } from '../api/services'
import type { User } from '../api/types'

export type AuthContextValue = {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('authToken')
      if (token) {
        try {
          const response = await userApi.me()
          setUser(response.data)
          setIsAuthenticated(true)
        } catch {
          // Token invalid or expired, clear it
          sessionStorage.removeItem('authToken')
          sessionStorage.removeItem('refreshToken')
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string, remember?: boolean) => {
    setError(null)
    setIsLoading(true)

    try {
      // KRYTYCZNE: Wyczyść cache przed zalogowaniem nowego użytkownika
      queryClient.clear()
      
      const response = await authApi.login(email, password)
      const { access, refresh } = response.data

      // Store tokens
      sessionStorage.setItem('authToken', access)
      if (remember) {
        sessionStorage.setItem('refreshToken', refresh)
      }

      // Fetch user data
      const userResponse = await userApi.me()
      setUser(userResponse.data)
      setIsAuthenticated(true)
    } catch (err) {
      let message = 'Nieprawidłowy email lub hasło'
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        message = err.response.data.detail
      }
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    setError(null)
    setIsLoading(true)

    try {
      await authApi.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      })
      // Success - user will be redirected to login page by component
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        // Re-throw the error with response data so RegisterPage can handle field-specific errors
        throw err
      }
      // For non-axios errors, set generic message
      const message = 'Wystąpił błąd podczas rejestracji'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('refreshToken')
    // KRYTYCZNE: Wyczyść cache React Query aby dane poprzedniego użytkownika nie pozostały w pamięci
    queryClient.clear()
  }

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated, user, login, register, logout, isLoading, error }),
    [isAuthenticated, user, isLoading, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
