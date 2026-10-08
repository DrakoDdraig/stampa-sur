'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, Trash2, MessageCircle, AlertCircle } from 'lucide-react'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useCart } from '@/app/providers'
import { useAuth } from '@/components/auth-provider'
import { formatPrice, whatsappNumber } from '@/lib/store'
import { ShopHeader } from '@/components/shop-header'
import { db } from '@/lib/firebase'

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setError('')

    // 1. Verificar login
    if (!user) {
      router.push('/login?redirect=/carrito')
      return
    }

    setLoading(true)

    try {
      // 2. Leer datos del usuario
      const userRef = doc(db, 'usuarios', user.uid)
      const userSnap = await getDoc(userRef)
      const userData = userSnap.data() ?? {}

      // 3. Verificar que tenga datos de envío
      const faltantes: string[] = []
      if (!userData.telefono) faltantes.push('teléfono')
      if (!userData.direccion) faltantes.push('dirección')
      if (!userData.ciudad) faltantes.push('ciudad')
      if (!userData.codigoPostal) faltantes.push('código postal')

      if (faltantes.length > 0) {
        setError(`Completá tu ${faltantes.join(', ')} en "Mi cuenta" para poder finalizar la compra.`)
        setLoading(false)
        return
      }

      // 4. Guardar pedido en Firestore
      const orderRef = await addDoc(collection(db, 'pedidos'), {
        userId: user.uid,
        cliente: userData.nombre ?? user.email,
        email: user.email,
        telefono: userData.telefono,
        direccion: userData.direccion,
        ciudad: userData.ciudad,
        codigoPostal: userData.codigoPostal,
        productos: items.map((item) => ({
          id: item.id,
          nombre: item.name,
          talle: item.size,
          color: item.color,
          cantidad: item.quantity,
          precio: item.price,
        })),
        total,
        estado: 'pendiente',
        fecha: serverTimestamp(),
      })

      // 5. Armar mensaje de WhatsApp
      const productosTexto = items
        .map((item) => `- ${item.quantity}x ${item.name} Talle ${item.size} (${item.color}) - ${formatPrice(item.price)} c/u`)
        .join('\n')

const mensaje = `NUEVO PEDIDO - Stampa Sur\n\nCliente: ${userData.nombre ?? user.email}\nEmail: ${user.email}\nTeléfono: ${userData.telefono}\nDirección: ${userData.direccion}, ${userData.ciudad}, CP ${userData.codigoPostal}\n\nProductos:\n${productosTexto}\n\nTotal: ${formatPrice(total)}\n\nPedido #${orderRef.id.slice(0, 8).toUpperCase()}`
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`

      // 6. Vaciar carrito y abrir WhatsApp
      clearCart()
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

      // 7. Redirigir a mi-cuenta
      router.push('/mi-cuenta?pedido=ok')
    } catch (err) {
      console.error(err)
      setError('Hubo un error al procesar el pedido. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
      <ShopHeader />
      <section className="mx-auto max-w-5xl px-5 py-14 lg:px-10">
        <Link href="/tienda" className="mb-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-[#c8b995]">
          <ArrowLeft className="size-4" /> Seguir comprando
        </Link>

        <div className="flex items-end justify-between border-b border-white/10 pb-8">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Tu selección</p>
            <h1 className="font-serif text-5xl">Carrito<span className="text-[#c8b995]">.</span></h1>
          </div>
          <span className="text-sm text-white/45">{items.length} productos</span>
        </div>

        {items.length === 0 ? (
          <div className="py-28 text-center">
            <p className="font-serif text-3xl">Tu carrito está vacío.</p>
            <Link href="/tienda" className="mt-7 inline-block border border-[#c8b995] px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-[#c8b995]">
              Explorar colección
            </Link>
          </div>
        ) : (
          <div className="grid gap-12 py-10 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-5">
              {items.map((item) => (
                <article key={`${item.id}-${item.size}`} className="flex gap-5 border-b border-white/10 pb-5">
                  {/* Imagen del producto */}
                  <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden bg-[#171717]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="font-serif text-3xl text-[#c8b995]/60">✦</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <h2 className="font-serif text-xl">{item.name}</h2>
                      <p className="mt-1 text-xs text-white/45">Talle {item.size} · {item.color}</p>
                      <button onClick={() => removeItem(item.id, item.size)} className="mt-4 text-[10px] uppercase tracking-[0.15em] text-white/35 hover:text-red-300">
                        <Trash2 className="mr-1 inline size-3" />Eliminar
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-white/15">
                        <button aria-label="Disminuir cantidad" onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)} className="p-2"><Minus className="size-3" /></button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button aria-label="Aumentar cantidad" onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)} className="p-2"><Plus className="size-3" /></button>
                      </div>
                      <span className="w-24 text-right text-sm">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit border border-white/10 p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Resumen</p>
              <div className="mt-6 flex justify-between border-t border-white/10 pt-5">
                <span>Total</span>
                <strong className="font-serif text-2xl">{formatPrice(total)}</strong>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2 border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" />
                  <div>
                    {error}{' '}
                    <Link href="/mi-cuenta" className="underline">Ir a Mi cuenta</Link>
                  </div>
                </div>
              )}

              {!user ? (
                <div className="mt-7 flex flex-col gap-3 border border-[#c8b995]/30 bg-[#c8b995]/5 p-4">
                  <p className="text-xs leading-6 text-white/70">
                    Para finalizar tu compra necesitás <strong className="text-[#c8b995]">iniciar sesión</strong> o <strong className="text-[#c8b995]">crear una cuenta</strong>.
                  </p>
                  <Link
                    href="/login?redirect=/carrito"
                    className="inline-flex items-center justify-center gap-2 bg-[#c8b995] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[#e2d2a8]"
                  >
                    Iniciar sesión o registrarme
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={loading}
                  className="mt-7 flex w-full items-center justify-center gap-3 bg-[#c8b995] px-5 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-[#e2d2a8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageCircle className="size-4" />
                  {loading ? 'Procesando...' : 'Finalizar compra'}
                </button>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}