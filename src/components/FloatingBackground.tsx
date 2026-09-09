import React, { useEffect, useRef } from 'react';

export default function FloatingBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Floating digital dust particles
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: Math.random() * 0.4 + 0.2,
      speedX: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.018;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Clear with dark deep space fade
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, width, height);

      const horizonY = height * 0.52;
      const mouseTiltX = (mouseX / width - 0.5) * 80;
      const mouseTiltY = (mouseY / height - 0.5) * 30;

      // 1. Horizon Atmosphere & Radiant Neon Glow
      const horizonGlow = ctx.createRadialGradient(
        width / 2 + mouseTiltX * 0.5,
        horizonY + mouseTiltY * 0.3,
        20,
        width / 2,
        horizonY,
        width * 0.75
      );
      horizonGlow.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      horizonGlow.addColorStop(0.35, 'rgba(79, 70, 229, 0.12)');
      horizonGlow.addColorStop(0.7, 'rgba(15, 23, 42, 0.05)');
      horizonGlow.addColorStop(1, 'rgba(8, 13, 26, 0)');

      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Horizon Line Glow Beam
      ctx.save();
      const horizonBeam = ctx.createLinearGradient(0, 0, width, 0);
      horizonBeam.addColorStop(0, 'rgba(56, 189, 248, 0)');
      horizonBeam.addColorStop(0.25, 'rgba(56, 189, 248, 0.25)');
      horizonBeam.addColorStop(0.5, 'rgba(147, 197, 253, 0.75)');
      horizonBeam.addColorStop(0.75, 'rgba(99, 102, 241, 0.25)');
      horizonBeam.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.strokeStyle = horizonBeam;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();
      ctx.restore();

      // 3. 3D Perspective Grid with Undulating Horizon Waves
      const cols = 28;
      const rows = 26;
      const gridFov = 340;
      const speed = time * 45;

      // Pre-calculate 3D vertex points with undulating cyber wave ripples
      const gridPoints: { x: number; y: number; depth: number }[][] = [];

      for (let r = 0; r <= rows; r++) {
        gridPoints[r] = [];
        // Z increases towards the viewer (from horizon to bottom)
        const rawZ = (r * 32 + (speed % 32));
        const z = Math.max(15, rawZ);

        for (let c = 0; c <= cols; c++) {
          // X centered around vanishing point
          const worldX = (c - cols / 2) * 58 + mouseTiltX * (z / 300);

          // Wave equation: dynamic undulating ripples
          const wave1 = Math.sin(c * 0.35 + time * 2) * 14;
          const wave2 = Math.cos(r * 0.3 + time * 1.5) * 10;
          const wave3 = Math.sin((c + r) * 0.2 + time) * 8;
          const worldY = wave1 + wave2 + wave3;

          // 3D Perspective Projection
          const scale = gridFov / (gridFov + (rows * 32 - z));
          const screenX = width / 2 + worldX * scale;
          const screenY = horizonY + (z + worldY) * scale * 0.95;

          gridPoints[r][c] = { x: screenX, y: screenY, depth: z / (rows * 32) };
        }
      }

      // Draw Horizontal Grid Waves
      for (let r = 0; r <= rows; r++) {
        const depth = (r * 32 + (speed % 32)) / (rows * 32);
        const alpha = Math.min(0.65, Math.pow(depth, 1.4) * 0.7);

        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const pt = gridPoints[r][c];
          if (c === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = Math.max(0.75, depth * 1.8);
        ctx.stroke();
      }

      // Draw Longitudinal Grid Lines (converging to vanishing point)
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const pt = gridPoints[r][c];
          if (r === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        const centerDist = Math.abs(c - cols / 2) / (cols / 2);
        const lineAlpha = (1 - centerDist * 0.4) * 0.38;
        ctx.strokeStyle = `rgba(99, 102, 241, ${lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 4. Subtle Intersecting Grid Nodes (Glowing Cyber Sparks)
      for (let r = 4; r <= rows; r += 3) {
        for (let c = 2; c <= cols; c += 4) {
          const pt = gridPoints[r][c];
          if (pt.y > horizonY + 5 && pt.y < height) {
            const nodeAlpha = Math.min(0.8, pt.depth * 0.9);
            ctx.fillStyle = `rgba(186, 230, 253, ${nodeAlpha})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(1, pt.depth * 2.5), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 5. Floating Digital Dust Particles (Upper atmosphere)
      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.phase += p.pulseSpeed;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
        ctx.fillStyle = `rgba(147, 197, 253, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Top & Bottom Cinematic Gradient Vignettes
      const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.35);
      topVignette.addColorStop(0, 'rgba(8, 13, 26, 0.85)');
      topVignette.addColorStop(1, 'rgba(8, 13, 26, 0)');
      ctx.fillStyle = topVignette;
      ctx.fillRect(0, 0, width, height * 0.35);

      const bottomVignette = ctx.createLinearGradient(0, height * 0.78, 0, height);
      bottomVignette.addColorStop(0, 'rgba(8, 13, 26, 0)');
      bottomVignette.addColorStop(1, 'rgba(8, 13, 26, 0.85)');
      ctx.fillStyle = bottomVignette;
      ctx.fillRect(0, height * 0.78, width, height * 0.22);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* High-Performance 60FPS 3D Horizon Waves Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Subtle Aurora Fog Overlays for Glassmorphic Depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
