import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

function AnimatedSphere() {
  const meshRef = useRef()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={2}>
      <MeshDistortMaterial
        color="#6366f1"
        attach="material"
        distort={0.3}
        speed={2}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  )
}

function FlowingParticles() {
  const count = 50
  const particles = useRef()
  
  useFrame((state) => {
    if (particles.current) {
      particles.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10
  }

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#34d399" transparent opacity={0.8} />
    </points>
  )
}

export default function TransactionFlow({ transactions = [] }) {
  const [hoveredTx, setHoveredTx] = useState(null)

  return (
    <div className="glass-card p-6 h-[400px] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <AnimatedSphere />
          <FlowingParticles />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      <div className="relative z-10">
        <h2 className="text-xl font-bold mb-4">Transaction Flow</h2>
        
        <div className="space-y-3 mt-6">
          {(transactions.length > 0 ? transactions : [
            { id: 1, from: 'USD', to: 'EUR', amount: 5000, status: 'completed' },
            { id: 2, from: 'GBP', to: 'JPY', amount: 3200, status: 'processing' },
            { id: 3, from: 'EUR', to: 'USD', amount: 8500, status: 'completed' },
          ]).slice(0, 3).map((tx, idx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onHoverStart={() => setHoveredTx(tx.id)}
              onHoverEnd={() => setHoveredTx(null)}
              className="flex items-center gap-4 p-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 hover:border-primary-500/50 transition-all"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="font-bold text-primary-400">{tx.from}</span>
                <motion.div
                  animate={{ x: hoveredTx === tx.id ? [0, 5, 0] : 0 }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-gray-500"
                >→</motion.div>
                <span className="font-bold text-accent-400">{tx.to}</span>
              </div>
              <span className="font-mono font-semibold">${tx.amount.toLocaleString()}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {tx.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
