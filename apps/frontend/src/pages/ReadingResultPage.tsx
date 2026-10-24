import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, BookOpen, Check, Compass, Sparkles } from 'lucide-react';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { TarotCardView } from '../components/tarot/TarotCardView';
import { ReadingFollowUpChat } from '../components/tarot/ReadingFollowUpChat';
import { getApiError, readingApi } from '../services/api';

const topicNames: Record<string, string> = { LOVE: 'Tình yêu', CAREER: 'Công việc', FINANCE: 'Tài chính', PERSONAL_GROWTH: 'Phát triển bản thân', GENERAL: 'Tổng quan' };
const spreadNames: Record<string, string> = { ONE_CARD: 'Một lá', THREE_CARDS: 'Ba lá', FIVE_CARDS: 'Năm lá' };
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' });
function EmphasizedText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+?\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part)}</>;
}

export function ReadingResultPage() {
  const { id = '' } = useParams();
  const prefersReducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: reading, isLoading, isError, error, refetch } = useQuery({ queryKey: ['reading', id], queryFn: () => readingApi.get(id), enabled: Boolean(id) });
  const interpret = useMutation({ mutationFn: () => readingApi.interpret(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['reading', id] }); } });
  const modelCards = useMemo(() => new Map(reading?.interpretation?.interpretationJson.cards.map((card) => [card.cardId, card]) ?? []), [reading]);

  if (isLoading) return <div className="section-wrap"><LoadingState label="Đang lật những lá bài đã rút..." /></div>;
  if (isError || !reading) return <div className="section-wrap"><ErrorState message={getApiError(error)} retry={() => void refetch()} /><Link className="button button-ghost" to="/history">Về lịch sử</Link></div>;

  const hasResult = Boolean(reading.interpretation);
  return <section className="section-wrap result-page">
    <div className="result-back"><Link to="/history"><ArrowLeft size={15} /> Lịch sử trải bài</Link><span>{dateFormat.format(new Date(reading.createdAt))}</span></div>
    <motion.div className="result-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><span className="result-topic">{topicNames[reading.topic]} <i>·</i> {spreadNames[reading.spreadType]}</span><h1>{reading.question}</h1><p>{reading.querentName ? `${reading.querentName}, những lá bài này vừa xuất hiện trong trải bài của bạn.` : 'Những lá bài này vừa xuất hiện trong trải bài của bạn.'} Hãy ngắm từng lá trong chốc lát, rồi đọc lời gợi mở.</p></motion.div>
    <div className="drawn-cards" aria-label="Các lá bài đã rút">{reading.cards.map((entry, index) => <motion.div key={entry.id} initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 76, rotateY: index % 2 ? -105 : 105, rotateZ: index % 2 ? 6 : -6, scale: .86 }} animate={{ opacity: 1, y: 0, rotateY: 0, rotateZ: 0, scale: 1 }} transition={prefersReducedMotion ? { delay: index * .04, duration: .18 } : { delay: .3 + index * .48, duration: .95, ease: [.16, 1, .3, 1] }} style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}><TarotCardView card={entry.tarotCard} orientation={entry.orientation} position={entry.positionName} /></motion.div>)}</div>

    {!hasResult && <div className="confirm-panel"><div className="confirm-icon"><Check size={20} /></div><div><strong>Bạn đã sẵn sàng lắng nghe?</strong><p>Mình sẽ nhìn câu hỏi cùng từng lá bài để gửi bạn vài gợi ý ngắn gọn. Trải bài sẽ được lưu trong không gian riêng của bạn.</p></div><button className="button" onClick={() => interpret.mutate()} disabled={interpret.isPending || reading.status === 'INTERPRETING'}>{interpret.isPending || reading.status === 'INTERPRETING' ? 'Đang lắng nghe...' : 'Mở lời gợi ý'} <Sparkles size={15} /></button></div>}
    {interpret.isError && <div className="form-alert result-alert" role="alert">{getApiError(interpret.error)} <button onClick={() => interpret.mutate()}>Thử lại</button></div>}

    {reading.interpretation && <motion.article className="interpretation" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="interpretation-title"><span className="section-kicker"><Sparkles size={14} /> LỜI GỢI MỞ DÀNH CHO BẠN</span><h2><EmphasizedText text={reading.interpretation.summary} /></h2><p className="overall-message"><EmphasizedText text={reading.interpretation.overallMessage} /></p></div>
      <details className="card-meanings">
        <summary><strong>Ý nghĩa từng lá</strong><span>{reading.cards.length} lá · Xem chi tiết</span></summary>
        <div className="interpretation-card-list">{reading.cards.map((entry) => {
        const result = modelCards.get(entry.tarotCard.id);
        return <div className="interpretation-card" key={entry.id}><div><span className="interpretation-position">{entry.positionName}</span><h3>{entry.tarotCard.nameVi}</h3><small>{entry.orientation === 'UPRIGHT' ? 'Lá xuôi' : 'Lá ngược'} · {entry.tarotCard.name}</small></div><p><strong className="interpretation-label">Ý nghĩa trong vị trí này</strong><EmphasizedText text={result?.meaning ?? ''} /><span><EmphasizedText text={result?.interpretation ?? ''} /></span></p></div>;
        })}</div>
      </details>
      {reading.interpretation.interpretationJson.connections.length > 0 && <section className="insight-block"><h3><Compass size={16} /> Mối liên hệ giữa các lá</h3><ul>{reading.interpretation.interpretationJson.connections.map((item, index) => <li key={index}><EmphasizedText text={item} /></li>)}</ul></section>}
      <div className="insight-columns">
        {reading.interpretation.opportunities.length > 0 && <section className="insight-block"><h3>Cơ hội</h3><ul>{reading.interpretation.opportunities.map((item, index) => <li key={index}><EmphasizedText text={item} /></li>)}</ul></section>}
        {reading.interpretation.challenges.length > 0 && <section className="insight-block"><h3>Điều cần chú ý</h3><ul>{reading.interpretation.challenges.map((item, index) => <li key={index}><EmphasizedText text={item} /></li>)}</ul></section>}
      </div>
      <section className="advice-block"><span className="section-kicker"><BookOpen size={14} /> GỢI Ý ĐỂ MANG THEO</span><ul>{reading.interpretation.advice.map((item, index) => <li key={index}><EmphasizedText text={item} /></li>)}</ul></section>
      <ReadingFollowUpChat readingId={reading.id} querentName={reading.querentName} />
      <section className="sources-block"><h3>Điều soi chiếu cho trải bài</h3>{reading.interpretation.sources.length ? <div className="source-list">{reading.interpretation.sources.map((source) => <details className="source-item" key={source.chunkId}><summary><span>{source.title}</span><small>Gợi mở liên quan</small></summary><p><EmphasizedText text={source.excerpt.replace(/^\\?#{1,6}\s*/gm, '').replace(/`([^`]+)`/g, '$1')} /></p></details>)}</div> : <p className="no-sources">Mỗi lá bài có nhiều tầng ý nghĩa. Hãy giữ lại điều nào thật sự hữu ích với bạn và để phần còn lại trôi qua.</p>}</section>
      <p className="result-disclaimer">Tarot gợi mở suy ngẫm, không thay bạn quyết định những việc quan trọng về sức khỏe, luật pháp hay tiền bạc.</p>
      <div className="result-actions"><Link to="/reading" className="button">Trải bài mới <Sparkles size={15} /></Link><Link to="/history" className="text-link">Xem lịch sử <ArrowLeft size={15} /></Link></div>
    </motion.article>}
  </section>;
}
