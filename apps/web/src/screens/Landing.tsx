import { motion } from 'motion/react'
import { useSpacyAuth } from '../hooks/useSpacyAuth'
import { OrbitScene } from '../scenes/OrbitScene'
import { Hook } from '../ui/Hook'
import { SignInButton } from '../ui/SignInButton'

export function Landing() {
  const { ready, signIn } = useSpacyAuth()

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <OrbitScene />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6">
        <Hook>
          A wallet you don't have to <span className="text-amber">trust</span>.
        </Hook>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7, ease: 'easeOut' }}
        >
          <SignInButton onClick={signIn} disabled={!ready} />
        </motion.div>
      </main>
    </div>
  )
}
