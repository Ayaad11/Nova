import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Stars } from '@react-three/drei';
import PostCube from './PostCube';
import { Post } from '../db';

interface Feed3DProps {
  posts: Post[];
}

export default function Feed3D({ posts }: Feed3DProps) {
  return (
    <div className="w-full h-[600px] bg-slate-950 rounded-[3rem] overflow-hidden shadow-2xl relative border border-white/5">
      <div className="absolute top-6 right-6 z-10 text-white/50 text-[10px] font-black uppercase tracking-widest pointer-events-none">
        Interactive 3D Mesh
      </div>
      
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Suspense fallback={null}>
          <group>
            {posts.map((post, index) => {
              // Arrange cubes in a grid or spiral
              const row = Math.floor(index / 3);
              const col = index % 3;
              const x = (col - 1) * 4;
              const y = (1 - row) * 4;
              const z = 0;
              
              return (
                <PostCube 
                  key={post.id} 
                  post={post} 
                  position={[x, y, z]} 
                  index={index} 
                />
              );
            })}
          </group>
          
          <Environment preset="city" />
          <ContactShadows position={[0, -10, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
        </Suspense>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={5} 
          maxDistance={25} 
          makeDefault 
        />
      </Canvas>
      
      <div className="absolute bottom-6 left-6 right-6 z-10 flex justify-center pointer-events-none">
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] text-white/70 font-bold uppercase tracking-widest">
          اسحب لتدوير المكعبات • انقر للتفاعل
        </div>
      </div>
    </div>
  );
}
