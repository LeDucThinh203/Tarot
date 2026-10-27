import { useEffect, useRef } from 'react';

// Vẽ con quạ bằng canvas primitives — đầu tròn, mỏ nhọn, thân, đuôi chẻ, 2 cánh vỗ
function drawRaven(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  wingAngle: number, // 0 = cánh ngang, positive = cánh lên
  facingRight: boolean,
  alpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;

  const s = scale;
  const wA = Math.sin(wingAngle); // -1..1, biên độ vỗ cánh

  // --- Shadow/glow ---
  ctx.shadowColor = 'rgba(185,161,240,0.55)';
  ctx.shadowBlur = 10 * s;

  // Màu tím đậm đủ tương phản trên nền #080811
  ctx.fillStyle = '#7c5fa0';

  // --- Cánh trái (phía sau thân) ---
  ctx.beginPath();
  ctx.moveTo(0, 0);
  // Cánh vỗ: đầu cánh di chuyển lên/xuống theo wA
  ctx.bezierCurveTo(
    -5 * s, (-8 + wA * 9) * s,
    -18 * s, (-14 + wA * 12) * s,
    -24 * s, (-10 + wA * 10) * s,
  );
  ctx.bezierCurveTo(
    -20 * s, (-4 + wA * 5) * s,
    -10 * s, (-1 + wA * 3) * s,
    0, 2 * s,
  );
  ctx.closePath();
  ctx.fill();

  // --- Cánh phải (phía trước) ---
  ctx.beginPath();
  ctx.moveTo(2 * s, 0);
  ctx.bezierCurveTo(
    6 * s, (-7 + wA * 8) * s,
    16 * s, (-13 + wA * 11) * s,
    22 * s, (-9 + wA * 9) * s,
  );
  ctx.bezierCurveTo(
    18 * s, (-3 + wA * 4) * s,
    9 * s, (0 + wA * 2) * s,
    2 * s, 2 * s,
  );
  ctx.closePath();
  ctx.fill();

  // --- Thân ---
  ctx.beginPath();
  ctx.ellipse(0, 3 * s, 3.5 * s, 6 * s, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // --- Đầu ---
  ctx.beginPath();
  ctx.arc(2 * s, -4 * s, 3.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // --- Mỏ nhọn ---
  ctx.beginPath();
  ctx.moveTo(4.5 * s, -5.5 * s);
  ctx.lineTo(11 * s, -4 * s);
  ctx.lineTo(5 * s, -3 * s);
  ctx.closePath();
  ctx.fill();

  // --- Đuôi chẻ đôi ---
  ctx.beginPath();
  ctx.moveTo(-2 * s, 8 * s);
  ctx.lineTo(-5 * s, 15 * s);
  ctx.lineTo(-1 * s, 12 * s);
  ctx.lineTo(1 * s, 15 * s);
  ctx.lineTo(3 * s, 8 * s);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

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
  const scale = 0.9 + Math.random() * 0.7;
  const speed = 0.5 + Math.random() * 0.6;
  const vx = speed * (Math.random() < 0.5 ? 1 : -1);
  return {
    x: fromEdge ? (vx > 0 ? -40 : w + 40) : Math.random() * w,
    y: h * (0.04 + Math.random() * 0.38),
    vx,
    vy: (Math.random() - 0.5) * 0.2,
    scale,
    alpha: 0.6 + Math.random() * 0.35,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.06 + Math.random() * 0.05,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.01 + Math.random() * 0.008,
  };
}

export function RavenFlock({ count = 5 }: { count?: number }) {
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
        r.wobble += r.wobbleSpeed;

        r.x += r.vx;
        r.y += Math.sin(r.wobble) * 0.4 + r.vy;

        // Tái sinh từ cạnh đối diện
        if (r.x > w + 50) Object.assign(r, { ...makeRaven(w, h, true), vx: Math.abs(makeRaven(w, h).vx) * -1, x: w + 40 });
        if (r.x < -50)    Object.assign(r, { ...makeRaven(w, h, true), vx: Math.abs(makeRaven(w, h).vx),      x: -40  });
        r.y = Math.max(h * 0.02, Math.min(h * 0.45, r.y));

        drawRaven(
          ctx,
          r.x, r.y,
          r.scale,
          r.wingPhase,
          r.vx > 0,
          r.alpha,
        );
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
