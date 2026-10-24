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
      <span className="card-orbit orbit-one" /><span className="card-orbit orbit-two" />
      <span className="card-symbol"><Icon size={52} strokeWidth={1.05} /></span>
      <span className="card-star star-a">✦</span><span className="card-star star-b">✧</span>
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
