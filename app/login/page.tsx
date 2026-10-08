'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CircleUserRound, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, firebaseErrorMessage, googleProvider } from '@/lib/firebase'

const logoUrl = 'https://i.ibb.co/FtTQmgC/Chat-GPT-Image-6-oct-2026-04-55-52-a-m.png'

export default function LoginPage() {
  const [register, setRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutNotice, setCheckoutNotice] = useState(false)

  useEffect(() => { setCheckoutNotice(new URLSearchParams(window.location.search).get('redirect') === 'checkout') }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (register) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await setDoc(doc(db, 'usuarios', credential.user.uid), {
          nombre: name.trim(),
          email: email.trim().toLowerCase(),
          rol: 'cliente',
          fechaRegistro: new Date(),
        })
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
      const redirectParam = new URLSearchParams(window.location.search).get('redirect')
      if (redirectParam === 'checkout') {
        window.location.href = '/carrito'
      } else if (register) {
        window.location.href = '/mi-cuenta?nuevo=true'
      }
    } catch (cause) {
      if (register) console.log('[v0] Error durante el registro:', cause)
      setError(firebaseErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    setError('')
    setLoading(true)
    try {
      const credential = await signInWithPopup(auth, googleProvider)
      const userRef = doc(db, 'usuarios', credential.user.uid)
      const userSnapshot = await getDoc(userRef)
      const esNuevo = !userSnapshot.exists()
      if (esNuevo) {
        await setDoc(userRef, {
          nombre: credential.user.displayName ?? 'Cliente',
          email: credential.user.email ?? '',
          rol: 'cliente',
          fechaRegistro: new Date(),
        })
      }
      const redirectParam = new URLSearchParams(window.location.search).get('redirect')
      if (redirectParam === 'checkout') {
        window.location.href = '/carrito'
      } else if (esNuevo) {
        window.location.href = '/mi-cuenta?nuevo=true'
      }
    } catch (cause) {
      setError(firebaseErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }

  return <main className="min-h-screen bg-[#080808] text-[#f2f0eb]"><div className="grid min-h-screen lg:grid-cols-2"><div className="relative hidden items-center justify-center overflow-hidden border-r border-white/10 bg-[#11100e] lg:flex"><Image src={logoUrl} alt="Logo de Stampa Sur" width={520} height={520} className="w-[65%] max-w-130 object-contain" unoptimized /></div><div className="flex flex-col px-6 py-8 sm:px-16 lg:px-24"><Link href="/" className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-[#c8b995]"><ArrowLeft className="size-4" /> Volver al inicio</Link><div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16"><Image src={logoUrl} alt="Logo de Stampa Sur" width={90} height={90} className="mb-10 size-20 object-contain lg:hidden" unoptimized /><p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Stampa Sur</p><h1 className="font-serif text-5xl">{register ? 'Crear cuenta' : 'Bienvenido'}</h1><p className="mt-4 text-sm leading-6 text-white/45">{checkoutNotice ? 'Iniciá sesión para completar tu compra.' : register ? 'Formá parte de nuestra comunidad.' : 'Ingresá para continuar tu experiencia.'}</p><form className="mt-10 flex flex-col gap-5" onSubmit={submit}>{register && <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Nombre<input required value={name} onChange={(event) => setName(event.target.value)} className="border-b border-white/20 bg-transparent px-0 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-[#c8b995]" /></label>}<label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Email<span className="flex items-center border-b border-white/20"><Mail className="mr-3 size-4" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent py-3 text-sm normal-case tracking-normal text-white outline-none" /></span></label><label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.2em] text-white/55">Contraseña<span className="flex items-center border-b border-white/20"><LockKeyhole className="mr-3 size-4" /><input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent py-3 text-sm normal-case tracking-normal text-white outline-none" /><button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword((visible) => !visible)} className="ml-3 text-white/50 hover:text-[#c8b995]">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<button disabled={loading} className="mt-3 flex items-center justify-center gap-3 bg-[#c8b995] py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-[#ded0aa] disabled:cursor-wait disabled:opacity-60">{loading ? 'Procesando...' : register ? 'Crear cuenta' : 'Ingresar'}</button></form><div className="my-8 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-white/25"><span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" /></div><button type="button" onClick={google} disabled={loading} className="flex items-center justify-center gap-3 border border-white/15 py-4 text-[10px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/35 disabled:opacity-50"><CircleUserRound className="size-4" /> Continuar con Google</button><p className="mt-8 text-center text-xs text-white/40">{register ? '¿Ya tenés cuenta?' : '¿Todavía no tenés cuenta?'} <button type="button" onClick={() => { setRegister((value) => !value); setError('') }} className="text-[#c8b995] hover:underline">{register ? 'Ingresar' : 'Registrate'}</button></p></div></div></div></main>
}