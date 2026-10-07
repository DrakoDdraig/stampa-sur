'use client'

import { useEffect, useState } from 'react'
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
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
  })

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  // Cargar datos del usuario
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

  // Cargar historial de pedidos
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
      setMensaje('Datos actualizados correctamente.')
      setEditing(false)
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
        <div className="flex min-h-[60vh] items-center justify-center text-[#c8b995]">
          Cargando...
        </div>
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
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Tu espacio</p>
          <h1 className="font-serif text-5xl">Mi cuenta<span className="text-[#c8b995]">.</span></h1>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="border border-white/10 bg-[#11100e] p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Datos personales</h2>
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                aria-label="Editar datos"
                className="text-white/50 transition hover:text-[#c8b995]"
              >
                <Pencil className="size-4" />
              </button>
            </div>

            <div className="mt-7 flex flex-col gap-5 text-sm">
              <Campo label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} editing={editing} />
              <Campo label="Email" name="email" value={form.email} onChange={handleChange} editing={false} />
              <Campo label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} editing={editing} placeholder="+54 9 11 1234-5678" />
            </div>

            {editing && (
              <button
                type="button"
                onClick={handleGuardar}
                disabled={saving}
                className="mt-7 inline-flex items-center gap-2 border border-[#c8b995] px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-[#c8b995] transition hover:bg-[#c8b995] hover:text-black disabled:opacity-50"
              >
                <Save className="size-3" /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}

            {mensaje && (
              <p className={`mt-4 text-xs ${mensaje.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {mensaje}
              </p>
            )}
          </section>

          <section className="border border-white/10 bg-[#11100e] p-7">
            <h2 className="font-serif text-2xl">Dirección de envío</h2>
            <div className="mt-7 flex flex-col gap-5 text-sm">
              <Campo label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} editing={editing} placeholder="Av. Siempre Viva 123" />
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} editing={editing} />
                <Campo label="Código Postal" name="codigoPostal" value={form.codigoPostal} onChange={handleChange} editing={editing} />
              </div>
            </div>
            {!form.direccion && (
              <p className="mt-6 flex items-start gap-3 text-xs text-white/40">
                <MapPin className="mt-0.5 size-3 shrink-0 text-[#c8b995]" />
                Completá tu dirección para agilizar tus próximos pedidos.
              </p>
            )}
          </section>
        </div>

        <section className="mt-5 border border-white/10 p-7">
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
                            <li key={i}>
                              {prod.cantidad}x {prod.nombre} — Talle {prod.talle}
                            </li>
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
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  editing: boolean
  placeholder?: string
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      {editing ? (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full border border-[#c8b995]/30 bg-[#080808] px-3 py-2 text-sm text-white focus:border-[#c8b995] focus:outline-none"
        />
      ) : (
        <p className={value ? 'text-white' : 'text-white/30'}>{value || '—'}</p>
      )}
    </div>
  )
}