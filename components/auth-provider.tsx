'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
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

  // 1. Detectar login/logout
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

  // 2. Escuchar el documento del usuario en tiempo real (para que el rol se actualice sin cerrar sesión)
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'usuarios', user.uid)
    const unsubscribeDoc = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        setRole(String(snapshot.data().rol ?? 'cliente'))
      } else {
        setRole('cliente')
      }
    }, (error) => {
      console.error('Error escuchando el documento del usuario:', error)
    })
    return () => unsubscribeDoc()
  }, [user])

  // 3. Redirecciones según el rol y la ruta
  useEffect(() => {
    if (loading) return

    const requiresAuth = pathname.startsWith('/admin') || pathname.startsWith('/mi-cuenta')

    if (requiresAuth && !user) {
      router.replace('/login')
      return
    }

    if (user && pathname === '/login') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      router.replace(redirect || '/')
      return
    }

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