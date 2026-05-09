import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  type Group,
  type PointsMaterial,
} from 'three'

function makeSparkleTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const cx = size / 2
  const cy = size / 2

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
  halo.addColorStop(0, 'rgba(255,255,255,0.7)')
  halo.addColorStop(0.25, 'rgba(255,255,255,0.25)')
  halo.addColorStop(0.6, 'rgba(255,255,255,0.05)')
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, size, size)

  ctx.beginPath()
  ctx.moveTo(cx, 0)
  ctx.quadraticCurveTo(cx, cy, size, cy)
  ctx.quadraticCurveTo(cx, cy, cx, size)
  ctx.quadraticCurveTo(cx, cy, 0, cy)
  ctx.quadraticCurveTo(cx, cy, cx, 0)
  ctx.closePath()

  const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
  fill.addColorStop(0, 'rgba(255,255,255,1)')
  fill.addColorStop(0.15, 'rgba(255,255,255,1)')
  fill.addColorStop(0.45, 'rgba(255,255,255,0.85)')
  fill.addColorStop(1, 'rgba(255,255,255,0.15)')
  ctx.fillStyle = fill
  ctx.fill()

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.12)
  core.addColorStop(0, 'rgba(255,255,255,1)')
  core.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = core
  ctx.fillRect(0, 0, size, size)

  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const STAR_PALETTE: [number, number, number][] = [
  [0.96, 0.94, 0.91], // starlight #F5F0E8
  [1.0, 0.89, 0.71], // warm amber-tinted white
  [0.86, 0.89, 0.93], // frost-tinted #DCE4EC
  [1.0, 1.0, 1.0], // pure white
]

interface StarfieldProps {
  count?: number
  radius?: number
}

export function Starfield({ count = 2000, radius = 30 }: StarfieldProps) {
  const groupRef = useRef<Group>(null)
  const matRef = useRef<PointsMaterial>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const lastPointer = useRef({ x: 0, y: 0 })
  const velocity = useRef(0)

  const texture = useMemo(makeSparkleTexture, [])

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = radius * (0.55 + 0.45 * Math.random())
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const roll = Math.random()
      let palette = STAR_PALETTE[0] ?? [1, 1, 1]
      if (roll > 0.85) palette = STAR_PALETTE[1] ?? palette
      else if (roll > 0.7) palette = STAR_PALETTE[2] ?? palette
      else if (roll > 0.55) palette = STAR_PALETTE[3] ?? palette
      const brightness = 1.0 + Math.random() * 0.6
      colors[i * 3] = (palette[0] ?? 1) * brightness
      colors[i * 3 + 1] = (palette[1] ?? 1) * brightness
      colors[i * 3 + 2] = (palette[2] ?? 1) * brightness
    }
    const geom = new BufferGeometry()
    geom.setAttribute('position', new BufferAttribute(positions, 3))
    geom.setAttribute('color', new BufferAttribute(colors, 3))
    return geom
  }, [count, radius])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame((_state, dt) => {
    const p = pointer.current
    if (groupRef.current) {
      const targetX = p.y * 0.05
      const targetY = p.x * 0.1
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * dt * 2.5
      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * dt * 2.5
    }

    const dx = p.x - lastPointer.current.x
    const dy = p.y - lastPointer.current.y
    const v = Math.hypot(dx, dy)
    velocity.current += (v - velocity.current) * 0.18
    lastPointer.current = { x: p.x, y: p.y }

    if (matRef.current) {
      const target = 1 + Math.min(velocity.current * 18, 0.4)
      matRef.current.opacity += (target - matRef.current.opacity) * dt * 6
    }
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          ref={matRef}
          map={texture ?? null}
          size={0.8}
          sizeAttenuation
          transparent
          opacity={1}
          depthWrite={false}
          blending={AdditiveBlending}
          vertexColors
        />
      </points>
    </group>
  )
}
