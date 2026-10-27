import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Sparkles, Sun, Waves } from 'lucide-react';
import type { TarotCard } from '../../types/api';

const icons = [Sparkles, Sun, Waves];
export function TarotCardView({ card, orientation, position, onClick }: { card: TarotCard; orientation?: 'UPRIGHT' | 'REVERSED'; position?: string; onClick?: () => void }) {
  const Icon = icons[(card.number ?? 0) % icons.length]!;
  const reversed = orientation === 'REVERSED';
  const content = <>
    {position && <span className="card-position">{position}</span>}
    <div className="card-frame" style={reversed ? { transform: 'rotate(180deg)' } : undefined}>
      <span className="card-number">{card.arcana === 'MAJOR' ? String(card.number).padStart(2, '0') : card.number}</span>
      {/* Orbit xoay */}
      <motion.span className="card-orbit orbit-one"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'block' }}
      />
      <motion.span className="card-orbit orbit-two"
        animate={{ rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'block' }}
      />
      {/* Icon pulse */}
      <motion.span className="card-symbol"
        animate={{ filter: ['drop-shadow(0 0 8px rgba(230,199,142,.36))', 'drop-shadow(0 0 18px rgba(230,199,142,.7))', 'drop-shadow(0 0 8px rgba(230,199,142,.36))'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      ><Icon size={52} strokeWidth={1.05} /></motion.span>
      {/* Sao nhấp nháy lệch pha */}
      <motion.span className="card-star star-a"
        animate={{ opacity: [1, 0.15, 1], scale: [1, 1.5, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>✦</motion.span>
      <motion.span className="card-star star-b"
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>✧</motion.span>
    </div>
    <span className="card-name">{card.nameVi}</span>
    <span className="card-name-en">{card.name}</span>
    {orientation && <span className={`card-orientation ${reversed ? 'is-reversed' : ''}`}>{reversed ? <ArrowDown size={12} /> : <ArrowUp size={12} />}{reversed ? 'Ngược' : 'Xuôi'}</span>}
  </>;
  const label = `${card.nameVi}${reversed ? ', ngược' : ''}`;
  return onClick
    ? <motion.button type="button" className="tarot-card tarot-card-clickable" onClick={onClick} whileHover={{ y: -7, rotate: -1.5 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} aria-label={label}>{content}</motion.button>
    : <motion.div className="tarot-card tarot-card-static" role="img" aria-label={label} style={{ cursor: 'default' }}>{content}</motion.div>;
}
