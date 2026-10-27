import { useEffect, useRef, useCallback } from 'react';

// Mỗi particle: vị trí, kích thước, màu, thời gian sống
type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
  life: number;       // 0..1, giảm dần
  decay: number;
  symbol: string;
};

const SYMBOLS = ['✦', '✧', '·', '⋆', '✦', '·', '✧'];
const COLORS = [
  'rgba(217,188,131,',   // gold
  'rgba(185,161,240,',   // lilac
  'rgba(241,219,157,',   // gold-2
  'rgba(200,180,255,',   // soft purple
  'rgba(255,255,255,',   // white
];

let uid = 0;

export function MysticCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);
  const lastEmit = useRef(0);

  const emit = useCallback((x: number, y: number) => {
    const now = performance.now();
    // Giới hạn tần suất emit để không quá dày
    if (now - lastEmit.current < 30) return;
    lastEmit.current = now;

    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.7;
      particles.current.push({
        id: uid++,
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        size: 8 + Math.random() * 12,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        alpha: 0.7 + Math.random() * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6, // drift lên trên
        life: 1,
        decay: 0.018 + Math.random() * 0.014,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!,
      });
    }
    // Giới hạn số particles tối đa
    if (particles.current.length > 80) particles.current.splice(0, 20);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas theo window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      emit(e.clientX, e.clientY);
    };
    window.addEventListener('mousemove', onMove);

    // Animation loop
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter(p => p.life > 0);

      for (const p of particles.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha * p.life;
        ctx.font = `${p.size * p.life + 4}px serif`;
        ctx.fillStyle = `${p.color}${(p.alpha * p.life).toFixed(2)})`;
        ctx.shadowColor = p.color + '0.8)';
        ctx.shadowBlur = 8 * p.life;
        ctx.fillText(p.symbol, p.x, p.y);
        ctx.restore();

        // Cập nhật vị trí và vòng đời
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.01; // tăng tốc đi lên nhẹ
        p.life -= p.decay;
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [emit]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',  // không chặn click
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
