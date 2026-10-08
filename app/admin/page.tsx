'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Box, ChevronDown, CircleAlert, LayoutDashboard, LogOut, Mail, MapPin, Menu, PackagePlus, Pencil, Phone, ShoppingCart, Trash2, Users, X } from 'lucide-react'
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/components/auth-provider'

const logoUrl = 'https://i.ibb.co/FtTQmgC/Chat-GPT-Image-6-oct-2026-04-55-52-a-m.png'

const navItems = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Productos', icon: Box },
  { label: 'Pedidos', icon: ShoppingCart },
  { label: 'Clientes', icon: Users },
]

const statusClasses: Record<string, string> = {
  Pendiente: 'bg-[#c8b995]/15 text-[#d9c99e]',
  'En preparación': 'bg-blue-400/10 text-blue-300',
  Enviado: 'bg-violet-400/10 text-violet-300',
  Entregado: 'bg-emerald-400/10 text-emerald-300',
  Activo: 'bg-emerald-400/10 text-emerald-300',
  Agotado: 'bg-red-400/10 text-red-300',
}

const ESTADOS_PEDIDO = ['Pendiente', 'En preparación', 'Enviado', 'Entregado']

type ProductoAdmin = {
  id: string
  name: string
  category: string
  price: number
  descuento: number
  stock: number
  status: string
  imageUrl: string
}

type ClienteAdmin = {
  id: string
  nombre: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  codigoPostal: string
  rol: string
  fechaRegistro?: { toMillis?: () => number }
}

type PedidoAdmin = {
  id: string
  cliente: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  codigoPostal: string
  productos: Array<{ nombre: string; cantidad: number; talle: string; color: string; precio: number }>
  total: number
  estado: string
  fecha?: { toMillis?: () => number }
}

export default function AdminPage() {
  const { user } = useAuth()
  const [active, setActive] = useState('Resumen')
  const [productos, setProductos] = useState<ProductoAdmin[]>([])
  const [clientes, setClientes] = useState<ClienteAdmin[]>([])
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductoAdmin | undefined>()
  const [deletingProduct, setDeletingProduct] = useState<ProductoAdmin | undefined>()
  const [deleting, setDeleting] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [nombreAdmin, setNombreAdmin] = useState('Administrador')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      setError('')
      try {
        const productosSnapshot = await getDocs(collection(db, 'productos'))
        const listaProductos: ProductoAdmin[] = productosSnapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            name: d.nombre ?? 'Sin nombre',
            category: d.categoria ?? 'Sin categoría',
            price: Number(d.precio) || 0,
            descuento: Number(d.descuento) || 0,
            stock: Number(d.stock) || 0,
            status: (Number(d.stock) || 0) > 0 ? 'Activo' : 'Agotado',
            imageUrl: d.imagenUrl ?? '',
          }
        })
        setProductos(listaProductos)

        const clientesSnapshot = await getDocs(collection(db, 'usuarios'))
        const listaClientes: ClienteAdmin[] = clientesSnapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            nombre: d.nombre ?? 'Sin nombre',
            email: d.email ?? '',
            telefono: d.telefono ?? '',
            direccion: d.direccion ?? '',
            ciudad: d.ciudad ?? '',
            codigoPostal: d.codigoPostal ?? '',
            rol: d.rol ?? 'cliente',
            fechaRegistro: d.fechaRegistro,
          }
        })
        listaClientes.sort((a, b) => (b.fechaRegistro?.toMillis?.() ?? 0) - (a.fechaRegistro?.toMillis?.() ?? 0))
        setClientes(listaClientes)

        const pedidosSnapshot = await getDocs(collection(db, 'pedidos'))
        const listaPedidos: PedidoAdmin[] = pedidosSnapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            cliente: d.cliente ?? 'Sin nombre',
            email: d.email ?? '',
            telefono: d.telefono ?? '',
            direccion: d.direccion ?? '',
            ciudad: d.ciudad ?? '',
            codigoPostal: d.codigoPostal ?? '',
            productos: d.productos ?? [],
            total: Number(d.total) || 0,
            estado: d.estado ?? 'Pendiente',
            fecha: d.fecha,
          }
        })
        listaPedidos.sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
        setPedidos(listaPedidos)

        if (user) {
          const userDoc = clientesSnapshot.docs.find((d) => d.id === user.uid)
          if (userDoc) {
            const d = userDoc.data()
            setNombreAdmin(d.nombre || user.displayName || user.email?.split('@')[0] || 'Administrador')
          } else {
            setNombreAdmin(user.displayName || user.email?.split('@')[0] || 'Administrador')
          }
        }
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar los datos.')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [refreshKey, user])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/')
  }

  const handleProductSaved = () => {
    setShowProductForm(false)
    setEditingProduct(undefined)
    setRefreshKey((k) => k + 1)
  }

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'productos', deletingProduct.id))
      setDeletingProduct(undefined)
      setRefreshKey((k) => k + 1)
    } catch (error) {
      console.error(error)
      alert('No pudimos eliminar el producto. Intentá de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  const handleCambiarEstado = async (pedidoId: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, 'pedidos', pedidoId), { estado: nuevoEstado })
      setPedidos(pedidos.map((p) => (p.id === pedidoId ? { ...p, estado: nuevoEstado } : p)))
    } catch (error) {
      console.error('Error actualizando estado:', error)
      alert('No pudimos actualizar el estado. Intentá de nuevo.')
    }
  }

  const currentDescription =
    active === 'Resumen'
      ? 'Una mirada general de tu tienda.'
      : active === 'Clientes'
        ? 'Todas las cuentas registradas en la tienda.'
        : active === 'Pedidos'
          ? 'Todos los pedidos y sus estados.'
          : `Gestioná ${active.toLowerCase()} desde un solo lugar.`

  const iniciales = nombreAdmin
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f2f0eb]">
      <aside className={`${mobileNav ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 bg-[#101010] transition-transform lg:translate-x-0`}>
        <Link href="/" className="flex h-20 items-center justify-between border-b border-white/10 px-6 transition hover:bg-white/5">
          <div className="flex items-center gap-3">
            <Image src={logoUrl} alt="Logo de Stampa Sur" width={42} height={42} className="size-9 object-contain" unoptimized />
            <div>
              <p className="font-serif text-lg tracking-[0.18em]">STAMPA <span className="text-[#c8b995]">SUR</span></p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-white/35">Panel de administración</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={(e) => { e.preventDefault(); setMobileNav(false) }} aria-label="Cerrar menú"><X className="size-5" /></button>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setActive(label); setMobileNav(false) }} className={`flex items-center gap-3 px-4 py-3 text-left text-sm transition ${active === label ? 'border-l-2 border-[#c8b995] bg-[#c8b995]/10 text-[#e3d6b5]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="size-4" />{label}
            </button>
          ))}
          <div className="mt-5 border-t border-white/10 pt-5">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white/50 hover:text-white"><LogOut className="size-4" />Cerrar sesión</button>
          </div>
        </nav>
        <div className="border-t border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#c8b995] text-sm font-semibold text-black">{iniciales}</div>
            <div>
              <p className="text-sm">{nombreAdmin}</p>
              <p className="text-xs text-white/35">Administrador</p>
            </div>
          </div>
        </div>
      </aside>
      {mobileNav && <button className="fixed inset-0 z-20 bg-black/70 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Cerrar navegación" />}
      <section className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-white/10 px-5 lg:px-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu className="size-5" /></button>
            <div>
              <h1 className="font-serif text-2xl">{active}</h1>
              <p className="hidden text-xs text-white/40 sm:block">{currentDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 border-l border-white/10 pl-4 text-xs text-white/50 transition hover:text-[#c8b995]"
              >
                <span>Vista administrador</span>
                <ChevronDown className={`size-3 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 border border-[#c8b995]/20 bg-[#11100e] shadow-lg">
                  <Link href="/" onClick={() => setUserMenuOpen(false)} className="block px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white/70 transition hover:bg-[#c8b995]/10 hover:text-[#c8b995]">
                    Volver a la tienda
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 border-t border-white/5 px-5 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10">
                    <LogOut className="size-3" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-350 p-5 lg:p-10">
          {error ? (
            <div className="flex items-center gap-3 border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
              <CircleAlert className="size-4" />{error}
              <button onClick={() => setRefreshKey((k) => k + 1)} className="ml-auto underline">Reintentar</button>
            </div>
          ) : loading ? <LoadingState /> : (
            <>
              {active === 'Resumen' && <Overview productos={productos} clientes={clientes} pedidos={pedidos} setActive={setActive} />}
              {active === 'Productos' && (
                <Products
                  products={productos}
                  onAdd={() => { setEditingProduct(undefined); setShowProductForm(true) }}
                  onEdit={(product) => { setEditingProduct(product); setShowProductForm(true) }}
                  onDelete={(product) => setDeletingProduct(product)}
                />
              )}
              {active === 'Pedidos' && <Pedidos pedidos={pedidos} onCambiarEstado={handleCambiarEstado} />}
              {active === 'Clientes' && <Clientes clientes={clientes} />}
            </>
          )}
          {showProductForm && (
            <ProductForm
              product={editingProduct}
              onClose={() => { setShowProductForm(false); setEditingProduct(undefined) }}
              onSaved={handleProductSaved}
            />
          )}
          {deletingProduct && (
            <DeleteConfirmModal
              product={deletingProduct}
              onCancel={() => setDeletingProduct(undefined)}
              onConfirm={handleConfirmDelete}
              loading={deleting}
            />
          )}
        </div>
      </section>
    </main>
  )
}

function LoadingState() { return <div className="flex min-h-105 items-center justify-center"><div className="flex flex-col items-center gap-4 text-white/45"><div className="size-8 animate-spin rounded-full border-2 border-[#c8b995] border-t-transparent" /><p className="text-sm">Cargando datos del panel...</p></div></div> }

function EmptyState({ message }: { message: string }) { return <div className="border border-white/10 bg-[#111] p-10 text-center text-sm text-white/40">{message}</div> }

function Overview({ productos, clientes, pedidos, setActive }: { productos: ProductoAdmin[]; clientes: ClienteAdmin[]; pedidos: PedidoAdmin[]; setActive: (value: string) => void }) {
  const activos = productos.filter((p) => p.status === 'Activo').length
  const pendientes = pedidos.filter((p) => p.estado === 'Pendiente').length
  const metrics = [
    { label: 'Productos totales', value: String(productos.length), icon: Box },
    { label: 'Productos activos', value: String(activos), icon: PackagePlus },
    { label: 'Pedidos', value: String(pedidos.length), icon: ShoppingCart },
    { label: 'Cuentas creadas', value: String(clientes.length), icon: Users },
  ]
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="border border-white/10 bg-[#111] p-5">
            <div className="flex items-center justify-between text-white/45">
              <p className="text-xs uppercase tracking-[0.15em]">{label}</p>
              <Icon className="size-4 text-[#c8b995]" />
            </div>
            <p className="mt-7 font-serif text-3xl">{value}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="border border-white/10 bg-[#111] p-6">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#c8b995]">Actividad reciente</p>
              <h2 className="mt-2 font-serif text-2xl">Últimos pedidos</h2>
            </div>
            <button onClick={() => setActive('Pedidos')} className="text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-[#c8b995]">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.15em] text-white/35">
                <tr><th className="pb-3 font-normal">Cliente</th><th className="pb-3 font-normal">Estado</th><th className="pb-3 text-right font-normal">Total</th></tr>
              </thead>
              <tbody>
                {pedidos.slice(0, 5).map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="py-4">{p.cliente}</td>
                    <td className="py-4"><Status value={p.estado} /></td>
                    <td className="py-4 text-right text-[#c8b995]">{formatARS(p.total)}</td>
                  </tr>
                ))}
                {pedidos.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-white/30">No hay pedidos todavía.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="border border-white/10 bg-[#111] p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c8b995]">Estado</p>
          <h2 className="mt-2 font-serif text-2xl">Stock</h2>
          <div className="mt-8 flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-white/50">Activos</span><span className="text-emerald-300">{activos}</span></div>
            <div className="flex justify-between"><span className="text-white/50">Agotados</span><span className="text-red-300">{productos.filter((p) => p.status === 'Agotado').length}</span></div>
            <div className="mt-4 border-t border-white/10 pt-4 flex justify-between"><span className="text-white/50">Pedidos pendientes</span><span className="text-[#c8b995]">{pendientes}</span></div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Status({ value }: { value: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] ${statusClasses[value] ?? 'bg-white/10 text-white/60'}`}>{value}</span> }

function Products({ products, onAdd, onEdit, onDelete }: { products: ProductoAdmin[]; onAdd: () => void; onEdit: (product: ProductoAdmin) => void; onDelete: (product: ProductoAdmin) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c8b995]">Catálogo</p>
          <h2 className="mt-2 font-serif text-3xl">Tus productos</h2>
        </div>
        <button onClick={onAdd} className="inline-flex items-center justify-center gap-2 bg-[#c8b995] px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-black hover:bg-[#e0d0a7]">
          <PackagePlus className="size-4" />Agregar producto
        </button>
      </div>

      {products.length === 0 ? (
        <div className="border border-white/10 bg-[#111] p-10 text-center text-sm text-white/40">
          No hay productos todavía. Agregá el primero.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111] transition hover:border-[#c8b995]/40">
              <div className="relative aspect-square overflow-hidden bg-[#0b0b0b]">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex size-full items-center justify-center text-4xl text-[#c8b995]/20">✦</div>
                )}
                <div className="absolute left-3 top-3 flex flex-col gap-2">
                  <Status value={product.status} />
                  {product.descuento > 0 && (
                    <span className="inline-flex rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                      -{product.descuento}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="font-serif text-lg leading-tight text-white">{product.name}</h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/40">{product.category}</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  {product.descuento > 0 ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-white/30 line-through">{formatARS(product.price)}</span>
                      <span className="text-sm font-semibold text-[#c8b995]">
                        {formatARS(product.price * (1 - product.descuento / 100))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#c8b995]">{formatARS(product.price)}</span>
                  )}
                  <span className="text-xs text-white/40">Stock: {product.stock}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(product)} className="flex flex-1 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-white/60 transition hover:border-[#c8b995] hover:text-[#c8b995]">
                    <Pencil className="size-3" /> Editar
                  </button>
                  <button onClick={() => onDelete(product)} aria-label={`Eliminar ${product.name}`} className="flex items-center justify-center border border-red-400/20 px-3 py-2 text-red-400/60 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
// ==========================================
// SECCIÓN PEDIDOS CON GRÁFICO Y RESUMEN
// ==========================================

function Pedidos({ pedidos, onCambiarEstado }: { pedidos: PedidoAdmin[]; onCambiarEstado: (id: string, estado: string) => void }) {
  const [filtro, setFiltro] = useState<'dia' | 'semana' | 'mes' | 'año'>('semana')

  const ahora = useMemo(() => new Date(), [])

  // ==========================================
  // DIAGNÓSTICO: ver las fechas de los pedidos
  // ==========================================
  useEffect(() => {
    console.log('=== PEDIDOS CARGADOS ===')
    console.log('Total de pedidos:', pedidos.length)
    pedidos.forEach((p) => {
      const fecha = p.fecha?.toMillis?.()
      const fechaDate = fecha ? new Date(fecha) : null
      console.log(`- ${p.cliente}:`, {
        fechaTimestamp: p.fecha,
        toMillis: fecha,
        fechaFormateada: fechaDate ? fechaDate.toLocaleString('es-AR') : 'Sin fecha',
        hora: fechaDate ? fechaDate.getHours() : null,
        dia: fechaDate ? fechaDate.getDate() : null,
        mes: fechaDate ? fechaDate.getMonth() + 1 : null,
        año: fechaDate ? fechaDate.getFullYear() : null,
        total: p.total,
        tipoTotal: typeof p.total,
      })
    })
    console.log('=== FIN ===')
  }, [pedidos])

  const rangoFechas = useMemo(() => {
    const inicio = new Date()
    if (filtro === 'dia') {
      inicio.setHours(0, 0, 0, 0)
    } else if (filtro === 'semana') {
      inicio.setDate(ahora.getDate() - 6)
      inicio.setHours(0, 0, 0, 0)
    } else if (filtro === 'mes') {
      inicio.setDate(ahora.getDate() - 27)
      inicio.setHours(0, 0, 0, 0)
    } else {
      inicio.setMonth(ahora.getMonth() - 11)
      inicio.setDate(1)
      inicio.setHours(0, 0, 0, 0)
    }
    return inicio
  }, [filtro, ahora])

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const fecha = p.fecha?.toMillis?.()
      if (!fecha) return false
      return fecha >= rangoFechas.getTime()
    })
  }, [pedidos, rangoFechas])

  const totalVendido = pedidosFiltrados.reduce((sum, p) => sum + (Number(p.total) || 0), 0)
  const totalPedidos = pedidosFiltrados.length
  const promedio = totalPedidos > 0 ? totalVendido / totalPedidos : 0
  const totalProductos = pedidosFiltrados.reduce(
    (sum, p) => sum + (p.productos?.reduce((s, prod) => s + (Number(prod.cantidad) || 0), 0) ?? 0),
    0
  )

const datosGrafico = useMemo(() => {
  // Función auxiliar: convierte un timestamp a "YYYY-MM-DD" en zona horaria LOCAL
  const aFechaLocal = (timestamp: number) => {
    const d = new Date(timestamp)
    const año = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  // Función auxiliar: convierte un timestamp a "YYYY-MM-DD HH" en zona horaria LOCAL
  const aFechaHoraLocal = (timestamp: number) => {
    const d = new Date(timestamp)
    const año = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    const hora = String(d.getHours()).padStart(2, '0')
    return `${año}-${mes}-${dia} ${hora}`
  }

  // DEBUG: ver qué fechas se están generando
  console.log('=== DEBUG GRÁFICO ===')
  console.log('Filtro:', filtro)
  console.log('Fecha del sistema:', new Date().toLocaleString('es-AR'))
  pedidos.forEach((p) => {
    const t = p.fecha?.toMillis?.()
    if (t) {
      console.log(`Pedido de ${p.cliente}:`, {
        toMillis: t,
        fechaLocal: aFechaLocal(t),
        fechaHoraLocal: aFechaHoraLocal(t),
        fechaFormateada: new Date(t).toLocaleString('es-AR'),
      })
    }
  })
  console.log('=== FIN DEBUG ===')

  if (filtro === 'dia') {
    const hoy = new Date()
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    console.log('Fecha de hoy (día):', fechaHoy)

    return Array.from({ length: 24 }, (_, hora) => {
      const horaStr = String(hora).padStart(2, '0')
      const clave = `${fechaHoy} ${horaStr}`

      const total = pedidos
        .filter((p) => {
          const t = p.fecha?.toMillis?.()
          if (!t) return false
          return aFechaHoraLocal(t) === clave
        })
        .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

      return { label: `${hora}h`, valor: total, hora }
    })
  } else if (filtro === 'semana') {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() - (6 - i))
      const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

      const total = pedidos
        .filter((p) => {
          const t = p.fecha?.toMillis?.()
          if (!t) return false
          return aFechaLocal(t) === fechaStr
        })
        .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

      console.log(`Comparando: pedido=${aFechaLocal(pedidos[0]?.fecha?.toMillis?.() ?? 0)} vs gráfico=${fechaStr} → ${aFechaLocal(pedidos[0]?.fecha?.toMillis?.() ?? 0) === fechaStr ? 'MATCH' : 'NO MATCH'}`)

      return {
        label: `${dias[fecha.getDay()]} ${fecha.getDate()}`,
        valor: total,
      }
    })
  } else if (filtro === 'mes') {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    return Array.from({ length: 4 }, (_, i) => {
      const inicio = new Date(hoy)
      inicio.setDate(hoy.getDate() - (3 - i) * 7)
      const fin = new Date(inicio)
      fin.setDate(fin.getDate() + 6)

      const inicioStr = aFechaLocal(inicio.getTime())
      const finStr = aFechaLocal(fin.getTime())

      const total = pedidos
        .filter((p) => {
          const t = p.fecha?.toMillis?.()
          if (!t) return false
          const fecha = aFechaLocal(t)
          return fecha >= inicioStr && fecha <= finStr
        })
        .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

      return { label: `Sem ${i + 1}`, valor: total }
    })
  } else {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const hoy = new Date()

    return Array.from({ length: 12 }, (_, i) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - i), 1)
      const año = fecha.getFullYear()
      const mes = fecha.getMonth()

      const total = pedidos
        .filter((p) => {
          const t = p.fecha?.toMillis?.()
          if (!t) return false
          const d = new Date(t)
          return d.getFullYear() === año && d.getMonth() === mes
        })
        .reduce((sum, p) => sum + (Number(p.total) || 0), 0)

      return { label: meses[mes], valor: total }
    })
  }
}, [filtro, pedidos])

  const maxValor = Math.max(...datosGrafico.map((d) => d.valor), 1)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c8b995]">Operaciones</p>
        <h2 className="mt-2 font-serif text-3xl">Todos los pedidos</h2>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(['dia', 'semana', 'mes', 'año'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
              filtro === f
                ? 'bg-[#c8b995] text-black'
                : 'border border-white/15 text-white/60 hover:border-[#c8b995] hover:text-[#c8b995]'
            }`}
          >
            {f === 'dia' ? 'Hoy' : f === 'semana' ? 'Semana' : f === 'mes' ? 'Mes' : 'Año'}
          </button>
        ))}
      </div>

      {/* Sumario */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="border border-white/10 bg-[#111] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-white/45">Total vendido</p>
          <p className="mt-4 font-serif text-3xl text-[#c8b995]">{formatARS(totalVendido)}</p>
        </article>
        <article className="border border-white/10 bg-[#111] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-white/45">Pedidos</p>
          <p className="mt-4 font-serif text-3xl">{totalPedidos}</p>
        </article>
        <article className="border border-white/10 bg-[#111] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-white/45">Productos vendidos</p>
          <p className="mt-4 font-serif text-3xl">{totalProductos}</p>
        </article>
        <article className="border border-white/10 bg-[#111] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-white/45">Ticket promedio</p>
          <p className="mt-4 font-serif text-3xl">{formatARS(promedio)}</p>
        </article>
      </div>

           {/* Gráfico */}
      <section className="border border-white/10 bg-[#111] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c8b995]">Ventas</p>
            <h3 className="mt-2 font-serif text-2xl">
              {filtro === 'dia'
                ? 'Ventas por hora (hoy)'
                : filtro === 'semana'
                  ? 'Últimos 7 días'
                  : filtro === 'mes'
                    ? 'Últimas 4 semanas'
                    : 'Últimos 12 meses'}
            </h3>
          </div>
          <span className="text-xs text-white/40">{formatARS(totalVendido)}</span>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className={`flex items-end gap-2 ${filtro === 'dia' ? 'min-w-200' : ''}`} style={{ height: '240px' }}>
            {datosGrafico.map((d, i) => {
              const altura = maxValor > 0 ? (d.valor / maxValor) * 100 : 0
              return (
                <div
                  key={i}
                  className="group flex flex-1 flex-col items-center justify-end gap-2"
                  style={{ minWidth: filtro === 'dia' ? '30px' : '50px', height: '100%' }}
                >
                  <span className="text-[9px] text-white/40 opacity-0 transition group-hover:opacity-100">
                    {d.valor > 0 ? formatARS(d.valor) : ''}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      d.valor > 0 ? 'bg-[#c8b995]' : 'bg-[#c8b995]/20'
                    }`}
                    style={{
                      height: d.valor > 0 ? `${Math.max(altura, 4)}%` : '4px',
                      minHeight: d.valor > 0 ? '8px' : '4px',
                    }}
                    title={d.valor > 0 ? `${d.label}: ${formatARS(d.valor)}` : d.label}
                  />
                  <span className="text-[9px] uppercase tracking-widest text-white/40">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>
        {totalVendido === 0 && (
          <p className="mt-6 text-center text-xs text-white/40">No hay ventas en este período.</p>
        )}
      </section>

      {/* Lista de pedidos */}
      {pedidos.length === 0 ? (
        <div className="border border-white/10 bg-[#111] p-10 text-center text-sm text-white/40">
          Todavía no hay pedidos registrados.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="border border-white/10 bg-[#111] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#c8b995]">
                    Pedido #{pedido.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="font-serif text-lg text-white">{pedido.cliente}</p>
                  <p className="text-xs text-white/45">{pedido.email}</p>
                  <p className="text-xs text-white/45">{pedido.telefono}</p>
                  <p className="text-xs text-white/45">
                    {pedido.direccion}, {pedido.ciudad} (CP {pedido.codigoPostal})
                  </p>
                  <p className="mt-2 text-xs text-white/55">
                    {pedido.fecha?.toMillis?.()
                      ? new Date(pedido.fecha.toMillis()).toLocaleString('es-AR')
                      : 'Sin fecha'}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <p className="font-serif text-2xl text-[#c8b995]">{formatARS(pedido.total)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">Estado:</span>
                    <select
                      value={pedido.estado}
                      onChange={(e) => onCambiarEstado(pedido.id, e.target.value)}
                      className="border border-white/15 bg-[#0b0b0b] px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-white outline-none focus:border-[#c8b995]"
                    >
                      {ESTADOS_PEDIDO.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {pedido.productos && pedido.productos.length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/40">Productos</p>
                  <ul className="flex flex-col gap-1 text-xs text-white/55">
                    {pedido.productos.map((prod, i) => (
                      <li key={i}>
                        {prod.cantidad}x {prod.nombre} — Talle {prod.talle} — {formatARS(prod.precio)} c/u
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function Clientes({ clientes }: { clientes: ClienteAdmin[] }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState('')
  const [mensajePersonalizado, setMensajePersonalizado] = useState('')
  const [asunto, setAsunto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState('')

  const mensajesPrefabricados = [
    { id: 'nuevos', asunto: '¡Nuevos productos en Stampa Sur!', mensaje: 'Hola! Te escribimos de Stampa Sur para contarte que acabamos de subir nuevos diseños a la tienda. Pasá a verlos cuando quieras. ¡Gracias por ser parte!' },
    { id: 'descuentos', asunto: 'Descuentos exclusivos en Stampa Sur', mensaje: 'Hola! Tenemos descuentos especiales en algunas prendas de la tienda. Aprovechá antes de que se terminen. Entrá a stampasur.com para verlos.' },
    { id: 'personalizado', asunto: '', mensaje: '' },
  ]

  const handleSeleccionarMensaje = (id: string) => {
    setMensajeSeleccionado(id)
    const msg = mensajesPrefabricados.find((m) => m.id === id)
    if (msg && id !== 'personalizado') {
      setAsunto(msg.asunto)
      setMensajePersonalizado(msg.mensaje)
    } else {
      setAsunto('')
      setMensajePersonalizado('')
    }
  }

  const handleEnviar = async () => {
    if (!asunto.trim() || !mensajePersonalizado.trim()) {
      setResultado('Completá el asunto y el mensaje.')
      return
    }
    if (clientes.length === 0) {
      setResultado('No hay clientes para enviar.')
      return
    }

    setEnviando(true)
    setResultado('')

    try {
      const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://i.ibb.co/pvDpKyBq/stampa-sur-fondo-negro.png" alt="Stampa Sur" style="width: 180px; height: auto;" />
      <p style="font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif; font-size: 22px; letter-spacing: 4px; margin-top: 15px; color: #000000;">
        STAMPA <span style="color: #aaa398;">SUR</span>
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 8px;">
      <p style="font-size: 16px; line-height: 1.6;">${mensajePersonalizado.replace(/\n/g, '<br />')}</p>
    </div>
    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
      <p>Stampa Sur · Buenos Aires, Argentina</p>
      <p>Recibiste este mail porque tenés una cuenta en nuestra tienda.</p>
    </div>
  </div>
`

      const destinatarios = clientes
        .filter((c) => c.email)
        .map((c) => ({ email: c.email, name: c.nombre }))

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: destinatarios,
          subject: asunto,
          htmlContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar')
      }

      setResultado(`¡Mensaje enviado a ${destinatarios.length} ${destinatarios.length === 1 ? 'cliente' : 'clientes'}!`)
      setTimeout(() => {
        setModalAbierto(false)
        setResultado('')
        setAsunto('')
        setMensajePersonalizado('')
        setMensajeSeleccionado('')
      }, 2000)
    } catch (error) {
      setResultado(error instanceof Error ? error.message : 'Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c8b995]">Comunidad</p>
          <h2 className="mt-2 font-serif text-3xl">Cuentas creadas</h2>
          <p className="mt-3 text-sm text-white/45">{clientes.length} {clientes.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}.</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          disabled={clientes.length === 0}
          className="inline-flex items-center justify-center gap-2 bg-[#c8b995] px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-black hover:bg-[#e0d0a7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" /> Enviar mensaje
        </button>
      </div>

      {clientes.length === 0 ? (
        <div className="border border-white/10 bg-[#111] p-10 text-center text-sm text-white/40">
          Todavía no hay cuentas registradas.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <article key={cliente.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#111] p-5 transition hover:border-[#c8b995]/30">
              <div className="flex items-center gap-3">
                <div className={`flex size-12 items-center justify-center rounded-full text-sm font-semibold ${cliente.rol === 'admin' ? 'bg-[#c8b995] text-black' : 'bg-white/10 text-white'}`}>
                  {cliente.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg text-white">{cliente.nombre}</p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                    {cliente.rol === 'admin' ? 'Administrador' : 'Cliente'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-white/60">
                {cliente.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3 shrink-0 text-[#c8b995]" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                )}
                {cliente.telefono ? (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3 shrink-0 text-[#c8b995]" />
                    <span>{cliente.telefono}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white/30">
                    <Phone className="size-3 shrink-0" />
                    <span>Sin teléfono</span>
                  </div>
                )}
                {cliente.direccion ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3 shrink-0 text-[#c8b995]" />
                    <span>
                      {cliente.direccion}
                      {cliente.ciudad && `, ${cliente.ciudad}`}
                      {cliente.codigoPostal && ` (CP ${cliente.codigoPostal})`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white/30">
                    <MapPin className="size-3 shrink-0" />
                    <span>Sin dirección</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-[#151515] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#c8b995]">Enviar mensaje</p>
                <h2 className="mt-2 font-serif text-2xl">Mail a clientes</h2>
                <p className="mt-2 text-xs text-white/45">Se enviará a {clientes.filter((c) => c.email).length} clientes.</p>
              </div>
              <button onClick={() => setModalAbierto(false)} aria-label="Cerrar"><X className="size-5 text-white/50" /></button>
            </div>

            <div className="mt-7 flex flex-col gap-5">
              <label className="flex flex-col gap-2 text-xs text-white/55">
                Mensaje prefabricado
                <select
                  value={mensajeSeleccionado}
                  onChange={(e) => handleSeleccionarMensaje(e.target.value)}
                  className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]"
                >
                  <option value="">Seleccioná una opción...</option>
                  {mensajesPrefabricados.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id === 'personalizado' ? 'Mensaje personalizado' : m.asunto}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs text-white/55">
                Asunto
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]"
                  placeholder="Ej. ¡Nuevos productos en Stampa Sur!"
                />
              </label>

              <label className="flex flex-col gap-2 text-xs text-white/55">
                Mensaje
                <textarea
                  value={mensajePersonalizado}
                  onChange={(e) => setMensajePersonalizado(e.target.value)}
                  rows={6}
                  className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]"
                  placeholder="Escribí tu mensaje..."
                />
              </label>

              {resultado && (
                <p className={`text-xs ${resultado.includes('Error') || resultado.includes('Completá') || resultado.includes('No hay') ? 'text-red-300' : 'text-emerald-300'}`}>
                  {resultado}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-3 text-xs uppercase tracking-[0.15em] text-white/50 hover:text-white">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={enviando}
                  className="bg-[#c8b995] px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Enviar mail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DataTable({ children }: { children: ReactNode }) { return <div className="overflow-x-auto border border-white/10 bg-[#111]"><table className="w-full min-w-175 text-left text-sm [&_tbody_tr]:border-t [&_tbody_tr]:border-white/5 [&_td]:px-6 [&_td]:py-5 [&_th]:px-6 [&_th]:py-4 [&_th]:text-[10px] [&_th]:font-normal [&_th]:uppercase [&_th]:tracking-[0.15em] [&_th]:text-white/35">{children}</table></div> }

function DeleteConfirmModal({ product, onCancel, onConfirm, loading }: { product: ProductoAdmin; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-md border border-white/10 bg-[#151515] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <Trash2 className="size-5 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-red-400">Eliminar producto</p>
            <h2 className="mt-2 font-serif text-2xl">¿Estás seguro?</h2>
          </div>
        </div>
        <p className="mt-5 text-sm leading-7 text-white/60">
          Estás por eliminar <strong className="text-white">{product.name}</strong> de la tienda. Esta acción no se puede deshacer.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onConfirm} disabled={loading} className="flex-1 bg-emerald-500 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Eliminando...' : 'Sí, estoy seguro'}
          </button>
          <button type="button" onClick={onCancel} disabled={loading} className="flex-1 border border-white/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50">
            No, cambié de opinión
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductForm({ onClose, product, onSaved }: { onClose: () => void; product?: ProductoAdmin; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState<string>(product?.price ? String(product.price) : '')
  const [stock, setStock] = useState<string>(product?.stock ? String(product.stock) : '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [description, setDescription] = useState('')
  const [descuento, setDescuento] = useState<string>(product?.descuento ? String(product.descuento) : '')

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0]
    if (!image) return
    setUploadError('')
    setUploading(true)
    try {
      const body = new FormData()
      body.append('image', image)
      const response = await fetch('/api/upload-image', { method: 'POST', body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No pudimos subir la imagen.')
      setImageUrl(result.url)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'No pudimos subir la imagen.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const data = {
        nombre: name,
        precio: Number(price) || 0,
        descuento: Number(descuento) || 0,
        stock: Number(stock) || 0,
        categoria: category,
        descripcion: description,
        imagenUrl: imageUrl,
        destacado: false,
      }

      if (product?.id) {
        await updateDoc(doc(db, 'productos', product.id), data)
      } else {
        await addDoc(collection(db, 'productos'), {
          ...data,
          createdAt: serverTimestamp(),
        })
      }
      onSaved()
    } catch (error) {
      console.error(error)
      setSaveError('No pudimos guardar el producto. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-5">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-[#151515] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c8b995]">{product ? 'Editar registro' : 'Nuevo registro'}</p>
            <h2 className="mt-2 font-serif text-2xl">{product ? 'Editar producto' : 'Agregar producto'}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar formulario"><X className="size-5 text-white/50" /></button>
        </div>

        <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-xs text-white/55">
            Nombre
            <input required value={name} onChange={(e) => setName(e.target.value)} className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]" placeholder="Ej. Remera Eclipse" />
          </label>

          <label className="flex flex-col gap-2 text-xs text-white/55">
            Categoría
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]" placeholder="Ej. Oversize" />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs text-white/55">
              Precio
              <input required type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]" placeholder="15000" />
            </label>
            <label className="flex flex-col gap-2 text-xs text-white/55">
              Stock
              <input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]" placeholder="10" />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-xs text-white/55">
            Descuento (%)
            <input
              type="number"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              min="0"
              max="100"
              className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]"
              placeholder="Ej. 20 (dejalo vacío para no aplicar descuento)"
            />
            <span className="text-[10px] text-white/35">
              Si completás este campo, el producto se mostrará con el precio tachado y el descuento aplicado.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-xs text-white/55">
            Descripción (opcional)
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c8b995]" placeholder="Detalles del producto" />
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-xs text-white/55">Imagen del producto</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 bg-[#0b0b0b] px-4 py-6 text-xs uppercase tracking-[0.12em] text-white/60 hover:border-[#c8b995] hover:text-[#c8b995]">
              {uploading ? <><span className="size-4 animate-spin rounded-full border-2 border-[#c8b995] border-t-transparent" />Subiendo...</> : 'Subir imagen'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} disabled={uploading} className="sr-only" />
            </label>
            {imageUrl && (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="Vista previa" className="size-16 object-cover" />
                <p className="truncate text-xs text-emerald-300">Imagen subida correctamente</p>
              </div>
            )}
            {uploadError && <p role="alert" className="text-xs text-red-300">{uploadError}</p>}
          </div>

          {saveError && <p className="text-xs text-red-300">{saveError}</p>}

          <div className="flex justify-end gap-3 border-t border-white/10 pt-5">
            <button type="button" onClick={onClose} className="px-4 py-3 text-xs uppercase tracking-[0.15em] text-white/50 hover:text-white">Cancelar</button>
            <button type="submit" disabled={uploading || saving} className="bg-[#c8b995] px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-black disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value)
}