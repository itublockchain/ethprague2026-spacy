import { forwardRef } from 'react'
import { BackSide, type Group } from 'three'

export const Planet = forwardRef<Group>(function Planet(_props, ref) {
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1.4, 64, 64]} />
        <meshStandardMaterial
          color="#1a1f24"
          roughness={1}
          metalness={0}
          emissive="#1a1f24"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#DCE4EC" transparent opacity={0.15} side={BackSide} />
      </mesh>
    </group>
  )
})
