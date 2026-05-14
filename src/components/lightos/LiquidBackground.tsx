import { useEffect, useRef } from "react";

/**
 * Liquid-crystal animated background.
 * Renders animated metaball-style blobs to a canvas with a subtle
 * chromatic shimmer reminiscent of liquid crystal.
 */
export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const blobs = Array.from({ length: 6 }).map((_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.22 + Math.random() * 0.18,
      sx: (Math.random() - 0.5) * 0.00012,
      sy: (Math.random() - 0.5) * 0.00012,
      hue: 150 + i * 12,
      phase: Math.random() * Math.PI * 2,
    }));

    const start = performance.now();

    const render = (t: number) => {
      const dt = t - start;

      // Base wash
      const grd = ctx.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, "hsl(220 25% 5%)");
      grd.addColorStop(1, "hsl(200 30% 7%)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        b.x += b.sx * 16;
        b.y += b.sy * 16;
        if (b.x < -0.2 || b.x > 1.2) b.sx *= -1;
        if (b.y < -0.2 || b.y > 1.2) b.sy *= -1;

        const cx = b.x * w + Math.sin(dt * 0.0006 + b.phase) * 40;
        const cy = b.y * h + Math.cos(dt * 0.0005 + b.phase) * 40;
        const rad = b.r * Math.min(w, h) * (1 + Math.sin(dt * 0.0008 + b.phase) * 0.08);

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `hsla(${b.hue} 90% 55% / 0.55)`);
        g.addColorStop(0.45, `hsla(${b.hue + 20} 80% 50% / 0.18)`);
        g.addColorStop(1, "hsla(160 80% 50% / 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // Shimmer scanlines
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "hsl(160 90% 60%)";
      const offset = (dt * 0.04) % 6;
      for (let y = -6 + offset; y < h; y += 6) {
        ctx.fillRect(0, y, w, 1);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: "blur(40px) saturate(140%)" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.15), transparent 55%), radial-gradient(circle at 75% 80%, hsl(180 80% 50% / 0.12), transparent 55%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
        aria-hidden
      />
    </>
  );
}
