import { useDeferredValue, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles } from 'lucide-react';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { TarotCardView } from '../components/tarot/TarotCardView';
import { getApiError, tarotApi } from '../services/api';

const suitNames: Record<string, string> = { WANDS: 'Gậy', CUPS: 'Cốc', SWORDS: 'Kiếm', PENTACLES: 'Tiền' };

function CardSkeletonGrid() {
  return <div className="library-grid" aria-label="Đang tải lá bài" aria-busy="true">{Array.from({ length: 12 }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-frame" /><span className="skeleton-line" /><span className="skeleton-line skeleton-short" /></div>)}</div>;
}

export function LibraryPage() {
  const [search, setSearch] = useState('');
  const [arcana, setArcana] = useState('');
  const deferredSearch = useDeferredValue(search);
  const searchTerm = deferredSearch.trim();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['tarot-cards', { searchTerm, arcana }], queryFn: async () => (await tarotApi.list({ page: 1, limit: 78, ...(searchTerm ? { search: searchTerm } : {}), ...(arcana ? { arcana } : {}) })).data.data });
  return <section className="section-wrap library-page">
    <div className="library-heading"><span className="section-kicker"><Sparkles size={14} /> NHỮNG BIỂU TƯỢNG TAROT</span><h1>78 lá bài.<br /><em>78 cánh cửa.</em></h1><p>Mỗi lá mang một câu chuyện. Hãy khám phá điều lá xuôi, lá ngược và những biểu tượng ấy gợi nhắc cho bạn.</p></div>
    <div className="library-toolbar"><label className="search-field"><Search size={17} /><input type="search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên lá bài..." aria-label="Tìm tên lá bài" aria-describedby="library-search-count" /><small id="library-search-count" className="search-length" aria-live="polite">{search.length}/100</small></label><div className="filter-tabs" role="group" aria-label="Chọn nhóm lá bài">{[['', 'Tất cả'], ['MAJOR', 'Bước ngoặt lớn'], ['MINOR', 'Chuyện đời thường']].map(([value, label]) => <button type="button" key={value} className={arcana === value ? 'filter-active' : ''} onClick={() => setArcana(value)} aria-pressed={arcana === value}>{label}</button>)}</div><span className="library-count">{query.data?.length ?? '—'} LÁ</span></div>
    {query.isLoading ? <CardSkeletonGrid /> : query.isError ? <ErrorState message={getApiError(query.error)} retry={() => void query.refetch()} /> : query.data?.length ? <div className="library-grid">{query.data.map((card) => <TarotCardView key={card.id} card={card} onClick={() => navigate(`/library/${card.slug}`)} />)}</div> : <div className="empty-state"><span>✧</span><h2>Chưa tìm thấy lá bài</h2><p>Thử tên khác nhé. Bạn cũng có thể xem lại tất cả các lá bài.</p><button className="button button-ghost" onClick={() => { setSearch(''); setArcana(''); }}>Xem tất cả lá bài</button></div>}
    <p className="library-footnote">Ý nghĩa mỗi lá có thể đổi khác theo câu hỏi, vị trí và những lá bài bên cạnh.</p>
  </section>;
}

export function TarotCardPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['tarot-card', slug], queryFn: () => tarotApi.bySlug(slug), enabled: Boolean(slug) });
  if (query.isLoading) return <div className="section-wrap"><LoadingState label="Đang tìm câu chuyện của lá bài..." /></div>;
  if (query.isError || !query.data) return <div className="section-wrap"><ErrorState message={getApiError(query.error)} retry={() => void query.refetch()} /><Link className="button button-ghost" to="/library">Về thư viện</Link></div>;
  const card = query.data;
  return <section className="section-wrap card-detail-page"><button className="back-link" onClick={() => navigate('/library')}>← Trở lại những lá bài</button><div className="card-detail-layout"><TarotCardView card={card} /><div className="card-detail-copy"><span className="section-kicker">{card.arcana === 'MAJOR' ? 'BƯỚC NGOẶT LỚN' : `CHUYỆN ĐỜI THƯỜNG · ${suitNames[card.suit ?? ''] ?? card.suit}`}</span><h1>{card.nameVi}<em>{card.name}</em></h1><p className="card-detail-description">{card.description}</p><div className="meaning-block"><h2>Lá xuôi</h2><p>{card.uprightMeaning}</p></div><div className="meaning-block reversed-meaning"><h2>Lá ngược</h2><p>{card.reversedMeaning}</p></div><div className="keyword-list">{card.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><Link className="button" to="/reading">Đặt một câu hỏi <Sparkles size={15} /></Link></div></div></section>;
}

