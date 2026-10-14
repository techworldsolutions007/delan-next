'use client';
import React, { useRef } from "react";
import { useGLTF, Center } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export function Model({ modelRotation, ...props }) {
  const groupRef = useRef();
  const modelPath = "/models/base_basic_shaded.glb";
  const { scene } = useGLTF(modelPath);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = modelRotation.get();
    }
  });

  return (
    <group ref={groupRef} {...props} position={[0, 0.4, 0]}>
      <Center>
        <primitive object={scene} scale={1.5} />
      </Center>
    </group>
  );
}

useGLTF.preload("/models/base_basic_shaded.glb");
