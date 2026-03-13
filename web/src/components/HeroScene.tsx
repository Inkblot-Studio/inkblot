import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, MeshTransmissionMaterial, OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';

function HeroObject() {
	const meshRef = useRef<Mesh>(null);

	useFrame((state, delta) => {
		if (!meshRef.current) return;
		meshRef.current.rotation.y += delta * 0.2;
		meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
	});

	const points = useMemo(
		() => [
			[-1.2, -0.4, -0.8],
			[0.8, 1.1, -0.5],
			[1.2, -0.5, 0.9],
			[-0.7, 0.8, 1.2],
		],
		[],
	);

	return (
		<Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.45}>
			<group>
				<mesh ref={meshRef}>
					<icosahedronGeometry args={[1.08, 32]} />
					<MeshTransmissionMaterial
						thickness={0.55}
						roughness={0.08}
						chromaticAberration={0.08}
						anisotropicBlur={0.1}
						ior={1.2}
						color="#7de7ff"
						distortion={0.28}
						distortionScale={0.35}
						temporalDistortion={0.08}
					/>
				</mesh>
				{points.map((point, idx) => (
					<mesh key={idx} position={point as [number, number, number]}>
						<sphereGeometry args={[0.035, 16, 16]} />
						<meshStandardMaterial color="#7de7ff" emissive="#2fd4ff" emissiveIntensity={1.5} />
					</mesh>
				))}
			</group>
		</Float>
	);
}

export default function HeroScene() {
	return (
		<div className="h-[380px] w-full md:h-[520px]">
			<Canvas camera={{ position: [0, 0, 4.2], fov: 48 }}>
				<color attach="background" args={['#070b1b']} />
				<ambientLight intensity={0.6} />
				<directionalLight position={[4, 3, 3]} intensity={1.4} color="#8cecff" />
				<HeroObject />
				<Environment preset="city" />
				<OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.35} />
			</Canvas>
		</div>
	);
}
