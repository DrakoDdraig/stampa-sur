import { NextResponse } from 'next/server'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export async function POST(request: Request) {
  try {
    const { to, subject, htmlContent } = await request.json()

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Falta la lista de destinatarios' }, { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta configurar BREVO_API_KEY' }, { status: 500 })
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Stampa Sur',
          email: 'surstampa@gmail.com', // ← CAMBIAR por tu email verificado
        },
        to,
        subject,
        htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: error.message || 'Error al enviar el mail' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error enviando mail:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}