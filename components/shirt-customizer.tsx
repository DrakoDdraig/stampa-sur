'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CONFIG_PERSONALIZACION as config } from '@/config/personalizacion'
import { ScrollReveal } from '@/components/motion-effects'
import { useAuth } from '@/components/auth-provider'
import { db } from '@/lib/firebase'
import { addDoc, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { AlertCircle, X } from 'lucide-react'

function ShirtPreview({ color, design }: { color: string; design: string }) {
  return (
    <div className="relative mx-auto aspect-[0.85] w-full max-w-90 overflow-hidden rounded-sm bg-[#0d0d0d] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
      <svg viewBox="0 0 360 430" className="h-full w-full" role="img" aria-label="Vista previa de la remera">
        <path fill={color} d="M92 54 142 25h76l50 29 78 73-45 58-43-37v244H102V148l-43 37-45-58 78-73Z" />
        <path fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3" d="M142 25c8 31 20 45 38 45s30-14 38-45M102 148l22 18m134-18-22 18" />
      </svg>
      {design && <img src={design} alt="Tu diseño sobre la remera" className="absolute left-1/2 top-[45%] max-h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-contain" />}
    </div>
  )
}

export function ShirtCustomizer() {
  const { user } = useAuth()
  const [size, setSize] = useState<string>(config.tallesDisponibles[1])
  const [color, setColor] = useState<{ nombre: string; hex: string }>(config.coloresDisponibles[0])
  const [design, setDesign] = useState('')
  const [designUrl, setDesignUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [notes, setNotes] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [datosCompletos, setDatosCompletos] = useState(false)
  const [faltantes, setFaltantes] = useState<string[]>([])
  const [cargandoBorrador, setCargandoBorrador] = useState(true)
  const [guardado, setGuardado] = useState(false)
  const [guardadoVisible, setGuardadoVisible] = useState(false)
  const [guardandoDiseno, setGuardandoDiseno] = useState(false)
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false)
  const [mensajeLimite, setMensajeLimite] = useState('')
  const [exitoDiseno, setExitoDiseno] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  // Guarda el borrador cargado inicialmente para no re-guardarlo
  const borradorInicialRef = useRef<string | null>(null)

  useEffect(() => () => { if (design && design.startsWith('blob:')) URL.revokeObjectURL(design) }, [design])

  // Cargar datos del usuario
  useEffect(() => {
    if (!user) {
      setNombreCliente('')
      setDatosCompletos(false)
      setFaltantes([])
      setCargandoBorrador(false)
      return
    }
    const cargar = async () => {
      try {
        const ref = doc(db, 'usuarios', user.uid)
        const snap = await getDoc(ref)
        const d = snap.data() ?? {}
        const nombreReal = d.nombre || user.displayName || user.email?.split('@')[0] || 'Cliente'
        setNombreCliente(nombreReal)
        const faltan: string[] = []
        if (!d.telefono) faltan.push('teléfono')
        if (!d.direccion) faltan.push('dirección')
        if (!d.ciudad) faltan.push('ciudad')
        if (!d.codigoPostal) faltan.push('código postal')
        setFaltantes(faltan)
        setDatosCompletos(faltan.length === 0)

        // Cargar autoBorrador
        if (d.autoBorrador) {
          const b = d.autoBorrador
          if (b.talle) setSize(b.talle)
          if (b.colorNombre && b.colorHex) setColor({ nombre: b.colorNombre, hex: b.colorHex })
          if (b.imagenUrl) { setDesignUrl(b.imagenUrl); setDesign(b.imagenUrl) }
          if (b.notas) setNotes(b.notas)
          // Guardar el estado inicial para no volver a guardar lo mismo
          borradorInicialRef.current = JSON.stringify({
            talle: b.talle ?? '',
            colorNombre: b.colorNombre ?? '',
            colorHex: b.colorHex ?? '',
            imagenUrl: b.imagenUrl ?? '',
            notas: b.notas ?? '',
          })
        } else {
          borradorInicialRef.current = JSON.stringify({
            talle: config.tallesDisponibles[1],
            colorNombre: config.coloresDisponibles[0].nombre,
            colorHex: config.coloresDisponibles[0].hex,
            imagenUrl: '',
            notas: '',
          })
        }
      } catch (error) {
        console.error('Error cargando datos del usuario:', error)
      } finally {
        setCargandoBorrador(false)
      }
    }
    cargar()
  }, [user])
    // Cargar diseño desde la URL (?diseno=ID)
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const disenoId = params.get('diseno')
    if (!disenoId) return

    const cargarDiseno = async () => {
      try {
        const ref = doc(db, 'usuarios', user.uid, 'disenos', disenoId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const d = snap.data()
          if (d.talle) setSize(d.talle)
          if (d.colorNombre && d.colorHex) setColor({ nombre: d.colorNombre, hex: d.colorHex })
          if (d.imagenUrl) { setDesignUrl(d.imagenUrl); setDesign(d.imagenUrl) }
          if (d.notas) setNotes(d.notas)

          // Actualizar la referencia para que no muestre toast de auto-guardado
          borradorInicialRef.current = JSON.stringify({
            talle: d.talle ?? '',
            colorNombre: d.colorNombre ?? '',
            colorHex: d.colorHex ?? '',
            imagenUrl: d.imagenUrl ?? '',
            notas: d.notas ?? '',
          })
        }
      } catch (error) {
        console.error('Error cargando diseño:', error)
      }
    }
    cargarDiseno()
  }, [user])

  // Auto-guardado con debounce
  useEffect(() => {
    if (!user || cargandoBorrador) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const estadoActual = JSON.stringify({
          talle: size,
          colorNombre: color.nombre,
          colorHex: color.hex,
          imagenUrl: designUrl,
          notas: notes,
        })

        // Si el estado no cambió respecto al inicial, no guardar ni mostrar toast
        if (estadoActual === borradorInicialRef.current) return

        const ref = doc(db, 'usuarios', user.uid)
        await setDoc(ref, {
          autoBorrador: {
            talle: size,
            colorNombre: color.nombre,
            colorHex: color.hex,
            imagenUrl: designUrl,
            notas: notes,
            fecha: new Date(),
          },
        }, { merge: true })

        // Actualizar la referencia para que no vuelva a guardar lo mismo
        borradorInicialRef.current = estadoActual

        setGuardado(true)
        setGuardadoVisible(true)
        setTimeout(() => {
          setGuardadoVisible(false)
          setTimeout(() => setGuardado(false), 400)
        }, 1500)
      } catch (error) {
        console.error('Error guardando borrador:', error)
      }
    }, 1500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [size, color, designUrl, notes, user, cargandoBorrador])

  async function handleDesign(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadError('')
    if (design && design.startsWith('blob:')) URL.revokeObjectURL(design)
    setDesign(URL.createObjectURL(file))
    setUploading(true)
    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch('/api/upload-image', { method: 'POST', body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No pudimos subir la imagen.')
      setDesignUrl(result.url)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'No pudimos subir la imagen.')
      setDesignUrl('')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleGuardarDiseno() {
    if (!user) return
    if (!designUrl) {
      setMensajeLimite('Subí un diseño antes de guardarlo.')
      setLimiteAlcanzado(true)
      return
    }
    setGuardandoDiseno(true)
    setMensajeLimite('')
    try {
      const ref = collection(db, 'usuarios', user.uid, 'disenos')
      const snapshot = await getDocs(ref)
      if (snapshot.size >= 5) {
        setMensajeLimite('Alcanzaste el límite de 5 diseños. Para guardar este, eliminá uno desde "Mis diseños".')
        setLimiteAlcanzado(true)
        setGuardandoDiseno(false)
        return
      }
      await addDoc(ref, {
        talle: size,
        colorNombre: color.nombre,
        colorHex: color.hex,
        imagenUrl: designUrl,
        notas: notes,
        fecha: new Date(),
      })
      window.dispatchEvent(new Event('diseno-guardado'))
      setExitoDiseno(true)
      setTimeout(() => setExitoDiseno(false), 2500)
    } catch (error) {
      console.error('Error guardando diseño:', error)
      setMensajeLimite('No pudimos guardar el diseño. Intentá de nuevo.')
      setLimiteAlcanzado(true)
    } finally {
      setGuardandoDiseno(false)
    }
  }

  function openWhatsApp(message: string) {
    window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const disenoTexto = designUrl || '[el cliente adjunta la imagen por WhatsApp]'
  const notasTexto = notes.trim() ? `\nNotas: ${notes.trim()}` : ''
  const message = `Hola Stampa Sur! Quiero personalizar una remera.\n\nCliente: ${nombreCliente || '[completar]'}\nProducto: Remera personalizada\nTalle: ${size}\nColor: ${color.nombre}\nDiseño: ${disenoTexto}${notasTexto}`
  const helpMessage = 'Hola Stampa Sur! Quiero una remera personalizada pero no tengo el diseño. ¿Me pueden ayudar a crearlo?'

  return (
    <section id="personalizar" className="border-y border-white/10 bg-[#11100e] px-5 py-20 lg:px-10">
      <ScrollReveal className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Diseñá la tuya</p>
          <h2 className="font-serif text-5xl leading-none sm:text-7xl">Personalizá tu estampa</h2>
          <p className="mt-6 text-sm leading-7 text-white/55">Elegí cómo querés empezar. El diseño y la coordinación final se resuelven por WhatsApp.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="border border-white/10 bg-[#0b0b0b] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Camino A</p>
            </div>
            <h3 className="mt-3 font-serif text-3xl">Ya tengo mi diseño</h3>

            <div className="mt-8 flex flex-col gap-6">
              <fieldset>
                <legend className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/55">Talle</legend>
                <div className="flex flex-wrap gap-2">
                  {config.tallesDisponibles.map((item) => (
                    <button type="button" key={item} onClick={() => setSize(item)} aria-pressed={size === item} className={`size-11 border text-xs transition ${size === item ? 'border-[#c9a961] bg-[#c9a961] text-black' : 'border-white/15 text-white/65 hover:border-[#c9a961]'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/55">Color · {color.nombre}</legend>
                <div className="flex flex-wrap gap-3">
                  {config.coloresDisponibles.map((item) => (
                    <button type="button" key={item.nombre} onClick={() => setColor(item)} aria-label={item.nombre} aria-pressed={color.nombre === item.nombre} className={`size-9 rounded-full border-2 ${color.nombre === item.nombre ? 'border-[#c9a961] ring-2 ring-[#c9a961]/30 ring-offset-2 ring-offset-[#0b0b0b]' : 'border-white/25'}`} style={{ backgroundColor: item.hex }} />
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="design-upload" className="block cursor-pointer border border-dashed border-white/20 px-4 py-4 text-xs uppercase tracking-[0.15em] text-[#c9a961] transition hover:border-[#c9a961]">
                  {uploading ? 'Subiendo...' : design ? 'Cambiar diseño PNG' : 'Subir diseño PNG'}
                </label>
                <input id="design-upload" type="file" accept="image/png" onChange={handleDesign} disabled={uploading} className="sr-only" />
                {uploadError && <p className="mt-3 text-xs text-red-300">{uploadError}</p>}
                {designUrl && <p className="mt-3 text-xs text-emerald-300">Imagen subida correctamente.</p>}
                <p className="mt-3 text-xs leading-6 text-white/55">Subí tu diseño en PNG con fondo transparente. Si la imagen tiene fondo, se va a estampar tal cual.</p>
              </div>

              <div>
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/55">Preview en vivo</p>
                <ShirtPreview color={color.hex} design={design} />
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-white/35">{size} · {color.nombre}</p>
              </div>

              <label className="text-[10px] uppercase tracking-[0.25em] text-white/55">
                Notas opcionales
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Contanos algún detalle" className="mt-3 w-full resize-none border border-white/15 bg-transparent px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-[#c9a961]" />
              </label>

              {user && designUrl && (
                <button
                  type="button"
                  onClick={handleGuardarDiseno}
                  disabled={guardandoDiseno}
                  className="flex w-full items-center justify-center gap-3 border border-[#c9a961]/60 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#c9a961] transition hover:bg-[#c9a961] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoDiseno ? 'Guardando...' : 'Guardar diseño'}
                </button>
              )}

              {!user ? (
                <div className="flex flex-col gap-3 border border-[#c8b995]/30 bg-[#c8b995]/5 p-4">
                  <p className="text-xs leading-6 text-white/70">
                    Para pedir una remera personalizada necesitás <strong className="text-[#c8b995]">iniciar sesión</strong> o <strong className="text-[#c8b995]">crear una cuenta</strong>.
                  </p>
                  <Link href="/login?redirect=/" className="inline-flex items-center justify-center bg-[#c9a961] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-[#eadcb8]">
                    Iniciar sesión o registrarme
                  </Link>
                </div>
              ) : !datosCompletos ? (
                <div className="flex flex-col gap-3 border border-[#c8b995]/30 bg-[#c8b995]/5 p-4">
                  <p className="text-xs leading-6 text-white/70">
                    Antes de finalizar, completá tus <strong className="text-[#c8b995]">datos de envío</strong> en Mi Cuenta
                    {faltantes.length > 0 && <> (faltan: {faltantes.join(', ')})</>}.
                  </p>
                  <Link href="/mi-cuenta" className="inline-flex items-center justify-center bg-[#c9a961] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-[#eadcb8]">
                    Completar mis datos
                  </Link>
                </div>
              ) : !designUrl ? (
                <div className="border border-yellow-400/30 bg-yellow-400/5 p-4 text-xs leading-6 text-yellow-200/80">
                  Subí tu diseño (PNG) para habilitar el botón de finalizar.
                </div>
              ) : (
                <button type="button" onClick={() => openWhatsApp(message)} disabled={uploading} className="w-full bg-[#c9a961] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-[#eadcb8] disabled:cursor-not-allowed disabled:opacity-50">
                  {uploading ? 'Esperá, subiendo imagen...' : 'Finalizar pedido'}
                </button>
              )}
            </div>
          </div>

          <div className="border border-white/10 bg-[#0b0b0b] p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Camino B</p>
            <h3 className="mt-3 font-serif text-3xl">Quiero que me diseñen</h3>
            <p className="mt-5 text-sm leading-7 text-white/55">No tenés diseño todavía? Nuestro equipo puede ayudarte a crear una idea única.</p>
            <button type="button" onClick={() => openWhatsApp(helpMessage)} className="mt-8 inline-flex bg-[#c9a961] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-[#eadcb8]">
              No tengo diseño, ayúdenme
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Toast flotante de guardado */}
      {guardado && user && (
        <div
          className="fixed left-1/2 top-6 z-50 flex items-center gap-3 rounded-full border border-emerald-400/60 px-6 py-3 shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            animation: guardadoVisible
              ? 'bounceDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : 'slideUpOut 0.4s ease-in forwards',
            transform: 'translateX(-50%)',
          }}
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
            <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white">Diseño guardado</span>
        </div>
      )}

      {/* Toast de éxito al guardar diseño */}
      {exitoDiseno && (
        <div
          className="fixed left-1/2 top-6 z-50 flex items-center gap-3 rounded-full border border-emerald-400/60 px-6 py-3 shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            animation: 'bounceDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            transform: 'translateX(-50%)',
          }}
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-white/20">
            <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white">Diseño guardado en Mis Diseños</span>
        </div>
      )}

      {/* Modal de límite alcanzado */}
      {limiteAlcanzado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
          <div className="w-full max-w-md border border-white/10 bg-[#151515] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                <AlertCircle className="size-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-400">Atención</p>
                <h2 className="mt-2 font-serif text-2xl">Límite alcanzado</h2>
              </div>
              <button onClick={() => setLimiteAlcanzado(false)} className="ml-auto" aria-label="Cerrar">
                <X className="size-5 text-white/50" />
              </button>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/60">{mensajeLimite}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/mis-disenos"
                className="flex-1 bg-[#c9a961] px-5 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-[#eadcb8]"
              >
                Ir a Mis Diseños
              </Link>
              <button
                type="button"
                onClick={() => setLimiteAlcanzado(false)}
                className="flex-1 border border-white/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bounceDown {
          0% { opacity: 0; transform: translate(-50%, -120%); }
          50% { opacity: 1; transform: translate(-50%, 10%); }
          70% { transform: translate(-50%, -5%); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideUpOut {
          0% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -120%); }
        }
      `}</style>
    </section>
  )
}