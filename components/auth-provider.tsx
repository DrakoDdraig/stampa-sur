'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { usePathname, useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'

type AuthContextValue = { user: User | null; role: string | null; loading: boolean; logout: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser)
    try {
      if (nextUser) {
        const snapshot = await getDoc(doc(db, 'usuarios', nextUser.uid))
        setRole(snapshot.exists() ? String(snapshot.data().rol ?? 'cliente') : 'cliente')
      } else setRole(null)
    } finally {
      setLoading(false)
    }
  }), [])

  useEffect(() => {
    if (loading) return

    // Rutas que requieren estar logueado
    const requiresAuth = pathname.startsWith('/admin') || pathname.startsWith('/mi-cuenta')

    // Si requiere auth y no está logueado → al login
    if (requiresAuth && !user) {
      router.replace('/login')
      return
    }

    // Si está logueado y va a /login → al home
    if (user && pathname === '/login') {
  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')
  router.replace(redirect || '/')
  return
}

    // Si está logueado, va a /admin y NO es admin → al home
    if (user && pathname.startsWith('/admin') && role !== 'admin') {
      router.replace('/')
      return
    }
  }, [loading, pathname, role, router, user])

  const value = useMemo(() => ({ user, role, loading, logout: () => signOut(auth) }), [loading, role, user])
  if (loading && pathname !== '/login') return <div className="flex min-h-screen items-center justify-center bg-[#080808] text-[#c8b995]">Cargando sesión...</div>
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}