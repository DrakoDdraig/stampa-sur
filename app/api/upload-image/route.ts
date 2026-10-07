import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const apiKey = process.env.IMGBB_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'La configuración de ImgBB no está disponible.' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const image = formData.get('image')

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Seleccioná una imagen válida.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: 'Usá una imagen JPG, PNG, WEBP o GIF.' }, { status: 400 })
    }
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar los 8 MB.' }, { status: 400 })
    }

    const payload = new FormData()
    payload.append('key', apiKey)
    payload.append('image', image)

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: payload,
      cache: 'no-store',
    })
    const result = await response.json()

    if (!response.ok || !result.success || !result.data?.url) {
      return NextResponse.json({ error: 'ImgBB no pudo procesar la imagen.' }, { status: 502 })
    }

    return NextResponse.json({ url: result.data.url })
  } catch {
    return NextResponse.json({ error: 'No pudimos subir la imagen. Intentá nuevamente.' }, { status: 500 })
  }
}