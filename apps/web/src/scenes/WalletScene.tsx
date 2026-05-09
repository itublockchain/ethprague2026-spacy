import { Line } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import type { SendState } from '@spacy-computer/sdk'
import gsap from 'gsap'
import { motion } from 'motion/react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { Satellite } from './objects/Satellite'

interface WalletSceneProps {
  state: SendState
}

const ARC_A = 5
const ARC_B = 3.62
const Y_OFFSET = -2.52
const STEPS = 96

function arcPosition(p: number): [number, number, number] {
  const t = Math.PI - p * Math.PI
  return [ARC_A * Math.cos(t), ARC_B * Math.sin(t) + Y_OFFSET, 0]
}

function arcTangentAngle(p: number): number {
  const t = Math.PI - p * Math.PI
  const dx = ARC_A * Math.sin(t) * Math.PI
  const dy = -ARC_B * Math.cos(t) * Math.PI
  return Math.atan2(dy, dx) - Math.PI / 2
}

function ArcPath({ opacity }: { opacity: number }) {
  const points = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= STEPS; i++) {
      pts.push(arcPosition(i / STEPS))
    }
    return pts
  }, [])
  return <Line points={points} color="#9A9388" lineWidth={1} transparent opacity={opacity} />
}

interface TravelingSatelliteProps {
  progressRef: React.RefObject<{ current: number }>
}

function TravelingSatellite({ progressRef }: TravelingSatelliteProps) {
  const ref = useRef<Group>(null)

  useFrame(() => {
    if (!ref.current) return
    const p = progressRef.current.current
    if (p < -0.05 || p > 1.05) {
      ref.current.visible = false
      return
    }
    ref.current.visible = true
    const [x, y, z] = arcPosition(p)
    ref.current.position.set(x, y, z)
    ref.current.rotation.z = arcTangentAngle(p)
  })

  return (
    <group ref={ref} visible={false}>
      <Satellite scale={0.55} />
    </group>
  )
}

function targetProgress(status: SendState['status']): number {
  switch (status) {
    case 'idle':
      return -0.1
    case 'failed':
      return -0.1
    case 'authorizing':
      return 0.18
    case 'orbital-signing':
      return 0.5
    case 'ground-signing':
      return 0.5
    case 'broadcasting':
      return 0.5
    case 'confirmed':
      return 1.1
    default:
      return -0.1
  }
}

function transitionDuration(status: SendState['status']): number {
  switch (status) {
    case 'authorizing':
      return 0.6
    case 'orbital-signing':
      return 1.2
    case 'ground-signing':
      return 0.5
    case 'broadcasting':
      return 0.4
    case 'confirmed':
      return 1.2
    default:
      return 0.6
  }
}

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
      className="pointer-events-none absolute top-[28%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 select-none flex-col items-center gap-1.5 font-mono text-[14px]"
      initial={false}
      animate={{ opacity: active ? 0.95 : 0 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
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

export function WalletScene({ state }: WalletSceneProps) {
  const progressRef = useRef({ current: -0.1 })

  useEffect(() => {
    const target = targetProgress(state.status)
    const duration = transitionDuration(state.status)
    gsap.to(progressRef.current, {
      current: target,
      duration,
      ease: 'power1.inOut',
    })
  }, [state.status])

  const arcOpacity = 0.3

  const auroraActive = state.status === 'ground-signing' || state.status === 'broadcasting'
  const obscured =
    state.status === 'idle' ||
    state.status === 'failed' ||
    state.status === 'authorizing' ||
    state.status === 'orbital-signing'

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 35 }}
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-5, 0, -3]} intensity={0.3} color="#DCE4EC" />
        <ArcPath opacity={arcOpacity} />
        <Suspense fallback={null}>
          <TravelingSatellite progressRef={progressRef} />
        </Suspense>
      </Canvas>

      <motion.div
        className="pointer-events-none absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 360,
          height: 360,
          background: 'radial-gradient(circle, rgba(111,168,143,0.55), transparent 65%)',
          filter: 'blur(48px)',
        }}
        initial={false}
        animate={
          auroraActive
            ? { opacity: [0.55, 1, 0.55], scale: [1.0, 1.15, 1.0] }
            : { opacity: 0, scale: 0.85 }
        }
        transition={
          auroraActive
            ? { duration: 1.6, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }
            : { duration: 0.9, ease: 'easeOut' }
        }
        aria-hidden="true"
      />

      <ScrambleOverlay active={obscured} />
    </div>
  )
}
