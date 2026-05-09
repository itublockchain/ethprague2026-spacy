import { Float, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { SendState } from '@spacy/types'
import gsap from 'gsap'
import { motion } from 'motion/react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Color, type Group, Mesh, MeshStandardMaterial } from 'three'
import { Satellite } from './objects/Satellite'

interface WalletSceneProps {
  state: SendState
}

const AURORA = '#6FA88F'
const SAT_BASE = '#000000'

const HEX = '0123456789abcdef'

interface ScrambleLine {
  text: string
  tone: string
}

function generateLines(): ScrambleLine[] {
  return Array.from({ length: 5 }, () => {
    const len = 14 + Math.floor(Math.random() * 12)
    let s = '0x'
    for (let i = 0; i < len; i++) {
      s += HEX.charAt(Math.floor(Math.random() * 16))
    }
    const roll = Math.random()
    const tone = roll > 0.85 ? 'text-aurora/70' : roll > 0.7 ? 'text-frost/55' : 'text-amber/65'
    return { text: s, tone }
  })
}

function ScrambleOverlay({ active }: { active: boolean }) {
  const [lines, setLines] = useState<ScrambleLine[]>(generateLines)

  useEffect(() => {
    setLines(generateLines())
    if (!active) return
    const id = setInterval(() => {
      setLines(generateLines())
    }, 350)
    return () => clearInterval(id)
  }, [active])

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex select-none flex-col items-center justify-center gap-1.5 font-mono text-[14px]"
      initial={false}
      animate={{ opacity: active ? 0.95 : 0 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      {lines.map((line) => (
        <span key={line.text} className={line.tone} style={{ letterSpacing: '0.06em' }}>
          {line.text}
        </span>
      ))}
    </motion.div>
  )
}

function useEmissiveShift(
  groupRef: React.RefObject<Group | null>,
  active: boolean,
  baseColor: string,
) {
  useEffect(() => {
    const root = groupRef.current
    if (!root) return
    const target = new Color(active ? AURORA : baseColor)
    root.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        gsap.to(child.material.emissive, {
          r: target.r,
          g: target.g,
          b: target.b,
          duration: 0.6,
          ease: 'power2.out',
        })
      }
    })
  }, [active, baseColor, groupRef])
}

export function WalletScene({ state }: WalletSceneProps) {
  const satRef = useRef<Group>(null)

  const satActive =
    state.status === 'orbital-signing' ||
    state.status === 'ground-signing' ||
    state.status === 'broadcasting'

  const obscured = state.status === 'idle' || state.status === 'failed'

  useEmissiveShift(satRef, satActive, SAT_BASE)

  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <motion.div
        className="pointer-events-none absolute -inset-16"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(111,168,143,0.45), transparent 65%)',
          filter: 'blur(48px)',
        }}
        initial={false}
        animate={{ opacity: satActive ? 1 : 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        aria-hidden="true"
      />

      <motion.div
        className="relative h-[320px] w-full"
        animate={{
          filter: obscured ? 'blur(26px) saturate(1.1)' : 'blur(0px) saturate(1.05)',
        }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      >
        <Canvas
          camera={{ position: [0, 0, 3.4], fov: 35 }}
          dpr={[1, 1.5]}
          frameloop="always"
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <directionalLight position={[-5, 0, -3]} intensity={0.3} color="#DCE4EC" />
          <Suspense fallback={null}>
            <Float speed={1.6} rotationIntensity={0.18} floatIntensity={0.25}>
              <group ref={satRef}>
                <Satellite scale={1} />
              </group>
            </Float>
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.55}
          />
        </Canvas>
      </motion.div>

      <ScrambleOverlay active={obscured} />
    </div>
  )
}
