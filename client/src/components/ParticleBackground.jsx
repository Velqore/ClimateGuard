import { useEffect, useRef } from 'react';

export default function ParticleBackground({ riskScore = 0 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const riskRef = useRef(riskScore);

  useEffect(() => { riskRef.current = riskScore; }, [riskScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 60;
    particlesRef.current = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      hue: 200 + Math.floor(i * 2.5),
    }));

    const draw = () => {
      const risk = riskRef.current;
      const t = risk / 100;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const speedMult = 1 + t * 3;
      const particles = particlesRef.current;

      for (const p of particles) {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const hue = p.hue - t * 160;
        const sat = 60 + t * 40;
        const alpha = p.opacity * (0.3 + t * 0.7);
        const size = p.size * (1 + t * 1.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, 65%, ${alpha})`;
        ctx.fill();

        if (risk > 60) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${sat}%, 65%, ${alpha * 0.15})`;
          ctx.fill();
        }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 80 + t * 60;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12 * (1 + t);
            const hue = 200 - t * 160;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  );
}
