import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, User } from '../types'
import { login as loginService, verifyToken } from '../services/auth'

interface AuthState {
  user: User | null
  token: string | null
  ready: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; message: string }>
  logout: () => void
  setUser: (user: User) => void
}

const STORAGE_KEY = 'dialysis_auth'
const AuthContext = createContext<AuthState | null>(null)

export function canAccessView(view: 'nurse' | 'pharmacy', role: Role | undefined): boolean {
  if (!role) return false
  if (role === 'admin') return true
  if (view === 'nurse') return role === 'nurse' || role === 'pharmacist'
  if (view === 'pharmacy') return role === 'pharmacist'
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setReady(true)
      return
    }
    try {
      const { token: savedToken } = JSON.parse(stored) as { token: string }
      verifyToken(savedToken).then((res) => {
        if (res.status === 'success' && res.user) {
          setUserState(res.user)
          setToken(savedToken)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
        setReady(true)
      })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setReady(true)
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      ready,
      async login(username, password) {
        const res = await loginService(username, password)
        if (res.status === 'success' && res.user && res.token) {
          setUserState(res.user)
          setToken(res.token)
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token }))
          return { ok: true, message: res.message || 'เข้าสู่ระบบสำเร็จ' }
        }
        return { ok: false, message: res.message || 'เข้าสู่ระบบไม่สำเร็จ' }
      },
      logout() {
        setUserState(null)
        setToken(null)
        localStorage.removeItem(STORAGE_KEY)
      },
      setUser(next: User) {
        setUserState(next)
      },
    }),
    [user, token, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
