import { forwardRef } from 'react'
import type { Group } from 'three'

interface SatelliteProps {
  scale?: number
}

export const Satellite = forwardRef<Group, SatelliteProps>(function Satellite({ scale = 1 }, ref) {
  return (
    <group ref={ref} scale={scale}>
      <mesh>
        <boxGeometry args={[0.4, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#15171D"
          emissive="#E8B65A"
          emissiveIntensity={0.25}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[-0.35, 0, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
        <meshStandardMaterial color="#0E1014" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 0, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
        <meshStandardMaterial color="#0E1014" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3]} />
        <meshStandardMaterial color="#9A9388" />
      </mesh>
      <pointLight color="#6FA88F" intensity={0.6} distance={8} />
    </group>
  )
})
