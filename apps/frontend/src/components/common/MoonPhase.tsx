import { motion } from 'framer-motion';

// 8 pha mặt trăng dạng unicode + label
const PHASES = [
  { symbol: '🌑', label: 'Trăng non' },
  { symbol: '🌒', label: 'Trăng lưỡi liềm đầu' },
  { symbol: '🌓', label: 'Trăng bán nguyệt đầu' },
  { symbol: '🌔', label: 'Trăng khuyết đầu' },
  { symbol: '🌕', label: 'Trăng tròn' },
  { symbol: '🌖', label: 'Trăng khuyết cuối' },
  { symbol: '🌗', label: 'Trăng bán nguyệt cuối' },
  { symbol: '🌘', label: 'Trăng lưỡi liềm cuối' },
];

// Tính pha mặt trăng thực tế theo ngày
function getMoonPhaseIndex(): number {
  const knownNew = new Date('2024-01-11').getTime();
  const now = Date.now();
  const daysSince = (now - knownNew) / 86400000;
  const cycle = 29.53;
  const phase = ((daysSince % cycle) + cycle) % cycle;
  return Math.floor((phase / cycle) * 8) % 8;
}

export function MoonPhase() {
  const phaseIdx = getMoonPhaseIndex();
  const phase = PHASES[phaseIdx]!;

  return (
    <motion.div
      style={{
        position: 'fixed', top: 22, right: 20,
        zIndex: 15, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, pointerEvents: 'none',
        userSelect: 'none',
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
    >
      {/* Mặt trăng glow pulse */}
      <motion.span
        style={{ fontSize: 22, lineHeight: 1, filter: 'drop-shadow(0 0 6px rgba(217,188,131,0.5))' }}
        animate={{
          filter: [
            'drop-shadow(0 0 4px rgba(217,188,131,0.3))',
            'drop-shadow(0 0 14px rgba(217,188,131,0.75))',
            'drop-shadow(0 0 4px rgba(217,188,131,0.3))',
          ],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        aria-label={phase.label}
        role="img"
      >
        {phase.symbol}
      </motion.span>

      {/* Label nhỏ dưới trăng */}
      <motion.span
        style={{
          fontSize: 7, letterSpacing: '0.12em', color: 'rgba(217,188,131,0.45)',
          fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {phase.label}
      </motion.span>

      {/* Đường kẻ trang trí */}
      <motion.span
        style={{ width: 1, height: 18, background: 'linear-gradient(to bottom, rgba(217,188,131,0.3), transparent)' }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
