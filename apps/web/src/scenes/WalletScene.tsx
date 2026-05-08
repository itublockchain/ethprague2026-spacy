import { Float } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { SendState } from '@spacy/types'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { Color, type Group, Mesh, MeshStandardMaterial } from 'three'
import { Planet } from './objects/Planet'
import { Satellite } from './objects/Satellite'

interface WalletSceneProps {
  state: SendState
}

const AURORA = '#6FA88F'
const SAT_BASE = '#E8B65A'
const PLANET_BASE = '#1a1f24'

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
  const planetRef = useRef<Group>(null)

  const orbitalActive =
    state.status === 'orbital-signing' ||
    state.status === 'ground-signing' ||
    state.status === 'broadcasting'
  const groundActive = state.status === 'ground-signing' || state.status === 'broadcasting'

  useEmissiveShift(satRef, orbitalActive, SAT_BASE)
  useEmissiveShift(planetRef, groundActive, PLANET_BASE)

  return (
    <div
      className="pointer-events-none h-[60vh] w-full"
      style={{ filter: 'blur(28px) saturate(1.1)' }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 35 }}
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-5, 0, -3]} intensity={0.3} color="#DCE4EC" />

        <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.4}>
          <group ref={satRef} position={[-2.5, 0, 0]}>
            <Satellite scale={1.4} />
          </group>
        </Float>
        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
          <group ref={planetRef} position={[2.5, 0, 0]}>
            <Planet />
          </group>
        </Float>
      </Canvas>
    </div>
  )
}
