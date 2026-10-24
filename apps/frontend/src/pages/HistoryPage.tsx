import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Search, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { getApiError, readingApi } from '../services/api';
import type { Reading } from '../types/api';

const topicNames: Record<string, string> = { LOVE: 'Tình yêu', CAREER: 'Công việc', FINANCE: 'Tài chính', PERSONAL_GROWTH: 'Bản thân', GENERAL: 'Tổng quan' };
const dates = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const searchTerm = search.trim();
  const query = useQuery({ queryKey: ['readings', searchTerm, page], queryFn: () => readingApi.list({ page, limit: 10, ...(searchTerm ? { search: searchTerm } : {}) }) });
  const remove = useMutation({ mutationFn: readingApi.remove, onSuccess: async () => { toast.success('Đã khép lại trải bài này.'); await queryClient.invalidateQueries({ queryKey: ['readings'] }); } });
  const readings = query.data?.data.data ?? [];
  const pages = query.data?.data.meta?.totalPages ?? 0;
  const deleteReading = (reading: Reading) => { if (window.confirm('Bạn muốn xóa trải bài này khỏi không gian riêng của mình chứ?')) remove.mutate(reading.id); };
  return <section className="section-wrap history-page">
    <div className="library-heading"><span className="section-kicker"><Clock3 size={14} /> NHỮNG ĐIỀU BẠN ĐÃ GỬI GẮM</span><h1>Những lần<br /><em>lắng nghe.</em></h1><p>Những câu hỏi cũ vẫn ở đây, chờ bạn quay lại khi cần một góc nhìn khác.</p></div>
    <label className="search-field history-search"><Search size={17} /><input type="search" value={search} maxLength={100} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm trong câu hỏi..." aria-label="Tìm câu hỏi trong lịch sử" aria-describedby="history-search-count" /><small id="history-search-count" className="search-length" aria-live="polite">{search.length}/100</small></label>
    {query.isLoading ? <LoadingState label="Đang mở lại những lần bạn từng lắng nghe..." /> : query.isError ? <ErrorState message={getApiError(query.error)} retry={() => void query.refetch()} /> : readings.length ? <><div className="history-list">{readings.map((reading) => <article className="history-item" key={reading.id}><div className="history-date"><span>{dates.format(new Date(reading.createdAt))}</span><small>{topicNames[reading.topic]} · {reading.cards.length} lá</small></div><div className="history-content"><h2>{reading.question}</h2><div className="history-cards">{reading.cards.map((entry) => <span key={entry.id} className={entry.orientation === 'REVERSED' ? 'reversed-chip' : ''}>{entry.tarotCard.nameVi}</span>)}</div><span className={`status-chip ${reading.interpretation ? 'status-done' : ''}`}>{reading.interpretation ? 'Đã có lời gợi mở' : 'Chờ bạn lắng nghe'}</span></div><div className="history-actions"><Link aria-label="Mở lại trải bài" to={`/reading/${reading.id}`}><Sparkles size={17} /></Link><button aria-label="Xóa trải bài" onClick={() => deleteReading(reading)} disabled={remove.isPending}><Trash2 size={16} /></button></div></article>)}</div>{pages > 1 && <nav className="pagination" aria-label="Các trang trải bài"><button className="button button-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button><span>Trang {page} / {pages}</span><button className="button button-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Tiếp →</button></nav>}</> : <div className="empty-state"><span>✧</span><h2>{search ? 'Chưa tìm thấy câu hỏi này' : 'Bạn chưa có trải bài nào'}</h2><p>{search ? 'Thử một cách viết khác nhé.' : 'Khi sẵn sàng, hãy bắt đầu bằng điều đang ở trong lòng bạn.'}</p><Link className="button" to="/reading">Đặt câu hỏi đầu tiên <Sparkles size={15} /></Link></div>}
    {remove.isError && <p className="form-alert">{getApiError(remove.error)}</p>}
  </section>;
}
