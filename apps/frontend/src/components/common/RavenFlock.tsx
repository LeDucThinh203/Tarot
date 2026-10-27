import { useEffect, useRef } from 'react';

// SVG path silhouette con quạ đang bay (wings spread)
const RAVEN_PATH = 'M0,0 C-6,-4 -14,-6 -18,-3 C-14,-2 -10,0 -8,2 C-12,1 -16,2 -18,5 C-13,4 -8,3 -5,4 C-3,5 0,8 0,8 C0,8 3,5 5,4 C8,3 13,4 18,5 C16,2 12,1 8,2 C10,0 14,-2 18,-3 C14,-6 6,-4 0,0Z';

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
  const scale = 1.2 + Math.random() * 1.2; // 1.2x → 2.4x, đủ lớn để thấy rõ
  const vx = (0.4 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1);
  return {
    x: fromEdge ? (vx > 0 ? -30 : w + 30) : Math.random() * w,
    y: h * (0.05 + Math.random() * 0.45), // chỉ nửa trên trang
    vx,
    vy: (Math.random() - 0.5) * 0.15,
    scale,
    alpha: 0.55 + Math.random() * 0.35,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.04 + Math.random() * 0.04,
    wobble: 0,
    wobbleSpeed: 0.008 + Math.random() * 0.008,
  };
}

export function RavenFlock() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight; // dùng innerHeight thay scrollHeight — canvas fixed nên chỉ cần viewport
    canvas.width = w;
    canvas.height = h;

    const ravens: Raven[] = Array.from({ length: 6 }, () => makeRaven(w, h, false));

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
        // Wing flap: scale Y theo sin
        r.wingPhase += r.wingSpeed;
        const wingFlap = Math.sin(r.wingPhase);
        const scaleY = 0.5 + Math.abs(wingFlap) * 0.8; // cánh vỗ lên xuống

        // Wobble dọc nhẹ
        r.wobble += r.wobbleSpeed;
        r.y += Math.sin(r.wobble) * 0.3 + r.vy;
        r.x += r.vx;

        // Nếu ra ngoài màn hình → tái sinh từ cạnh đối diện
        if (r.x > w + 40) { Object.assign(r, makeRaven(w, h, true)); r.vx = Math.abs(r.vx) * -1; r.x = w + 30; }
        if (r.x < -40) { Object.assign(r, makeRaven(w, h, true)); r.vx = Math.abs(r.vx); r.x = -30; }
        if (r.y < 0) r.y = h * 0.05;
        if (r.y > h * 0.5) r.y = h * 0.48;

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.scale(r.vx > 0 ? r.scale : -r.scale, r.scale * scaleY);
        ctx.globalAlpha = r.alpha;
        // Màu tím đậm đủ thấy trên nền đen, có lilac glow
        ctx.fillStyle = '#6b5a8e';
        ctx.shadowColor = 'rgba(185,161,240,0.6)';
        ctx.shadowBlur = 12;
        const p = new Path2D(RAVEN_PATH);
        ctx.fill(p);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

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
