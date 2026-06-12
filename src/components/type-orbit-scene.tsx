"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type TypeOrbitSceneProps = {
  glyphs: string;
  isActive?: boolean;
};

const fallbackGlyphs = "Aa字形WOFF2字体123";

export function TypeOrbitScene({ glyphs, isActive = false }: TypeOrbitSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = getSceneGlyphs(glyphs);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const resources: Array<{
      material: THREE.SpriteMaterial;
      texture: THREE.CanvasTexture;
    }> = [];

    chars.forEach((char, index) => {
      const sprite = createGlyphSprite(char, index);
      const point = getSpherePoint(index, chars.length);
      const radius = 2.15 + (index % 5) * 0.11;

      sprite.mesh.position.set(point.x * radius, point.y * radius, point.z * radius);
      sprite.mesh.scale.setScalar(0.5 + (index % 4) * 0.08);
      group.add(sprite.mesh);
      resources.push({
        material: sprite.material,
        texture: sprite.texture,
      });
    });

    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.TorusGeometry(2.8, 0.004, 8, 96)),
      new THREE.LineBasicMaterial({
        color: 0xd8c7a3,
        transparent: true,
        opacity: 0.34,
      }),
    );
    ring.rotation.x = Math.PI / 2.8;
    group.add(ring);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frameId = 0;
    const startedAt = window.performance.now();

    const render = () => {
      const elapsed = (window.performance.now() - startedAt) / 1000;
      const speed = reduceMotion ? 0 : isActive ? 0.22 : 0.1;

      group.rotation.y = elapsed * speed;
      group.rotation.x = Math.sin(elapsed * 0.18) * 0.08;
      ring.rotation.z = elapsed * (reduceMotion ? 0 : 0.08);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      mount.removeChild(renderer.domElement);
      ring.geometry.dispose();
      (ring.material as THREE.LineBasicMaterial).dispose();
      resources.forEach(({ material, texture }) => {
        material.dispose();
        texture.dispose();
      });
      renderer.dispose();
    };
  }, [glyphs, isActive]);

  return <div ref={mountRef} aria-hidden="true" className="type-orbit-scene" />;
}

function getSceneGlyphs(glyphs: string) {
  const unique = Array.from(new Set(Array.from(glyphs.replace(/\s+/g, ""))));
  const source = unique.length >= 8 ? unique : Array.from(fallbackGlyphs);

  return source.slice(0, 34);
}

function getSpherePoint(index: number, total: number) {
  const offset = 2 / total;
  const increment = Math.PI * (3 - Math.sqrt(5));
  const y = index * offset - 1 + offset / 2;
  const radius = Math.sqrt(1 - y * y);
  const phi = index * increment;

  return {
    x: Math.cos(phi) * radius,
    y,
    z: Math.sin(phi) * radius,
  };
}

function createGlyphSprite(char: string, index: number) {
  const canvas = document.createElement("canvas");
  const size = 160;
  const textureSize = size * 2;
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.scale(2, 2);
  context.clearRect(0, 0, size, size);
  context.fillStyle = index % 3 === 0 ? "#1f2933" : index % 3 === 1 ? "#9f4d35" : "#0f766e";
  context.font = `700 ${char.codePointAt(0)! > 0xff ? 82 : 92}px Georgia, "Times New Roman", serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(char, size / 2, size / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const mesh = new THREE.Sprite(material);

  return {
    material,
    mesh,
    texture,
  };
}
