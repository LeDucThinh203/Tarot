import { useEffect, useRef } from 'react';

// Bướm đêm silhouette — 2 cánh trên + 2 cánh dưới
function drawMoth(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, flapAngle: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  const flap = Math.cos(flapAngle); // -1..1

  // Cánh trên trái
  ctx.save();
  ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.transform(1, flap * 0.3, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(6, -10, 18, -12, 20, -4);
  ctx.bezierCurveTo(18, 0, 10, 2, 0, 0);
  ctx.fillStyle = 'rgba(155,130,200,0.55)';
  ctx.shadowColor = 'rgba(185,161,240,0.5)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();

  // Cánh trên phải
  ctx.save();
  ctx.scale(scale, scale);
  ctx.transform(1, flap * 0.3, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(6, -10, 18, -12, 20, -4);
  ctx.bezierCurveTo(18, 0, 10, 2, 0, 0);
  ctx.fillStyle = 'rgba(155,130,200,0.55)';
  ctx.shadowColor = 'rgba(185,161,240,0.5)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();

  // Cánh dưới trái
  ctx.save();
  ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.transform(1, flap * 0.2, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.bezierCurveTo(5, 4, 14, 8, 14, 3);
  ctx.bezierCurveTo(12, 1, 6, 1, 0, 1);
  ctx.fillStyle = 'rgba(130,105,180,0.4)';
  ctx.fill();
  ctx.restore();

  // Cánh dưới phải
  ctx.save();
  ctx.scale(scale, scale);
  ctx.transform(1, flap * 0.2, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.bezierCurveTo(5, 4, 14, 8, 14, 3);
  ctx.bezierCurveTo(12, 1, 6, 1, 0, 1);
  ctx.fillStyle = 'rgba(130,105,180,0.4)';
  ctx.fill();
  ctx.restore();

  // Thân
  ctx.save();
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 1, 1.5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,180,240,0.7)';
  ctx.fill();
  ctx.restore();

  // Râu
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = 'rgba(200,180,240,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-5, -10, -8, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(5, -10, 8, -8); ctx.stroke();
  ctx.restore();

  ctx.restore();
}

type Moth = {
  x: number; y: number;
  vx: number; vy: number;
  flapPhase: number;
  flapSpeed: number;
  scale: number;
  alpha: number;
  angle: number;       // hướng bay
  turnTimer: number;   // đếm ngược đổi hướng
  turnInterval: number;
  originX: number;     // điểm neo — bướm không bay quá xa
  originY: number;
};

function makeMoth(w: number, h: number): Moth {
  const ox = w * (0.1 + Math.random() * 0.8);
  const oy = h * (0.1 + Math.random() * 0.6);
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.3 + Math.random() * 0.4;
  return {
    x: ox, y: oy, originX: ox, originY: oy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    flapPhase: Math.random() * Math.PI * 2,
    flapSpeed: 0.12 + Math.random() * 0.08,
    scale: 0.7 + Math.random() * 0.8,
    alpha: 0.35 + Math.random() * 0.3,
    angle,
    turnTimer: 60 + Math.random() * 120,
    turnInterval: 60 + Math.random() * 120,
  };
}

export function MothFlutter({ count = 5 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement!;
    let w = parent.offsetWidth;
    let h = parent.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const moths: Moth[] = Array.from({ length: count }, () => makeMoth(w, h));

    const resize = () => {
      w = parent.offsetWidth;
      h = parent.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, w, h);

      for (const m of moths) {
        m.flapPhase += m.flapSpeed;
        m.turnTimer--;

        // Kéo về điểm neo nếu bay quá xa (radius 160px)
        const dx = m.x - m.originX;
        const dy = m.y - m.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 160) {
          // Đổi hướng về gốc
          m.angle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 1.2;
          const speed = 0.3 + Math.random() * 0.4;
          m.vx = Math.cos(m.angle) * speed;
          m.vy = Math.sin(m.angle) * speed;
          m.turnTimer = m.turnInterval;
        } else if (m.turnTimer <= 0) {
          // Đổi hướng ngẫu nhiên
          m.angle += (Math.random() - 0.5) * 2.5;
          const speed = 0.3 + Math.random() * 0.4;
          m.vx = Math.cos(m.angle) * speed;
          m.vy = Math.sin(m.angle) * speed;
          m.turnTimer = m.turnInterval;
        }

        m.x += m.vx;
        m.y += m.vy;
        m.x = Math.max(10, Math.min(w - 10, m.x));
        m.y = Math.max(10, Math.min(h - 10, m.y));

        drawMoth(ctx, m.x, m.y, m.scale, m.flapPhase, m.alpha);
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 2,
      }}
      aria-hidden="true"
    />
  );
}
