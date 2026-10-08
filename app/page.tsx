'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { CursorGlow, ScrollReveal } from '@/components/motion-effects'
import { ShirtCustomizer as Configurator } from '@/components/shirt-customizer'
import { ShopHeader } from '@/components/shop-header'
import { db } from '@/lib/firebase'
import { formatPrice } from '@/lib/store'

const logoUrl = 'https://i.ibb.co/FtTQmgC/Chat-GPT-Image-6-oct-2026-04-55-52-a-m.png'

type Producto = {
  id: string
  nombre: string
  precio: number
  descuento: number
  categoria: string
  imagenUrl: string
  createdAt: number
}

export default function Page() {
  const [productos, setProductos] = useState<Producto[]>([])

  useEffect(() => {
    const cargar = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'productos'))
        const lista: Producto[] = snapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            nombre: d.nombre ?? '',
            precio: d.precio ?? 0,
            descuento: d.descuento ?? 0,
            categoria: d.categoria ?? '',
            imagenUrl: d.imagenUrl ?? '',
            createdAt: d.createdAt?.toMillis?.() ?? 0,
          }
        })
        lista.sort((a, b) => b.createdAt - a.createdAt)
        setProductos(lista)
      } catch (error) {
        console.error('Error cargando productos:', error)
      }
    }
    cargar()
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-[#f2f0eb]">
      <CursorGlow />
      <ShopHeader />

      {/* Hero */}
      <section className="relative isolate flex min-h-[calc(100vh-5rem)] items-center border-b border-white/10 px-5 py-20 lg:px-10">
        <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 50% 45%, #c9a961 0, transparent 34%)' }} />
        <Image src={logoUrl} alt="" aria-hidden width={900} height={900} className="dragon-breathe pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(92vw,900px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-25" unoptimized />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
          <ScrollReveal className="max-w-2xl">
            <p className="mb-8 text-[10px] uppercase tracking-[0.45em] text-[#c8b995]">Hecho en el sur · Desde 2026</p>
            <h1 className="font-serif text-6xl leading-[0.9] tracking-[-0.04em] sm:text-8xl lg:text-[9.5rem]">Vestí tu<br /><span className="text-[#c8b995]">identidad.</span></h1>
            <p className="mt-9 max-w-md text-sm leading-7 text-white/55">Remeras estampadas con identidad propia. Diseños fuera de lo común.</p>
            <motion.div whileHover={{ y: -2, boxShadow: '0 0 24px rgba(201,169,97,0.2)' }} whileTap={{ scale: 0.97 }} className="mt-10 inline-flex">
              <Link href="/tienda" className="inline-flex items-center gap-4 border border-[#c8b995] px-6 py-4 text-[10px] uppercase tracking-[0.3em] text-[#c8b995] transition hover:bg-[#c8b995] hover:text-black">
                Explorar colección <ArrowRight className="size-4" />
              </Link>
            </motion.div>
          </ScrollReveal>
          <div className="relative mx-auto flex max-w-107.5 items-center justify-center" aria-hidden>
            <div className="size-[70%] rounded-full border border-dashed border-[#c8b995]/20 opacity-40" />
          </div>
        </div>
        <div className="absolute bottom-8 left-5 flex items-center gap-4 text-[9px] uppercase tracking-[0.3em] text-white/35 lg:left-10">
          <span className="h-px w-10 bg-white/30" /> Scroll para descubrir
        </div>
      </section>

      {/* Configurador */}
      <Configurator />

      {/* Piezas destacadas */}
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-10" id="colecciones">
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Selección editorial</p>
            <h2 className="font-serif text-4xl sm:text-5xl">Piezas destacadas</h2>
          </div>
          <Link href="/tienda" className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/55 hover:text-[#c8b995] sm:flex">
            Ver todo <ArrowRight className="size-4" />
          </Link>
        </div>

        {productos.length === 0 ? (
          <div className="border border-white/10 bg-[#111] p-12 text-center text-sm text-white/40">
            Todavía no hay productos cargados.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3">
            {productos.slice(0, 3).map((producto, index) => (
              <ScrollReveal key={producto.id} delay={index * 0.08}>
                <motion.article whileHover={{ y: -5 }} className="group">
                  <Link href={`/producto/${producto.id}`}>
                    <div className="relative aspect-[0.84] overflow-hidden bg-[#151515]">
                      {producto.imagenUrl ? (
                        <Image
                          src={producto.imagenUrl}
                          alt={producto.nombre}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-40 rounded-full border border-[#c8b995]/15" />
                          <span className="absolute font-serif text-5xl text-white/10">{String(index + 1).padStart(2, '0')}</span>
                        </div>
                      )}

                      {/* Badge de descuento */}
                      {producto.descuento > 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                          -{producto.descuento}%
                        </span>
                      )}

                      <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-center p-5 transition-transform group-hover:translate-y-0">
                        <span className="bg-[#f2f0eb] px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-black">Ver producto</span>
                      </div>
                    </div>
                    <div className="flex items-start justify-between pt-4">
                      <div>
                        <h3 className="font-serif text-xl">{producto.nombre}</h3>
                        <p className="mt-1 text-xs text-white/45">{producto.categoria}</p>
                      </div>
                      {producto.descuento > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-white/30 line-through">{formatPrice(producto.precio)}</span>
                          <span className="text-sm font-semibold text-[#c8b995]">
                            {formatPrice(producto.precio * (1 - producto.descuento / 100))}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#c8b995]">{formatPrice(producto.precio)}</span>
                      )}
                    </div>
                  </Link>
                </motion.article>
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {/* Nuestra esencia + Instagram */}
      <section className="border-y border-white/10 bg-[#11100e] px-5 py-24 lg:px-10">
        <ScrollReveal className="mx-auto max-w-7xl">
          <a href="https://www.instagram.com/stampa.sur/" target="_blank" rel="noopener noreferrer" className="mb-10 inline-flex w-fit items-center gap-3 border border-[#c8b995] px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-[#c8b995] transition hover:bg-[#c8b995] hover:text-black hover:shadow-[0_0_24px_rgba(201,169,97,0.2)]">
            <span aria-hidden className="instagram-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            Seguinos en Instagram
          </a>
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1fr]">
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Nuestra esencia</p>
              <h2 className="max-w-lg font-serif text-5xl leading-none sm:text-7xl">No seguimos<br /><i>tendencias.</i></h2>
            </div>
            <p className="max-w-md self-end text-sm leading-8 text-white/55">Creamos prendas para quienes eligen caminar su propio camino. Una colección pensada para durar, diseñada en el sur y estampada con carácter.</p>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer id="contacto" className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-end sm:justify-between lg:px-10">
        <div className="flex items-center gap-4">
          <Image src={logoUrl} alt="Logo de Stampa Sur" width={80} height={80} className="size-12 object-contain" unoptimized />
          <div>
            <p className="font-serif text-2xl tracking-[0.16em]">STAMPA SUR</p>
            <p className="mt-2 text-xs text-white/40">Remeras con identidad propia.</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-white/50">
          <a href="https://www.instagram.com/stampa.sur/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-[#c8b995]">
            <span aria-hidden className="instagram-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </a>
          <span className="text-[10px] uppercase tracking-[0.25em]">Buenos Aires, Argentina</span>
        </div>
      </footer>
    </main>
  )
}