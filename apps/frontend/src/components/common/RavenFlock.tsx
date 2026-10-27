import { useEffect, useRef } from 'react';

// 3 frames SVG: cánh ngang, cánh lên, cánh xuống
const FRAME_SRCS = ['/raven.svg', '/raven-up.svg', '/raven-down.svg'];

type Raven = {
  x: number; y: number;
  vx: number; vy: number;
  size: number;        // width in px khi render
  alpha: number;
  wingPhase: number;
  wingSpeed: number;
  wobble: number;
  wobbleSpeed: number;
};

function makeRaven(w: number, h: number, fromEdge = false): Raven {
  const speed = 0.45 + Math.random() * 0.55;
  const vx = speed * (Math.random() < 0.5 ? 1 : -1);
  return {
    x: fromEdge ? (vx > 0 ? -80 : w + 80) : Math.random() * w,
    y: h * (0.04 + Math.random() * 0.40),
    vx,
    vy: (Math.random() - 0.5) * 0.18,
    size: 44 + Math.random() * 28, // 44–72px width
    alpha: 0.65 + Math.random() * 0.30,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 0.055 + Math.random() * 0.04,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.008 + Math.random() * 0.007,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

    let raf = 0;
    let running = true;

    // Load 3 SVG frames trước khi bắt đầu animation
    Promise.all(FRAME_SRCS.map(loadImage)).then((frames) => {
      if (!running) return;

      const ravens: Raven[] = Array.from({ length: count }, () => makeRaven(w, h, false));

      const resize = () => {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
      };
      window.addEventListener('resize', resize);

      // SVG frames loaded — start animation loop;

      const draw = () => {
        ctx.clearRect(0, 0, w, h);

        for (const r of ravens) {
          r.wingPhase += r.wingSpeed;
          r.wobble += r.wobbleSpeed;
          r.x += r.vx;
          r.y += Math.sin(r.wobble) * 0.35 + r.vy;

          if (r.x > w + 90)  Object.assign(r, makeRaven(w, h, true), { vx: -(0.45 + Math.random() * 0.55), x: w + 80 });
          if (r.x < -90)     Object.assign(r, makeRaven(w, h, true), { vx:  (0.45 + Math.random() * 0.55), x: -80  });
          r.y = Math.max(h * 0.02, Math.min(h * 0.44, r.y));

          // Chọn frame theo wingPhase: 0=ngang, 1=lên, 2=xuống
          const sin = Math.sin(r.wingPhase);
          const frameIdx = sin > 0.33 ? 1 : sin < -0.33 ? 2 : 0;
          const frame = frames[frameIdx]!;

          // Tính kích thước render (giữ aspect ratio 120:60 = 2:1)
          const rw = r.size;
          const rh = r.size / 2;

          ctx.save();
          ctx.translate(r.x, r.y);

          // Lật ngang nếu bay sang trái
          if (r.vx < 0) ctx.scale(-1, 1);

          ctx.globalAlpha = r.alpha;
          ctx.drawImage(frame, -rw / 2, -rh / 2, rw, rh);
          ctx.restore();
        }

        raf = requestAnimationFrame(draw);
      };
      draw();

      return () => {
        window.removeEventListener('resize', resize);
      };
    }).catch(() => { /* SVG load fail — silent */ });

    return () => {
      running = false;
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
