'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { CONFIG_PERSONALIZACION as config } from '@/config/personalizacion'
import { ScrollReveal } from '@/components/motion-effects'
import { useAuth } from '@/components/auth-provider'
import { db } from '@/lib/firebase'

function ShirtPreview({ color, design }: { color: string; design: string }) {
  return <div className="relative mx-auto aspect-[0.85] w-full max-w-90 overflow-hidden rounded-sm bg-[#0d0d0d] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"><svg viewBox="0 0 360 430" className="h-full w-full" role="img" aria-label="Vista previa de la remera"><path fill={color} d="M92 54 142 25h76l50 29 78 73-45 58-43-37v244H102V148l-43 37-45-58 78-73Z" /><path fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3" d="M142 25c8 31 20 45 38 45s30-14 38-45M102 148l22 18m134-18-22 18" /></svg>{design && <img src={design} alt="Tu diseño sobre la remera" className="absolute left-1/2 top-[45%] max-h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-contain" />}</div>
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

  // Datos del usuario desde Firestore
  const [nombreCliente, setNombreCliente] = useState('')
  const [datosCompletos, setDatosCompletos] = useState(false)
  const [faltantes, setFaltantes] = useState<string[]>([])

  useEffect(() => () => { if (design && design.startsWith('blob:')) URL.revokeObjectURL(design) }, [design])

  // Cargar datos del usuario (nombre real + verificar datos de envío)
  useEffect(() => {
    if (!user) {
      setNombreCliente('')
      setDatosCompletos(false)
      setFaltantes([])
      return
    }
    const cargar = async () => {
      try {
        const ref = doc(db, 'usuarios', user.uid)
        const snap = await getDoc(ref)
        const d = snap.data() ?? {}

        // Nombre real: primero el de Firestore, sino el displayName, sino el email
        const nombreReal = d.nombre || user.displayName || user.email?.split('@')[0] || 'Cliente'
        setNombreCliente(nombreReal)

        // Verificar datos de envío
        const faltan: string[] = []
        if (!d.telefono) faltan.push('teléfono')
        if (!d.direccion) faltan.push('dirección')
        if (!d.ciudad) faltan.push('ciudad')
        if (!d.codigoPostal) faltan.push('código postal')
        setFaltantes(faltan)
        setDatosCompletos(faltan.length === 0)
      } catch (error) {
        console.error('Error cargando datos del usuario:', error)
      }
    }
    cargar()
  }, [user])

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

  function openWhatsApp(message: string) {
    window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  // Armar mensaje de WhatsApp
  const disenoTexto = designUrl || '[el cliente adjunta la imagen por WhatsApp]'
  const notasTexto = notes.trim() ? `\nNotas: ${notes.trim()}` : ''

const message = `Hola Stampa Sur! Quiero personalizar una remera.\n\nCliente: ${nombreCliente || '[completar]'}\nProducto: Remera personalizada\nTalle: ${size}\nColor: ${color.nombre}\nDiseño: ${disenoTexto}${notasTexto}`
  const helpMessage = 'Hola Stampa Sur! Quiero una remera personalizada pero no tengo el diseño. ¿Me pueden ayudar a crearlo?'

  const puedeFinalizar = !!user && datosCompletos && !!designUrl && !uploading

  return (
    <section id="personalizar" className="border-y border-white/10 bg-[#11100e] px-5 py-20 lg:px-10">
      <ScrollReveal className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#c8b995]">Diseñá la tuya</p>
          <h2 className="font-serif text-5xl leading-none sm:text-7xl">Personalizá tu estampa</h2>
          <p className="mt-6 text-sm leading-7 text-white/55">Elegí cómo querés empezar. El diseño y la coordinación final se resuelven por WhatsApp.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* CAMINO A */}
          <div className="border border-white/10 bg-[#0b0b0b] p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Camino A</p>
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
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/55">Preview en vivo</p>
                <ShirtPreview color={color.hex} design={design} />
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-white/35">{size} · {color.nombre}</p>
              </div>

              <div>
                <label htmlFor="design-upload" className="block cursor-pointer border border-dashed border-white/20 px-4 py-4 text-xs uppercase tracking-[0.15em] text-[#c9a961] transition hover:border-[#c9a961]">
                  {uploading ? 'Subiendo...' : design ? 'Cambiar diseño PNG' : 'Subir diseño PNG'}
                </label>
                <input id="design-upload" type="file" accept="image/png" onChange={handleDesign} disabled={uploading} className="sr-only" />
                {uploadError && <p className="mt-3 text-xs text-red-300">{uploadError}</p>}
                {designUrl && <p className="mt-3 text-xs text-emerald-300">Imagen subida correctamente.</p>}
                <p className="mt-3 text-xs leading-6 text-white/55">Subí tu diseño en PNG con fondo transparente. Si la imagen tiene fondo, se va a estampar tal cual.</p>
              </div>

              <label className="text-[10px] uppercase tracking-[0.25em] text-white/55">
                Notas opcionales
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Contanos algún detalle" className="mt-3 w-full resize-none border border-white/15 bg-transparent px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-[#c9a961]" />
              </label>

              {/* BOTÓN FINALIZAR */}
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

          {/* CAMINO B */}
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
    </section>
  )
}