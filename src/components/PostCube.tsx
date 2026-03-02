import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text, Float, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Post } from '../db';
import { MessageSquare, Wrench, Package } from 'lucide-react';

interface PostCubeProps {
  post: Post;
  position: [number, number, number];
  index: number;
}

export default function PostCube({ post, position, index }: PostCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  // Rotate the cube slowly
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.01;
      if (hovered) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  const getIcon = () => {
    switch (post.type) {
      case 'skill': return <Wrench size={24} className="text-emerald-500" />;
      case 'resource': return <Package size={24} className="text-purple-500" />;
      default: return <MessageSquare size={24} className="text-blue-500" />;
    }
  };

  const getColor = () => {
    switch (post.type) {
      case 'skill': return '#10b981';
      case 'resource': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        position={position}
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => setActive(!active)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <MeshWobbleMaterial 
          color={getColor()} 
          factor={hovered ? 0.2 : 0.05} 
          speed={2} 
          transparent 
          opacity={0.8}
        />
        
        {/* Content inside the cube using Html */}
        <Html
          distanceFactor={10}
          position={[0, 0, 1.1]}
          transform
          occlude
          style={{
            width: '200px',
            pointerEvents: hovered ? 'auto' : 'none',
            transition: 'all 0.5s ease',
            opacity: hovered ? 1 : 0.2,
            transform: `scale(${hovered ? 1 : 0.8})`,
          }}
        >
          <div 
            className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                {getIcon()}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {post.author}
              </span>
            </div>
            <p className="text-xs text-gray-800 font-bold line-clamp-3 leading-relaxed">
              {post.content}
            </p>
          </div>
        </Html>

        {/* Floating Text for the author on another face */}
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKbxmcSA.woff"
        >
          {post.author}
        </Text>
      </mesh>
    </Float>
  );
}
