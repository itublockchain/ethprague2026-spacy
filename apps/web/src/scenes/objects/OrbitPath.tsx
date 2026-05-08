import { Line } from '@react-three/drei'
import { useMemo } from 'react'

const ELLIPSE_A = 6.5
const ELLIPSE_B = 2.4
const ROTATION = -0.38
const STEPS = 128

export function OrbitPath() {
  const points = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = []
    const cosA = Math.cos(ROTATION)
    const sinA = Math.sin(ROTATION)
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * Math.PI * 2
      const x = ELLIPSE_A * Math.cos(t)
      const y = ELLIPSE_B * Math.sin(t)
      pts.push([x * cosA - y * sinA, x * sinA + y * cosA, 0])
    }
    return pts
  }, [])

  return <Line points={points} color="#9A9388" lineWidth={1} transparent opacity={0.3} />
}
