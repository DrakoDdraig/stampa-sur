'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LogOut, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/app/providers'
import { AnimatedHeader, CartPop, CursorGlow } from '@/components/motion-effects'
import { useAuth } from '@/components/auth-provider'

const logoUrl = 'https://i.ibb.co/gbpFcrVS/222.png'

export function ShopHeader() {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { count } = useCart()
  const { user, role, logout } = useAuth()
  const router = useRouter()

  const accountLink = user
    ? <Link href="/mi-cuenta">Mi cuenta</Link>
    : <Link href="/login">Iniciar sesión</Link>

  // Cerrar el menú al hacer clic afuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    router.push('/')
  }

  return (
    <>
      <CursorGlow />
      <AnimatedHeader>
        <Link href="/" className="flex items-center gap-3">
          <Image src={logoUrl} alt="Logo Stampa Sur" width={160} height={160} unoptimized className="size-20 object-contain" />
          <span className="font-serif text-lg tracking-[0.16em]">STAMPA <span className="text-[#aaa398]">SUR</span></span>
        </Link>

        <nav className="hidden items-center gap-8 text-[10px] uppercase tracking-[0.28em] text-white/60 md:flex">
          <Link href="/">Inicio</Link>
          <Link className="text-[#c8b995]" href="/tienda">Tienda</Link>
          {accountLink}
          {role === 'admin' && (
            <Link href="/admin" className="text-[#c8b995] transition hover:text-[#eadcb8]">
              Administrar tienda
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <button aria-label="Buscar" className="text-white/70">
            <Search className="size-4" />
          </button>

          <Link href="/carrito" aria-label={`Carrito, ${count} productos`} className="relative">
            <ShoppingBag className="size-5" />
            <CartPop count={count} />
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-xs text-white/70 transition hover:text-[#c8b995]"
                aria-label="Menú de usuario"
              >
                <UserRound className="size-5" />
                <span className="hidden max-w-24 truncate sm:block">
                  {user.displayName ?? user.email?.split('@')[0]}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 border border-[#c8b995]/20 bg-[#11100e] shadow-lg">
                  <Link
                    href="/mi-cuenta"
                    onClick={() => setMenuOpen(false)}
                    className="block px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white/70 transition hover:bg-[#c8b995]/10 hover:text-[#c8b995]"
                  >
                    Mi cuenta
                  </Link>
                  {role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block border-t border-white/5 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#c8b995] transition hover:bg-[#c8b995]/10"
                    >
                      Administrar tienda
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-white/5 px-5 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut className="size-3" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden text-[10px] uppercase tracking-[0.15em] text-white/60 sm:block">
              Iniciar sesión
            </Link>
          )}

          <button aria-label="Menú" className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </AnimatedHeader>

      {open && (
        <nav className="flex flex-col gap-5 border-t border-white/10 px-5 py-6 text-[10px] uppercase tracking-[0.28em] md:hidden">
          <Link href="/">Inicio</Link>
          <Link href="/tienda">Tienda</Link>
          {accountLink}
          {role === 'admin' && <Link href="/admin" className="text-[#c8b995]">Administrar tienda</Link>}
        </nav>
      )}
    </>
  )
}