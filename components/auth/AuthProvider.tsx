import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearStoredSession, readStoredSession, writeStoredSession } from 'lib/auth-storage'

type AuthContextValue = {
  isReady: boolean
  isAuthenticated: boolean
  username: string
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>
  logout: () => Promise<void>
  hasCredentialsConfigured: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const configuredUsername = process.env.EXPO_PUBLIC_BASIC_AUTH_USERNAME?.trim() || ''
const configuredPassword = process.env.EXPO_PUBLIC_BASIC_AUTH_PASSWORD?.trim() || ''

function fingerprint(value: string) {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

function makeSessionValue(username: string, password: string) {
  return fingerprint(`${username}::${password}::hc-auth-v1`)
}

const configuredSessionValue = configuredUsername && configuredPassword
  ? makeSessionValue(configuredUsername, configuredPassword)
  : ''

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      if (!configuredSessionValue) {
        if (!cancelled) {
          setIsAuthenticated(false)
          setIsReady(true)
        }
        return
      }

      const stored = await readStoredSession()
      if (!cancelled) {
        setIsAuthenticated(stored === configuredSessionValue)
        setIsReady(true)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    isReady,
    isAuthenticated,
    username: configuredUsername,
    hasCredentialsConfigured: Boolean(configuredUsername && configuredPassword),
    async login(username, password) {
      const normalizedUsername = username.trim()
      const normalizedPassword = password.trim()

      if (!configuredUsername || !configuredPassword) {
        return { ok: false, message: 'Auth is not configured. Add EXPO_PUBLIC_BASIC_AUTH_USERNAME and EXPO_PUBLIC_BASIC_AUTH_PASSWORD.' }
      }

      if (normalizedUsername !== configuredUsername || normalizedPassword !== configuredPassword) {
        return { ok: false, message: 'Invalid ID or password.' }
      }

      await writeStoredSession(configuredSessionValue)
      setIsAuthenticated(true)
      return { ok: true }
    },
    async logout() {
      await clearStoredSession()
      setIsAuthenticated(false)
    },
  }), [isAuthenticated, isReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthSession() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuthSession must be used within AuthProvider')
  }
  return value
}
