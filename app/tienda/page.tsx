'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { db } from '@/lib/firebase'
import { ShopHeader } from '@/components/shop-header'
import { ScrollReveal } from '@/components/motion-effects'
import { formatPrice } from '@/lib/store'

type Producto = {
  id: string
  nombre: string
  precio: number
  categoria: string
  imagenUrl: string
  descripcion: string
  stock: number
  createdAt: number
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')

  useEffect(() => {
    const cargar = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'productos'))
        const lista: Producto[] = snapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            nombre: d.nombre ?? 'Sin nombre',
            precio: d.precio ?? 0,
            categoria: d.categoria ?? 'Sin categoría',
            imagenUrl: d.imagenUrl ?? '',
            descripcion: d.descripcion ?? '',
            stock: d.stock ?? 0,
            createdAt: d.createdAt?.toMillis?.() ?? 0,
          }
        })
        // Ordenar: más nuevo primero
        lista.sort((a, b) => b.createdAt - a.createdAt)
        setProductos(lista)
      } catch (error) {
        console.error('Error cargando productos:', error)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.categoria).filter(Boolean))
    return ['Todos', ...Array.from(set)]
  }, [productos])

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      const coincideCategoria = categoriaFiltro === 'Todos' || p.categoria === categoriaFiltro
      return coincideBusqueda && coincideCategoria
    })
  }, [productos, busqueda, categoriaFiltro])

  return (
    <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
      <ShopHeader />

      <section className="border-b border-white/10 px-5 py-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">La colección</p>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <h1 className="font-serif text-5xl leading-none sm:text-7xl">Tienda<span className="text-[#c8b995]">.</span></h1>
            <p className="max-w-xs text-sm leading-7 text-white/50">Prendas hechas para quienes llevan su identidad por delante.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar diseños"
              className="w-full border border-white/10 bg-transparent py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#c8b995]"
            />
          </div>
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="size-4 text-white/40" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="border border-white/10 bg-transparent px-4 py-3 text-xs uppercase tracking-[0.15em] text-white/70 outline-none focus:border-[#c8b995]"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0b0b0b]">{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mb-6 text-[10px] uppercase tracking-[0.3em] text-white/35">
          {loading ? 'Cargando...' : `${productosFiltrados.length} piezas disponibles`}
        </p>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[0.84] animate-pulse bg-[#151515]" />
            ))}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="border border-white/10 bg-[#111] p-12 text-center">
            <p className="text-sm text-white/40">No hay productos disponibles todavía.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productosFiltrados.map((producto, index) => (
              <ScrollReveal key={producto.id} delay={index * 0.05}>
                <article className="group">
                  <Link href={`/producto/${producto.id}`} className="block">
                    <div className="relative aspect-[0.84] overflow-hidden bg-[#151515]">
                      {producto.imagenUrl ? (
                        <Image
                          src={producto.imagenUrl}
                          alt={producto.nombre}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-40 rounded-full border border-[#c8b995]/15" />
                          <span className="absolute font-serif text-5xl text-white/10">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-center p-5 transition-transform group-hover:translate-y-0">
                        <span className="bg-[#f2f0eb] px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-black">
                          Ver producto
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between pt-4">
                      <div>
                        <h3 className="font-serif text-xl">{producto.nombre}</h3>
                        <p className="mt-1 text-xs text-white/45">{producto.categoria}</p>
                      </div>
                      <span className="text-sm text-[#c8b995]">{formatPrice(producto.precio)}</span>
                    </div>
                  </Link>
                </article>
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-center text-xs text-white/30 lg:px-10">
        <p>Stampa Sur · Buenos Aires, Argentina</p>
      </footer>
    </main>
  )
}