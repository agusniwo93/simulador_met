"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  // Tema de color del fondo
  variant?: "deep" | "light";
  className?: string;
}

// Fondo 3D animado con three.js (vanilla, sin react-three-fiber para máxima compatibilidad).
export default function Background3D({ variant = "deep", className = "" }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const palette =
      variant === "deep"
        ? { a: 0x38bdf8, b: 0x6366f1, c: 0x22d3ee, points: 0x60a5fa }
        : { a: 0x3b82f6, b: 0x6366f1, c: 0x0ea5e9, points: 0x94a3b8 };

    // --- Partículas ---
    const particleCount = 1200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) positions[i] = (Math.random() - 0.5) * 60;
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: palette.points,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Geometrías flotantes (wireframe) ---
    const shapes: THREE.Mesh[] = [];
    const geoms = [
      new THREE.IcosahedronGeometry(3, 0),
      new THREE.OctahedronGeometry(2.4, 0),
      new THREE.TorusGeometry(2.2, 0.5, 12, 40),
      new THREE.DodecahedronGeometry(2.2, 0),
    ];
    const colors = [palette.a, palette.b, palette.c, palette.a];
    geoms.forEach((g, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.set((i - 1.5) * 8, (i % 2 === 0 ? 1 : -1) * 4, -4 - i * 2);
      scene.add(mesh);
      shapes.push(mesh);
    });

    // --- Interacción con el mouse (parallax) ---
    const mouse = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      particles.rotation.y = t * 0.03;
      particles.rotation.x = t * 0.01;
      shapes.forEach((s, i) => {
        s.rotation.x = t * (0.1 + i * 0.03);
        s.rotation.y = t * (0.15 + i * 0.02);
        s.position.y += Math.sin(t + i) * 0.004;
      });
      // Parallax suave
      camera.position.x += (mouse.x * 2 - camera.position.x) * 0.03;
      camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      if (!prefersReduced) raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      geoms.forEach((g) => g.dispose());
      shapes.forEach((s) => (s.material as THREE.Material).dispose());
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [variant]);

  return <div ref={mountRef} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}
