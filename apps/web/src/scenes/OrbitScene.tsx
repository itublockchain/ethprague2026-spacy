import { useGSAP } from '@gsap/react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { Suspense, useRef } from 'react'
import type { Group } from 'three'
import { OrbitPath } from './objects/OrbitPath'
import { Satellite } from './objects/Satellite'
import { Starfield } from './objects/Starfield'

const ELLIPSE_A = 4.5
const ELLIPSE_B = 1.7
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

        const vx = -ELLIPSE_A * Math.sin(obj.t)
        const vy = ELLIPSE_B * Math.cos(obj.t)
        const vxRot = vx * cosA - vy * sinA
        const vyRot = vx * sinA + vy * cosA
        ref.current.rotation.z = Math.atan2(vyRot, vxRot) - Math.PI / 2
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
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 4, 5]} intensity={0.8} />
        <Starfield count={2000} radius={30} />
        <OrbitPath />
        <Suspense fallback={null}>
          <OrbitingSatellite />
        </Suspense>
      </Canvas>
    </div>
  )
}
