export type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  color: string
  sizes: string[]
  stock: number
   imageUrl?: string 
  customizable?: boolean
  tone: 'black' | 'white' | 'sand'
}

export const products: Product[] = [
  { id: 'dragon', name: 'Remera Dragón', description: 'La pieza insignia de Stampa Sur. Algodón premium, estampa frontal de alto contraste y calce relajado.', price: 15000, category: 'Íconos', color: 'Negro', sizes: ['S', 'M', 'L', 'XL'], stock: 12, customizable: true, tone: 'black' },
  { id: 'fenix', name: 'Remera Fénix', description: 'Una silueta limpia con el fuego del sur. Jersey de algodón suave y estampa serigráfica.', price: 16000, category: 'Íconos', color: 'Blanco', sizes: ['S', 'M', 'L'], stock: 8, tone: 'white' },
  { id: 'sur', name: 'Sello del Sur', description: 'Tipografía de culto y espíritu independiente. Una básica que no pasa desapercibida.', price: 14000, category: 'Esenciales', color: 'Negro', sizes: ['S', 'M', 'L', 'XL'], stock: 16, tone: 'black' },
  { id: 'luna', name: 'Luna Nueva', description: 'Diseño nocturno sobre algodón pesado, pensado para acompañar todos tus días.', price: 15500, category: 'Esenciales', color: 'Crudo', sizes: ['S', 'M', 'L'], stock: 6, customizable: true, tone: 'sand' },
]

export const formatPrice = (value: number) => `$${value.toLocaleString('es-AR')}`
export const whatsappNumber = '541133151857'

export function productArtwork(product: Product) {
  return product.tone === 'white' ? 'bg-[#e7e4dc] text-[#0a0a0a]' : product.tone === 'sand' ? 'bg-[#c9bca4] text-[#0a0a0a]' : 'bg-[#151515] text-[#e7e2d8]'
}