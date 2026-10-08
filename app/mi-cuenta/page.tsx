'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { ArrowLeft, LogOut, MapPin, Pencil, Save, UserRound } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/components/auth-provider'
import { ShopHeader } from '@/components/shop-header'
import { formatPrice } from '@/lib/store'

type Pedido = {
  id: string
  total: number
  estado: string
  ciudad?: string
  fecha?: { toMillis?: () => number }
  productos?: Array<{ nombre: string; cantidad: number; talle: string }>
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esNuevo, setEsNuevo] = useState(false)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
  })

  const nombreRef = useRef<HTMLInputElement>(null)
  const telefonoRef = useRef<HTMLInputElement>(null)
  const direccionRef = useRef<HTMLInputElement>(null)
  const ciudadRef = useRef<HTMLInputElement>(null)
  const cpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('nuevo') === 'true') {
        setEsNuevo(true)
        setEditing(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const cargar = async () => {
      const ref = doc(db, 'usuarios', user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const d = snap.data()
        setForm({
          nombre: d.nombre ?? '',
          email: user.email ?? '',
          telefono: d.telefono ?? '',
          direccion: d.direccion ?? '',
          ciudad: d.ciudad ?? '',
          codigoPostal: d.codigoPostal ?? '',
        })
      } else {
        setForm((p) => ({ ...p, email: user.email ?? '' }))
      }
      setLoading(false)
    }
    cargar()
  }, [user])

  useEffect(() => {
    if (!user) return
    const cargarPedidos = async () => {
      try {
        const q = query(collection(db, 'pedidos'), where('userId', '==', user.uid))
        const snapshot = await getDocs(q)
        const lista: Pedido[] = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Pedido, 'id'>) }))
        lista.sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
        setPedidos(lista)
      } catch (error) {
        console.error('Error cargando pedidos:', error)
      }
    }
    cargarPedidos()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  const handleGuardar = async () => {
    if (!user) return
    setSaving(true)
    setMensaje('')
    try {
      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        direccion: form.direccion,
        ciudad: form.ciudad,
        codigoPostal: form.codigoPostal,
      }, { merge: true })
      setMensaje('Datos actualizados correctamente. Redirigiendo...')
      setEditing(false)
      setEsNuevo(false)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err) {
      console.error(err)
      setMensaje('Error al guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/')
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

        {esNuevo && (
          <div className="mb-8 border border-[#c8b995]/40 bg-[#c8b995]/5 p-5">
            <p className="text-xs leading-6 text-[#eadcb8]">
              <strong>¡Bienvenido a Stampa Sur!</strong> Antes de empezar a comprar, completá tus datos de contacto y dirección de envío. Los vas a usar en todos tus pedidos.
            </p>
          </div>
        )}

        <div className="mb-12">
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Tu espacio</p>
          <h1 className="font-serif text-5xl">Mi cuenta<span className="text-[#c8b995]">.</span></h1>
        </div>

        <section className="border border-white/10 bg-[#11100e] p-7">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Tus datos</h2>
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 border border-[#c8b995]/40 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c8b995] transition hover:bg-[#c8b995] hover:text-black"
            >
              <Pencil className="size-3" /> {editing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          <div className="mt-7 grid gap-5 text-sm md:grid-cols-2">
            <Campo label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} editing={editing} inputRef={nombreRef} onKeyDown={(e) => handleKeyDown(e, telefonoRef)} />
            <Campo label="Email" name="email" value={form.email} onChange={handleChange} editing={false} />
            <Campo label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} editing={editing} placeholder="+54 9 11 1234-5678" inputRef={telefonoRef} onKeyDown={(e) => handleKeyDown(e, direccionRef)} />
            <div className="md:col-span-2">
              <Campo label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} editing={editing} placeholder="Av. Siempre Viva 123" inputRef={direccionRef} onKeyDown={(e) => handleKeyDown(e, ciudadRef)} />
            </div>
            <Campo label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} editing={editing} inputRef={ciudadRef} onKeyDown={(e) => handleKeyDown(e, cpRef)} />
            <Campo label="Código Postal" name="codigoPostal" value={form.codigoPostal} onChange={handleChange} editing={editing} inputRef={cpRef} />
          </div>

          {!form.direccion && !esNuevo && (
            <p className="mt-6 flex items-start gap-3 text-xs text-white/40">
              <MapPin className="mt-0.5 size-3 shrink-0 text-[#c8b995]" />
              Completá tu dirección para agilizar tus próximos pedidos.
            </p>
          )}

          {mensaje && (
            <p className={`mt-4 text-xs ${mensaje.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {mensaje}
            </p>
          )}
        </section>

        {editing && (
          <div className="sticky bottom-4 z-30 mt-6">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving}
              className="flex w-full items-center justify-center gap-3 bg-[#c8b995] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-black shadow-lg transition hover:bg-[#ded0aa] disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="size-4" /> {saving ? 'Guardando...' : 'Guardar datos'}
            </button>
          </div>
        )}

        {/* HISTORIAL DE PEDIDOS */}
        <section className="mt-8 border border-white/10 p-7">
          <div className="flex items-center gap-3">
            <UserRound className="size-4 text-[#c8b995]" />
            <h2 className="font-serif text-2xl">Historial de pedidos</h2>
          </div>

          {pedidos.length === 0 ? (
            <p className="mt-7 text-sm text-white/40">Todavía no hiciste ningún pedido.</p>
          ) : (
            <div className="mt-7 flex flex-col gap-4">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="border border-white/10 bg-[#0b0b0b] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#c8b995]">
                        Pedido #{pedido.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-2 text-xs text-white/45">
                        {pedido.productos?.length ?? 0} productos
                        {pedido.ciudad ? ` · ${pedido.ciudad}` : ''}
                      </p>
                      {pedido.productos && pedido.productos.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-1 text-xs text-white/50">
                          {pedido.productos.map((prod, i) => (
                            <li key={i}>{prod.cantidad}x {prod.nombre} — Talle {prod.talle}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-xl text-[#c8b995]">{formatPrice(pedido.total ?? 0)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/45">
                        {pedido.estado ?? 'pendiente'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 border border-red-500/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut className="size-3" /> Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  )
}

function Campo({
  label,
  name,
  value,
  onChange,
  editing,
  placeholder,
  inputRef,
  onKeyDown,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  editing: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full border border-[#c8b995]/30 bg-[#080808] px-3 py-2 text-sm text-white focus:border-[#c8b995] focus:outline-none"
        />
      ) : (
        <p className={value ? 'text-white' : 'text-white/30'}>{value || '—'}</p>
      )}
    </div>
  )
}