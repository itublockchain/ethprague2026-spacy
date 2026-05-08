import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface HookProps {
  children: ReactNode
}

export function Hook({ children }: HookProps) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      style={{
        fontSize: 'clamp(56px, 9vw, 128px)',
        letterSpacing: '-0.04em',
        lineHeight: 1.05,
      }}
      className="max-w-[18ch] text-center font-bold text-starlight"
    >
      {children}
    </motion.h1>
  )
}
