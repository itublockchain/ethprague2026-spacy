import { useGSAP } from '@gsap/react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { useRef } from 'react'
import type { Group } from 'three'
import { OrbitPath } from './objects/OrbitPath'
import { Satellite } from './objects/Satellite'

const ELLIPSE_A = 6.5
const ELLIPSE_B = 2.4
const ROTATION = -0.38
const PERIOD = 18

function OrbitingSatellite() {
  const ref = useRef<Group>(null)

  useGSAP(() => {
    if (!ref.current) return
    const obj = { t: 0 }
    const cosA = Math.cos(ROTATION)
    const sinA = Math.sin(ROTATION)
    gsap.to(obj, {
      t: Math.PI * 2,
      duration: PERIOD,
      ease: 'none',
      repeat: -1,
      onUpdate: () => {
        if (!ref.current) return
        const x = ELLIPSE_A * Math.cos(obj.t)
        const y = ELLIPSE_B * Math.sin(obj.t)
        ref.current.position.set(x * cosA - y * sinA, x * sinA + y * cosA, 0)
      },
    })
  }, [])

  return <Satellite ref={ref} scale={0.6} />
}

export function OrbitScene() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 35 }}
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <OrbitPath />
        <OrbitingSatellite />
      </Canvas>
    </div>
  )
}
