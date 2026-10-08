'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { ArrowLeft, Trash2, Upload } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/components/auth-provider'
import { ShopHeader } from '@/components/shop-header'

type Diseno = {
  id: string
  talle: string
  colorNombre: string
  colorHex: string
  imagenUrl: string
  notas: string
}

function ShirtPreviewMini({ color, design }: { color: string; design: string }) {
  return (
    <div className="relative aspect-[0.85] w-full overflow-hidden rounded-sm bg-[#0d0d0d]">
      <svg viewBox="0 0 360 430" className="h-full w-full" role="img" aria-label="Vista previa de la remera">
        <path fill={color} d="M92 54 142 25h76l50 29 78 73-45 58-43-37v244H102V148l-43 37-45-58 78-73Z" />
        <path fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3" d="M142 25c8 31 20 45 38 45s30-14 38-45M102 148l22 18m134-18-22 18" />
      </svg>
      {design && <img src={design} alt="Diseño" className="absolute left-1/2 top-[45%] max-h-24 w-24 -translate-x-1/2 -translate-y-1/2 object-contain" />}
    </div>
  )
}

export default function MisDisenosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [disenos, setDisenos] = useState<Diseno[]>([])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const cargarDisenos = async () => {
      try {
        const ref = collection(db, 'usuarios', user.uid, 'disenos')
        const snapshot = await getDocs(ref)
        const lista: Diseno[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Diseno, 'id'>) }))
        setDisenos(lista)
      } catch (error) {
        console.error('Error cargando diseños:', error)
      } finally {
        setLoading(false)
      }
    }
    cargarDisenos()
  }, [user])

  const handleEliminarDiseno = async (disenoId: string) => {
    if (!user) return
    if (!confirm('¿Estás seguro que querés eliminar este diseño?')) return
    try {
      await deleteDoc(doc(db, 'usuarios', user.uid, 'disenos', disenoId))
      setDisenos(disenos.filter((d) => d.id !== disenoId))
      window.dispatchEvent(new Event('diseno-guardado'))
    } catch (error) {
      console.error('Error eliminando diseño:', error)
      alert('No pudimos eliminar el diseño. Intentá de nuevo.')
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
        <ShopHeader />
        <div className="flex min-h-[60vh] items-center justify-center text-[#c8b995]">Cargando...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#080808] text-[#f2f0eb]">
      <ShopHeader />
      <section className="mx-auto max-w-5xl px-5 py-14 lg:px-10">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-[#c8b995]">
          <ArrowLeft className="size-4" /> Inicio
        </Link>

        <div className="mb-12">
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Tus creaciones</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-serif text-5xl">Mis diseños<span className="text-[#c8b995]">.</span></h1>
            <span className="text-xs text-white/40">{disenos.length}/5</span>
          </div>
        </div>

        {disenos.length === 0 ? (
          <div className="border border-white/10 bg-[#111] p-12 text-center">
            <p className="text-sm text-white/40">Todavía no guardaste ningún diseño.</p>
            <Link
              href="/#personalizar"
              className="mt-6 inline-block border border-[#c8b995] px-6 py-3 text-[10px] uppercase tracking-[0.25em] text-[#c8b995] transition hover:bg-[#c8b995] hover:text-black"
            >
              Crear mi primer diseño
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {disenos.map((diseno) => (
              <article key={diseno.id} className="border border-white/10 bg-[#0b0b0b] p-4">
                <ShirtPreviewMini color={diseno.colorHex} design={diseno.imagenUrl} />
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                    {diseno.talle} · {diseno.colorNombre}
                  </p>
                  {diseno.notas && (
                    <p className="mt-2 line-clamp-2 text-[11px] text-white/40">{diseno.notas}</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/?diseno=${diseno.id}#personalizar`}
                    className="flex flex-1 items-center justify-center gap-2 border border-[#c8b995]/40 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c8b995] transition hover:bg-[#c8b995] hover:text-black"
                  >
                    <Upload className="size-3" /> Cargar
                  </Link>
                  <button
                    onClick={() => handleEliminarDiseno(diseno.id)}
                    className="flex items-center justify-center border border-red-400/30 px-3 py-2 text-red-400/70 transition hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Eliminar diseño"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}