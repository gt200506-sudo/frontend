import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion } from "framer-motion";

const SphereWithDots = () => {
  const groupRef = useRef<THREE.Group>(null);

  const { positions, linePositions } = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 2;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }

    const lines: number[] = [];
    const threshold = 1.2;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < threshold) {
          lines.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          lines.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
        }
      }
    }

    return { positions: pos, linePositions: new Float32Array(lines) };
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[2.05, 32, 32]} />
        <meshBasicMaterial color="#2dd4a8" transparent opacity={0.05} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#2dd4a8" size={0.04} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2dd4a8" transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
};

interface ContentGuardIntroProps {
  onExplore: () => void;
}

const ContentGuardIntro = ({ onExplore }: ContentGuardIntroProps) => {
  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center overflow-hidden cursor-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(175 72% 46%) 1px, transparent 1px), linear-gradient(90deg, hsl(175 72% 46%) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.5} color="#2dd4a8" />
          <SphereWithDots />
        </Canvas>
      </div>

      <div className="relative z-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="landing-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-[0.3em] text-foreground mb-12"
        >
          CONTENTGUARD
        </motion.h1>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            boxShadow: [
              "0 0 20px hsl(175 72% 46% / 0.4), 0 0 60px hsl(175 72% 46% / 0.15)",
              "0 0 30px hsl(175 72% 46% / 0.6), 0 0 80px hsl(175 72% 46% / 0.25)",
              "0 0 20px hsl(175 72% 46% / 0.4), 0 0 60px hsl(175 72% 46% / 0.15)",
            ],
          }}
          transition={{
            opacity: { delay: 0.8, duration: 0.8 },
            boxShadow: { delay: 1.6, duration: 2.5, repeat: Infinity, ease: "easeInOut" },
          }}
          onClick={onExplore}
          className="px-10 py-3.5 rounded-full landing-display tracking-[0.2em] text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, hsl(175, 72%, 46%), hsl(190, 80%, 55%))",
          }}
        >
          EXPLORE
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mt-20 tracking-[0.4em] text-base md:text-lg font-bold uppercase"
          style={{
            color: "hsl(185, 90%, 65%)",
            textShadow:
              "0 0 10px hsl(185 90% 65% / 0.6), 0 0 30px hsl(185 90% 65% / 0.3), 0 0 60px hsl(185 90% 65% / 0.15)",
          }}
        >
          Protecting the Knowledge Economy
        </motion.p>
      </div>
    </div>
  );
};

export default ContentGuardIntro;
