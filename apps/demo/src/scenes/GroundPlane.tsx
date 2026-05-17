export function GroundPlane() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#efe8d8" roughness={0.88} metalness={0} />
    </mesh>
  )
}
