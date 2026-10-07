'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '@/lib/store'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { AuthProvider, useAuth } from '@/components/auth-provider'
import { db } from '@/lib/firebase'

type CartItem = Product & { size: string; quantity: number }
type CartContextValue = {
  items: CartItem[]
  addItem: (product: Product, size: string, quantity: number) => void
  removeItem: (id: string, size: string) => void
  updateQuantity: (id: string, size: string, quantity: number) => void
  clearCart: () => void
  count: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)
const CART_KEY = 'stampa-sur-cart'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  )
}

function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [syncedForUser, setSyncedForUser] = useState<string | null>(null)

  // 1. Cargar carrito desde LocalStorage al inicio (solo una vez)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {
      setItems([])
    }
    setHydrated(true)
  }, [])

  // 2. Guardar en LocalStorage cada vez que cambia el carrito
  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [hydrated, items])

  // 3. Sincronizar con Firestore SOLO cuando cambia el usuario (no en cada render)
  useEffect(() => {
    if (authLoading || !hydrated) return
    if (!user) {
      setSyncedForUser(null)
      return
    }
    if (syncedForUser === user.uid) return // ya sincronizamos para este usuario

    const sync = async () => {
      try {
        const ref = doc(db, 'usuarios', user.uid)
        const snap = await getDoc(ref)
        const remote: CartItem[] = Array.isArray(snap.data()?.carrito) ? snap.data()?.carrito : []

        // Si el carrito remoto está vacío, subimos el local
        // Si el carrito local está vacío, usamos el remoto
        // Si ambos tienen items, priorizamos el remoto (el usuario ya lo tenía guardado)
        let merged: CartItem[]
        if (remote.length === 0) {
          merged = items
        } else if (items.length === 0) {
          merged = remote
        } else {
          merged = remote // El remoto tiene prioridad para evitar duplicados
        }

        setItems(merged)
        await setDoc(ref, { carrito: merged }, { merge: true })
        setSyncedForUser(user.uid)
      } catch (error) {
        console.error('[Cart] Error sincronizando:', error)
      }
    }
    sync()
  }, [user, authLoading, hydrated, syncedForUser])

  // 4. Guardar en Firestore cada vez que cambia el carrito (si hay usuario)
  useEffect(() => {
    if (!hydrated || !user || syncedForUser !== user.uid) return
    const ref = doc(db, 'usuarios', user.uid)
    setDoc(ref, { carrito: items }, { merge: true }).catch((err) =>
      console.error('[Cart] Error guardando:', err)
    )
  }, [items, user, hydrated, syncedForUser])

  const addItem = (product: Product, size: string, quantity: number) => {
    setItems((current) => {
      const found = current.find((item) => item.id === product.id && item.size === size)
      if (found) {
        return current.map((item) =>
          item === found
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        )
      }
      return [...current, { ...product, size, quantity }]
    })
  }

  const removeItem = (id: string, size: string) => {
    setItems((current) => current.filter((item) => !(item.id === id && item.size === size)))
  }

  const updateQuantity = (id: string, size: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id && item.size === size
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
          : item
      )
    )
  }

  const clearCart = () => setItems([])

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    }),
    [items]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de Providers')
  return context
}