import { useEffect, useRef } from 'react';

// Vẽ con chim bay kiểu silhouette tối giản — 2 đường cong bezier tạo hình chữ W
// Đây là cách vẽ chim bay xa phổ biến nhất trong art/design
// wingT: 0 = cánh ngang, 1 = cánh lên cao, -1 = cánh xuống thấp
function drawBird(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, wingT: number) {
  const hw = w / 2;   // nửa sải cánh
  const dip = w * 0.18 * wingT; // độ cong giữa thân

  ctx.beginPath();
  // Cánh trái: từ đầu cánh trái → trung tâm thân
  ctx.moveTo(cx - hw, cy + dip);
  ctx.quadraticCurveTo(cx - hw * 0.5, cy - w * 0.14 * wingT, cx, cy);
  // Cánh phải: từ trung tâm → đầu cánh phải
  ctx.quadraticCurveTo(cx + hw * 0.5, cy - w * 0.14 * wingT, cx + hw, cy + dip);
  ctx.stroke();
}

type Bird = {
  x: number; y: number;
  vx: number; vy: number;
  span: number;      // sải cánh px
  alpha: number;
  wingPhase: number;
  wingSpeed: number;
  wobble: number;
  wobbleSpeed: number;
};

function makeBird(w: number, h: number, fromEdge = false): Bird {
  const speed = 0.35 + Math.random() * 0.45;
  const vx = speed * (Math.random() < 0.5 ? 1 : -1);
  return {
    x: fromEdge ? (vx > 0 ? -50 : w + 50) : Math.random() * w,
    y: h * (0.04 + Math.random() * 0.40),
    vx,
    vy: (Math.random() - 0.5) * 0.15,
    span: 22 + Math.random() * 20,  // sải cánh 22–42px
    alpha: 0.55 + Math.random() * 0.35,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.04 + Math.random() * 0.03,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.007 + Math.random() * 0.006,
  };
}

export function RavenFlock({ count = 12 }: { count?: number }) {
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

    const birds: Bird[] = Array.from({ length: count }, () => makeBird(w, h, false));

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', resize);

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, w, h);

      for (const b of birds) {
        b.wingPhase += b.wingSpeed;
        b.wobble    += b.wobbleSpeed;
        b.x += b.vx;
        b.y += Math.sin(b.wobble) * 0.3 + b.vy;

        if (b.x > w + 60) Object.assign(b, makeBird(w, h, true), { vx: -(0.35 + Math.random() * 0.45), x: w + 50 });
        if (b.x < -60)    Object.assign(b, makeBird(w, h, true), { vx:  (0.35 + Math.random() * 0.45), x: -50  });
        b.y = Math.max(h * 0.02, Math.min(h * 0.44, b.y));

        // wingT: -1 → 0 → 1 → 0 → -1 mượt mà theo sin
        const wingT = Math.sin(b.wingPhase);

        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.strokeStyle = '#b09ad4';
        ctx.lineWidth = b.span * 0.055;  // độ dày nét tỉ lệ với sải cánh
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(185,161,240,0.6)';
        ctx.shadowBlur = 6;
        // Lật ngang nếu bay sang trái để đầu chim luôn hướng về phía bay
        if (b.vx < 0) {
          ctx.translate(b.x * 2, 0);
          ctx.scale(-1, 1);
        }
        drawBird(ctx, b.x, b.y, b.span, wingT);
        ctx.restore();
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

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
