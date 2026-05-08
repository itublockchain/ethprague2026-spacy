import { motion } from 'motion/react'
import { useSpacyAuth } from '../hooks/useSpacyAuth'
import { OrbitScene } from '../scenes/OrbitScene'
import { Hook } from '../ui/Hook'
import { SignInButton } from '../ui/SignInButton'
import { Wordmark } from '../ui/Wordmark'

export function Landing() {
  const { ready, signIn } = useSpacyAuth()

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <OrbitScene />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute top-6 right-0 left-0 z-10 flex justify-center"
      >
        <Wordmark />
      </motion.div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6">
        <Hook>
          Signed above the <span className="text-amber">atmosphere</span>.
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
