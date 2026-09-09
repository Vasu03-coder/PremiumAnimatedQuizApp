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

    // 3D Organic Liquid Glass Blobs Configuration
    interface LiquidBlob {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseRadius: number;
      colorStart: string;
      colorMid: string;
      colorEnd: string;
      rimColor: string;
      wobbleSpeed1: number;
      wobbleSpeed2: number;
      wobbleSpeed3: number;
      harmonics: number[];
      phase: number;
    }

    const blobConfigs = [
      // Blob 1: Cyan / Electric Blue (Top Left)
      {
        xRatio: 0.2,
        yRatio: 0.25,
        baseRadius: Math.min(width, height) * 0.22,
        colorStart: 'rgba(56, 189, 248, 0.65)',
        colorMid: 'rgba(37, 99, 235, 0.45)',
        colorEnd: 'rgba(15, 23, 42, 0.1)',
        rimColor: 'rgba(186, 230, 253, 0.8)',
      },
      // Blob 2: Electric Indigo / Purple (Top Right)
      {
        xRatio: 0.82,
        yRatio: 0.3,
        baseRadius: Math.min(width, height) * 0.24,
        colorStart: 'rgba(129, 140, 248, 0.6)',
        colorMid: 'rgba(99, 102, 241, 0.4)',
        colorEnd: 'rgba(30, 27, 75, 0.1)',
        rimColor: 'rgba(224, 231, 255, 0.75)',
      },
      // Blob 3: Fuchsia / Violet Lava (Bottom Left)
      {
        xRatio: 0.18,
        yRatio: 0.75,
        baseRadius: Math.min(width, height) * 0.25,
        colorStart: 'rgba(217, 70, 239, 0.55)',
        colorMid: 'rgba(147, 51, 234, 0.38)',
        colorEnd: 'rgba(59, 7, 100, 0.08)',
        rimColor: 'rgba(245, 208, 254, 0.7)',
      },
      // Blob 4: Deep Sapphire / Teal (Bottom Right)
      {
        xRatio: 0.85,
        yRatio: 0.78,
        baseRadius: Math.min(width, height) * 0.26,
        colorStart: 'rgba(20, 184, 166, 0.6)',
        colorMid: 'rgba(6, 182, 212, 0.4)',
        colorEnd: 'rgba(15, 23, 42, 0.1)',
        rimColor: 'rgba(204, 251, 241, 0.75)',
      },
      // Blob 5: Center Ambient Glass Fluid (Central background)
      {
        xRatio: 0.5,
        yRatio: 0.5,
        baseRadius: Math.min(width, height) * 0.3,
        colorStart: 'rgba(59, 130, 246, 0.45)',
        colorMid: 'rgba(79, 70, 229, 0.3)',
        colorEnd: 'rgba(15, 23, 42, 0.05)',
        rimColor: 'rgba(191, 219, 254, 0.6)',
      },
      // Blob 6: Floating Accent Bubble (Top Mid)
      {
        xRatio: 0.45,
        yRatio: 0.15,
        baseRadius: Math.min(width, height) * 0.14,
        colorStart: 'rgba(14, 165, 233, 0.6)',
        colorMid: 'rgba(56, 189, 248, 0.35)',
        colorEnd: 'rgba(15, 23, 42, 0.1)',
        rimColor: 'rgba(224, 242, 254, 0.85)',
      },
      // Blob 7: Floating Accent Bubble (Bottom Mid)
      {
        xRatio: 0.55,
        yRatio: 0.88,
        baseRadius: Math.min(width, height) * 0.15,
        colorStart: 'rgba(168, 85, 247, 0.55)',
        colorMid: 'rgba(129, 140, 248, 0.35)',
        colorEnd: 'rgba(15, 23, 42, 0.1)',
        rimColor: 'rgba(233, 213, 255, 0.8)',
      },
    ];

    const blobs: LiquidBlob[] = blobConfigs.map((cfg, i) => ({
      x: width * cfg.xRatio,
      y: height * cfg.yRatio,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      baseRadius: cfg.baseRadius,
      colorStart: cfg.colorStart,
      colorMid: cfg.colorMid,
      colorEnd: cfg.colorEnd,
      rimColor: cfg.rimColor,
      wobbleSpeed1: 0.018 + (i % 3) * 0.007,
      wobbleSpeed2: 0.025 + (i % 2) * 0.006,
      wobbleSpeed3: 0.012 + (i % 4) * 0.005,
      harmonics: [
        Math.floor(Math.random() * 2) + 2,
        Math.floor(Math.random() * 2) + 4,
        Math.floor(Math.random() * 2) + 6,
      ],
      phase: i * 1.5,
    }));

    // Floating Stardust Particles
    const particleCount = 40;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.3,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;

      // Mouse smooth interpolation
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Deep dark futuristic canvas base
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, width, height);

      // Render Each Morphing 3D Liquid Glass Blob
      blobs.forEach((blob) => {
        // Move blob
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Soft bounce within boundaries
        const padding = blob.baseRadius * 0.5;
        if (blob.x < -padding) blob.vx = Math.abs(blob.vx);
        if (blob.x > width + padding) blob.vx = -Math.abs(blob.vx);
        if (blob.y < -padding) blob.vy = Math.abs(blob.vy);
        if (blob.y > height + padding) blob.vy = -Math.abs(blob.vy);

        // Interactive mouse gravity / gentle push
        const dx = mouseX - blob.x;
        const dy = mouseY - blob.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distToMouse < blob.baseRadius * 1.5 && distToMouse > 0) {
          const force = (1 - distToMouse / (blob.baseRadius * 1.5)) * 0.8;
          blob.x -= (dx / distToMouse) * force;
          blob.y -= (dy / distToMouse) * force;
        }

        // Draw Organic Fluid Polygon with Multi-Harmonic Deformation
        ctx.save();
        ctx.beginPath();

        const numPoints = 64;
        const points: { x: number; y: number }[] = [];

        for (let j = 0; j < numPoints; j++) {
          const angle = (j / numPoints) * Math.PI * 2;

          // Organic 3D morphing equation with multiple sine wave harmonics
          const h1 = Math.sin(angle * blob.harmonics[0] + time * blob.wobbleSpeed1 * 40 + blob.phase);
          const h2 = Math.cos(angle * blob.harmonics[1] - time * blob.wobbleSpeed2 * 35 + blob.phase);
          const h3 = Math.sin(angle * blob.harmonics[2] + time * blob.wobbleSpeed3 * 30);

          // Dynamic radius with fluid morphing
          const deform = h1 * 0.18 + h2 * 0.12 + h3 * 0.06;
          const currentRadius = blob.baseRadius * (1 + deform);

          const px = blob.x + Math.cos(angle) * currentRadius;
          const py = blob.y + Math.sin(angle) * currentRadius;
          points.push({ x: px, y: py });
        }

        // Smooth curve through the points
        ctx.moveTo((points[0].x + points[numPoints - 1].x) / 2, (points[0].y + points[numPoints - 1].y) / 2);

        for (let j = 0; j < numPoints; j++) {
          const next = points[(j + 1) % numPoints];
          const midX = (points[j].x + next.x) / 2;
          const midY = (points[j].y + next.y) / 2;
          ctx.quadraticCurveTo(points[j].x, points[j].y, midX, midY);
        }

        ctx.closePath();

        // 3D Glass Radial Illumination Gradient
        const lightAngle = -Math.PI / 4;
        const lightOffset = blob.baseRadius * 0.35;
        const focalX = blob.x + Math.cos(lightAngle) * lightOffset;
        const focalY = blob.y + Math.sin(lightAngle) * lightOffset;

        const blobGrad = ctx.createRadialGradient(
          focalX,
          focalY,
          blob.baseRadius * 0.05,
          blob.x,
          blob.y,
          blob.baseRadius * 1.35
        );
        blobGrad.addColorStop(0, blob.colorStart);
        blobGrad.addColorStop(0.45, blob.colorMid);
        blobGrad.addColorStop(0.85, blob.colorEnd);
        blobGrad.addColorStop(1, 'rgba(6, 9, 19, 0)');

        ctx.fillStyle = blobGrad;
        ctx.fill();

        // Luminous Glass Rim Light (Fresnel border effect)
        ctx.strokeStyle = blob.rimColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Internal 3D Glass Specular Crescent Reflection (Top-Left)
        ctx.save();
        ctx.beginPath();
        const specRadius = blob.baseRadius * 0.65;
        const specX = blob.x - blob.baseRadius * 0.28;
        const specY = blob.y - blob.baseRadius * 0.28;
        ctx.arc(specX, specY, specRadius * 0.45, 0, Math.PI * 2);
        const specGrad = ctx.createRadialGradient(specX, specY, 2, specX, specY, specRadius * 0.45);
        specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        specGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
        specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = specGrad;
        ctx.fill();
        ctx.restore();

        ctx.restore();
      });

      // Floating Ambient Cyber Stardust
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += p.pulseSpeed;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.fillStyle = `rgba(186, 230, 253, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ambient Corner Vignette
      const vig = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.4,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.85
      );
      vig.addColorStop(0, 'rgba(6, 9, 19, 0)');
      vig.addColorStop(1, 'rgba(6, 9, 19, 0.7)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);

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
      {/* High-Performance 60FPS Full-Screen 3D Liquid Lava & Glass Blobs */}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
