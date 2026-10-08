'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Minus, Plus, MessageCircle, ShoppingBag, AlertCircle } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatPrice, whatsappNumber } from '@/lib/store'
import { useCart } from '@/app/providers'
import { ShopHeader } from '@/components/shop-header'

type ProductoFirestore = {
  id: string
  nombre: string
  descripcion: string
  precio: number
  descuento: number
  categoria: string
  imagenUrl: string
  stock: number
  destacado?: boolean
}

const TALLES_DEFAULT = ['S', 'M', 'L', 'XL', 'XXL']

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const [producto, setProducto] = useState<ProductoFirestore | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [size, setSize] = useState('M')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    if (!params?.id) return
    const cargar = async () => {
      try {
        const ref = doc(db, 'productos', params.id)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        const d = snap.data()
        setProducto({
          id: snap.id,
          nombre: d.nombre ?? 'Sin nombre',
          descripcion: d.descripcion ?? '',
          precio: d.precio ?? 0,
          descuento: d.descuento ?? 0,
          categoria: d.categoria ?? 'Sin categoría',
          imagenUrl: d.imagenUrl ?? '',
          stock: d.stock ?? 0,
          destacado: d.destacado ?? false,
        })
      } catch (error) {
        console.error('Error cargando producto:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [params?.id])

  // Estados de carga / no encontrado
  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
        <ShopHeader />
        <div className="flex min-h-[60vh] items-center justify-center text-[#c8b995]">Cargando producto...</div>
      </main>
    )
  }

  if (notFound || !producto) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
        <ShopHeader />
        <section className="mx-auto max-w-3xl px-5 py-24 text-center lg:px-10">
          <AlertCircle className="mx-auto size-10 text-[#c8b995]" />
          <h1 className="mt-6 font-serif text-4xl">Producto no encontrado</h1>
          <p className="mt-4 text-sm text-white/50">El producto que buscás no existe o fue eliminado.</p>
          <Link href="/tienda" className="mt-8 inline-block border border-[#c8b995] px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-[#c8b995] hover:bg-[#c8b995] hover:text-black">
            Volver a la tienda
          </Link>
        </section>
      </main>
    )
  }

  const tallesDisponibles = TALLES_DEFAULT
  const disponible = producto.stock > 0
  const precioConDescuento = producto.descuento > 0
    ? producto.precio * (1 - producto.descuento / 100)
    : producto.precio
  const tieneDescuento = producto.descuento > 0

  return (
    <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
      <ShopHeader />
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10">
        <Link href="/tienda" className="mb-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-[#c8b995]">
          <ArrowLeft className="size-4" /> Volver a la tienda
        </Link>

        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          {/* Imagen */}
          <div className="relative flex min-h-125 items-center justify-center overflow-hidden bg-[#151515]">
            {producto.imagenUrl ? (
              <img
                src={producto.imagenUrl}
                alt={producto.nombre}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <>
                <div className="absolute size-[72%] rounded-full border border-white/10" />
                <span className="font-serif text-[9rem] text-white/10">✦</span>
              </>
            )}

            {/* Badge de descuento */}
            {tieneDescuento && (
              <span className="absolute left-5 top-5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">
                -{producto.descuento}%
              </span>
            )}

            <span className="absolute bottom-7 left-7 text-[10px] uppercase tracking-[0.35em] text-white/60">
              Stampa Sur / {producto.categoria}
            </span>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#c8b995]">
              {producto.categoria} · {disponible ? `${producto.stock} disponibles` : 'Sin stock'}
            </p>
            <h1 className="mt-4 font-serif text-5xl sm:text-7xl">{producto.nombre}</h1>

            {/* Precio con descuento */}
            {tieneDescuento ? (
              <div className="mt-5 flex items-center gap-3">
                <span className="text-lg text-white/40 line-through">{formatPrice(producto.precio)}</span>
                <span className="text-2xl font-semibold text-[#c8b995]">{formatPrice(precioConDescuento)}</span>
                <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                  -{producto.descuento}%
                </span>
              </div>
            ) : (
              <p className="mt-5 text-xl text-[#c8b995]">{formatPrice(producto.precio)}</p>
            )}

            {producto.descripcion && (
              <p className="mt-8 max-w-lg text-sm leading-8 text-white/55">{producto.descripcion}</p>
            )}

            {/* Talle */}
            <div className="mt-10 border-t border-white/10 pt-7">
              <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/50">Talle</p>
              <div className="flex gap-2">
                {tallesDisponibles.map((item) => (
                  <button
                    key={item}
                    onClick={() => setSize(item)}
                    className={`size-11 border text-xs transition ${
                      size === item
                        ? 'border-[#c8b995] bg-[#c8b995] text-black'
                        : 'border-white/20 text-white/65 hover:border-white/60'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            <div className="mt-7 flex items-center gap-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Cantidad</p>
              <div className="flex items-center border border-white/20">
                <button aria-label="Quitar" className="p-3" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="size-3" />
                </button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button aria-label="Agregar" className="p-3" onClick={() => setQuantity(Math.min(producto.stock, quantity + 1))} disabled={!disponible}>
                  <Plus className="size-3" />
                </button>
              </div>
            </div>

            {/* Botón agregar */}
            <button
              onClick={() => {
                if (!disponible) return
                addItem(
                  {
                    id: producto.id,
                    name: producto.nombre,
                    description: producto.descripcion,
                    price: precioConDescuento,
                    category: producto.categoria,
                    color: 'Negro',
                    sizes: tallesDisponibles,
                    stock: producto.stock,
                    imageUrl: producto.imagenUrl,
                    tone: 'black',
                  },
                  size,
                  quantity
                )
                setAdded(true)
              }}
              disabled={!disponible}
              className="mt-9 inline-flex items-center justify-center gap-3 bg-[#f2f0eb] px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-black transition hover:bg-[#c8b995] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="size-4" />
              {!disponible ? 'Sin stock' : added ? 'Agregado al carrito' : 'Agregar al carrito'}
            </button>
              {/* Botón de compra directa por WhatsApp */}
<button
  type="button"
  onClick={() => {
    const mensaje = `Hola Stampa Sur! Quiero comprar esta remera:\n\n👕 Producto: ${producto.nombre}\n📏 Talle: ${size}\n🎨 Color: ${producto.categoria}\n🔢 Cantidad: ${quantity}\n💰 Precio unitario: ${formatPrice(precioConDescuento)}\n💵 Total: ${formatPrice(precioConDescuento * quantity)}\n\n¿Me confirmás disponibilidad?`
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer')
  }}
  disabled={!disponible}
  className="mt-3 inline-flex w-full items-center justify-center gap-3 border border-[#c8b995]/50 px-6 py-4 text-[10px] uppercase tracking-[0.25em] text-[#c8b995] transition hover:border-[#c8b995] hover:bg-[#c8b995]/5 disabled:cursor-not-allowed disabled:opacity-50"
>
  <MessageCircle className="size-4" /> Comprar esta remera
</button>
           
          </div>
        </div>
      </section>
    </main>
  )
}