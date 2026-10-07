'use client'

import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import { useEffect, useState } from 'react'

export function CursorGlow() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const springX = useSpring(x, { stiffness: 120, damping: 28, mass: 0.6 })
  const springY = useSpring(y, { stiffness: 120, damping: 28, mass: 0.6 })

  useEffect(() => {
    const move = (event: MouseEvent) => { x.set(event.clientX); y.set(event.clientY) }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])

  return <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-10 hidden size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a961]/10 blur-3xl md:block" style={{ x: springX, y: springY }} />
}

export function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

export function ParallaxLogo({ src }: { src: string }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, 90])
  return <motion.img src={src} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(92vw,900px)] -translate-x-1/2 -translate-y-1/2 object-contain opacity-25 blur-[0.2px] will-change-transform" style={{ y }} />
}

export function AnimatedHeader({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll()
  const background = useTransform(scrollY, [0, 80], ['rgba(8,8,8,0.72)', 'rgba(8,8,8,0.96)'])
  const height = useTransform(scrollY, [0, 80], [80, 68])
  return <motion.header className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-xl" style={{ backgroundColor: background }}><motion.div className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-10" style={{ height }}>{children}</motion.div></motion.header>
}

export function MagneticButton({ children, className = '', ...props }: React.ComponentProps<typeof motion.button>) {
  return <motion.button className={`${className} will-change-transform`} whileHover={{ y: -2, boxShadow: '0 0 24px rgba(201,169,97,0.2)' }} whileTap={{ scale: 0.97 }} {...props}>{children}</motion.button>
}

export function CartPop({ count }: { count: number }) {
  const [key, setKey] = useState(0)
  useEffect(() => { setKey((value) => value + 1) }, [count])
  return <motion.span key={key} initial={{ scale: 0.7 }} animate={{ scale: [0.7, 1.2, 1] }} transition={{ duration: 0.35 }} className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[#c8b995] text-[9px] font-semibold text-black">{count}</motion.span>
}
