"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/** A quiet, locally served glyph atmosphere with pointer parallax. */
export function TypeOrbitScene({ isActive = false }: { isActive?: boolean }) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const stage = layer?.parentElement;
    if (!layer || !stage) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (motionPreference.matches || event.pointerType === "touch") return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bounds = stage.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 14;
        const y = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 10;
        layer.style.translate = `${x}px ${y}px`;
      });
    };
    const reset = () => {
      window.cancelAnimationFrame(frame);
      layer.style.translate = "0px 0px";
    };
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerleave", reset);
    motionPreference.addEventListener("change", reset);
    return () => {
      window.cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", reset);
      motionPreference.removeEventListener("change", reset);
    };
  }, []);

  return (
    <div ref={layerRef} aria-hidden="true" className="type-orbit-scene" data-active={isActive}>
      <div className="glyph-drift">
        <Image
          src="/images/glyph-atmosphere.png"
          alt=""
          fill
          sizes="(max-width: 800px) 100vw, 60vw"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}
