import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import api, { isLocalApp } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setCurrentUser: (user: User) => void
  startSession: (user: User, token: string) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => isLocalApp ? 'local-device' : localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => isLocalApp || Boolean(localStorage.getItem('token')))

  useEffect(() => {
    if (!token) return
    api.get<User>('/auth/me')
      .then(({ data }) => {
        setUser(data)
        localStorage.setItem('user', JSON.stringify(data))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [token])

  const setCurrentUser = (nextUser: User) => {
    setUser(nextUser)
    localStorage.setItem('user', JSON.stringify(nextUser))
  }

  const startSession = (nextUser: User, nextToken: string) => {
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  const login = async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>('/auth/login', { email, password, device_name: navigator.userAgent.slice(0, 100) })
    startSession(response.data.user, response.data.token)
  }

  const logout = () => {
    if (isLocalApp) return
    api.post('/auth/logout').finally(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      window.location.href = '/login'
    })
  }

  return <AuthContext.Provider value={{ user, token, login, logout, setCurrentUser, startSession, isLoading }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
