import { useEffect, useRef } from 'react';

// Dùng SVG path chất lượng cao — silhouette chim đang bay nhìn từ phía trên/nghiêng
// Path này là dáng chim bay cổ điển: 2 cánh cong lên, thân thon, đuôi nhọn
// Scale gốc: ~100x40px, center tại (50,20)
const BIRD_PATHS = [
  // Chim bay cánh xòe — dùng cho wingAngle ~ 0 (cánh ngang)
  'M50,20 C40,10 20,5 5,12 C15,14 25,16 30,18 C20,16 10,18 2,24 C12,22 22,20 30,20 C35,22 40,24 50,28 C60,24 65,22 70,20 C78,20 88,22 98,24 C90,18 80,16 70,18 C75,16 85,14 95,12 C80,5 60,10 50,20Z',
  // Chim bay cánh đập lên
  'M50,22 C40,8 18,2 4,8 C14,11 24,15 30,18 C20,14 10,14 2,18 C12,18 22,18 30,20 C35,21 42,22 50,26 C58,22 65,21 70,20 C78,18 88,18 98,18 C90,14 80,14 70,18 C76,15 86,11 96,8 C82,2 60,8 50,22Z',
  // Chim bay cánh đập xuống
  'M50,18 C42,26 22,30 6,26 C16,22 26,20 32,20 C22,22 12,26 4,30 C14,26 24,24 32,22 C37,22 43,22 50,24 C57,22 63,22 68,22 C76,24 86,26 96,30 C88,26 78,22 68,20 C74,20 84,22 94,26 C78,30 58,26 50,18Z',
];

type Raven = {
  x: number; y: number;
  vx: number; vy: number;
  scale: number;
  alpha: number;
  wingPhase: number;
  wingSpeed: number;
  wobble: number;
  wobbleSpeed: number;
};

function makeRaven(w: number, h: number, fromEdge = false): Raven {
  const speed = 0.4 + Math.random() * 0.5;
  const vx = speed * (Math.random() < 0.5 ? 1 : -1);
  return {
    x: fromEdge ? (vx > 0 ? -60 : w + 60) : Math.random() * w,
    y: h * (0.04 + Math.random() * 0.38),
    vx,
    vy: (Math.random() - 0.5) * 0.15,
    scale: 0.28 + Math.random() * 0.22, // path gốc ~100px → scale 0.28-0.5 = 28-50px
    alpha: 0.55 + Math.random() * 0.35,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.055 + Math.random() * 0.04,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.008 + Math.random() * 0.007,
  };
}

export function RavenFlock({ count = 5 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-parse paths
    const paths = BIRD_PATHS.map((d) => new Path2D(d));

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const ravens: Raven[] = Array.from({ length: count }, () => makeRaven(w, h, false));

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', resize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (const r of ravens) {
        r.wingPhase += r.wingSpeed;
        r.wobble += r.wobbleSpeed;
        r.x += r.vx;
        r.y += Math.sin(r.wobble) * 0.35 + r.vy;

        if (r.x > w + 70)  Object.assign(r, makeRaven(w, h, true), { vx: -(0.4 + Math.random() * 0.5), x: w + 60 });
        if (r.x < -70)     Object.assign(r, makeRaven(w, h, true), { vx:  (0.4 + Math.random() * 0.5), x: -60 });
        r.y = Math.max(h * 0.02, Math.min(h * 0.44, r.y));

        // Chọn frame cánh theo wingPhase — 3 frames tạo illusion vỗ cánh
        const frame = Math.floor(((Math.sin(r.wingPhase) + 1) / 2) * 2.99); // 0, 1, 2
        const path = paths[frame]!;

        ctx.save();
        ctx.translate(r.x, r.y);

        // Lật ngang nếu bay sang trái, pivot tại center path (50, 20)
        if (r.vx < 0) {
          ctx.translate(100 * r.scale, 0);
          ctx.scale(-r.scale, r.scale);
        } else {
          ctx.scale(r.scale, r.scale);
        }
        ctx.translate(-50, -20); // căn center path về origin

        ctx.globalAlpha = r.alpha;
        ctx.fillStyle = '#8b6ab0';
        ctx.shadowColor = 'rgba(185,161,240,0.7)';
        ctx.shadowBlur = 8;
        ctx.fill(path);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
}
