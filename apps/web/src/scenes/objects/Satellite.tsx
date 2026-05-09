import { useGLTF } from '@react-three/drei'
import { forwardRef, useMemo } from 'react'
import { Box3, type Group, Vector3 } from 'three'

interface SatelliteProps {
  scale?: number
}

const MODEL_URL = '/models/deep-space-1.glb'
const NORMALIZE_TO = 2

export const Satellite = forwardRef<Group, SatelliteProps>(function Satellite({ scale = 1 }, ref) {
  const { scene } = useGLTF(MODEL_URL)

  const factor = useMemo(() => {
    const size = new Box3().setFromObject(scene).getSize(new Vector3())
    const max = Math.max(size.x, size.y, size.z)
    return max > 0 ? NORMALIZE_TO / max : 1
  }, [scene])

  return (
    <group ref={ref}>
      <pointLight color="#6FA88F" intensity={0.55} distance={8} />
      <group scale={scale * factor} rotation={[0, Math.PI, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  )
})

useGLTF.preload(MODEL_URL)
