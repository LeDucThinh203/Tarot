import { useEffect, useRef } from 'react';

// Render con quạ bằng emoji Unicode — đảm bảo đúng hình dáng trên mọi thiết bị
// Dùng filter CSS để tint tím/xanh huyền bí thay cho màu gốc của emoji
const RAVEN_EMOJI = '🐦‍⬛'; // Black Bird — con chim đen, hỗ trợ trên Chrome/Firefox/Safari

type Raven = {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  wingPhase: number;
  wingSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  scaleY: number; // cánh vỗ lên xuống bằng cách thay đổi scaleY
};

function makeRaven(w: number, h: number, fromEdge = false): Raven {
  const speed = 0.5 + Math.random() * 0.6;
  const vx = speed * (Math.random() < 0.5 ? 1 : -1);
  return {
    x: fromEdge ? (vx > 0 ? -60 : w + 60) : Math.random() * w,
    y: h * (0.05 + Math.random() * 0.38),
    vx,
    vy: (Math.random() - 0.5) * 0.2,
    size: 28 + Math.random() * 20,     // 28–48px
    alpha: 0.70 + Math.random() * 0.25,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.06 + Math.random() * 0.04,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.009 + Math.random() * 0.007,
    scaleY: 1,
  };
}

export function RavenFlock({ count = 6 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
        r.wobble   += r.wobbleSpeed;
        r.x += r.vx;
        r.y += Math.sin(r.wobble) * 0.4 + r.vy;
        // Vỗ cánh: scaleY dao động 0.55 ↔ 1.0 tạo hiệu ứng cánh vỗ
        r.scaleY = 0.55 + (Math.sin(r.wingPhase) + 1) * 0.225;

        if (r.x > w + 70) Object.assign(r, makeRaven(w, h, true), { vx: -(0.5 + Math.random() * 0.6), x: w + 60 });
        if (r.x < -70)    Object.assign(r, makeRaven(w, h, true), { vx:  (0.5 + Math.random() * 0.6), x: -60  });
        r.y = Math.max(h * 0.02, Math.min(h * 0.44, r.y));

        ctx.save();
        ctx.translate(r.x, r.y);

        // Lật ngang nếu bay sang trái
        if (r.vx < 0) ctx.scale(-1, 1);

        // Scale Y để mô phỏng vỗ cánh
        ctx.scale(1, r.scaleY);

        ctx.globalAlpha = r.alpha;
        ctx.font = `${r.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow tím huyền bí
        ctx.shadowColor = 'rgba(155,127,200,0.8)';
        ctx.shadowBlur = 12;

        ctx.fillText(RAVEN_EMOJI, 0, 0);
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
