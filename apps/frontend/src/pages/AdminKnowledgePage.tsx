import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenText, Database, FilePlus2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { adminApi, getApiError } from '../services/api';

const dates = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });

export function AdminKnowledgePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');
  const client = useQueryClient();
  const documents = useQuery({ queryKey: ['admin-knowledge-documents'], queryFn: () => adminApi.knowledgeDocuments({ page: 1, limit: 50 }) });
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['admin-knowledge-documents'] }), client.invalidateQueries({ queryKey: ['admin-dashboard'] })]); };
  const create = useMutation({ mutationFn: adminApi.createKnowledgeDocument, onSuccess: async ({ indexedChunks }) => { setTitle(''); setContent(''); setFormError(''); toast.success(`Đã thêm tài liệu và lập chỉ mục ${indexedChunks} đoạn tri thức.`); await refresh(); } });
  const ingest = useMutation({ mutationFn: adminApi.ingestKnowledge, onSuccess: async (result) => { toast.success(`Đã đọc ${result.documents} tài liệu, lập chỉ mục ${result.chunks} đoạn.`); await refresh(); } });
  const reindex = useMutation({ mutationFn: adminApi.reindexKnowledge, onSuccess: async (result) => { toast.success(`Đã làm mới ${result.documents} tài liệu và ${result.chunks} đoạn tri thức.`); await refresh(); } });
  const busy = create.isPending || ingest.isPending || reindex.isPending;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim(); const cleanContent = content.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 250) { setFormError('Tên tài liệu cần từ 2 đến 250 ký tự.'); return; }
    if (cleanContent.length < 30 || cleanContent.length > 100_000) { setFormError('Nội dung cần từ 30 đến 100.000 ký tự.'); return; }
    setFormError(''); create.mutate({ title: cleanTitle, content: cleanContent });
  }
  return <div className="dashboard-page">
    <header className="dashboard-page-heading"><span className="dashboard-eyebrow">NỀN TẢNG TRI THỨC</span><h1>Kho tri thức <em>Tarot</em></h1><p>Thêm và cập nhật nguồn nội dung để lời luận có thêm nền tảng tham khảo.</p></header>
    <section className="knowledge-actions"><div><span className="dashboard-stat-icon"><Database size={17} /></span><span><strong>Đồng bộ nội dung trong thư mục tri thức</strong><small>Đọc các tài liệu Tarot sẵn có trong dự án.</small></span><button type="button" className="button button-ghost" disabled={busy} onClick={() => ingest.mutate()}>{ingest.isPending ? 'Đang đồng bộ...' : 'Đồng bộ tài liệu'} <Sparkles size={14} /></button></div><div><span className="dashboard-stat-icon"><RefreshCw size={17} /></span><span><strong>Làm mới nội dung đã có</strong><small>Tạo lại các đoạn tham khảo từ tài liệu đã lưu.</small></span><button type="button" className="button button-ghost" disabled={busy} onClick={() => reindex.mutate()}>{reindex.isPending ? 'Đang làm mới...' : 'Làm mới kho'} <RefreshCw size={14} /></button></div></section>
    {(create.isError || ingest.isError || reindex.isError) && <p className="form-alert" role="alert">{getApiError(create.error ?? ingest.error ?? reindex.error)}</p>}
    <section className="dashboard-section knowledge-create"><div className="dashboard-section-head"><div><span className="dashboard-eyebrow">BỔ SUNG NGUỒN MỚI</span><h2>Thêm tài liệu tham khảo</h2></div><FilePlus2 size={18} /></div><form onSubmit={submit} noValidate><label htmlFor="knowledge-title">Tên tài liệu</label><input id="knowledge-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={250} required placeholder="Ví dụ: Ý nghĩa các lá Ẩn Chính" aria-describedby="knowledge-title-count" /><small id="knowledge-title-count" className="field-hint">{title.length}/250 ký tự</small><label htmlFor="knowledge-content">Nội dung</label><textarea id="knowledge-content" value={content} onChange={(event) => setContent(event.target.value)} minLength={30} maxLength={100_000} required rows={8} placeholder="Dán nội dung Tarot muốn dùng làm nguồn tham khảo..." aria-describedby="knowledge-content-count" /><small id="knowledge-content-count" className="field-hint">{content.length.toLocaleString('vi-VN')}/100.000 ký tự · Tối thiểu 30 ký tự</small>{formError && <p className="field-error" role="alert">{formError}</p>}<button type="submit" className="button" disabled={busy}>{create.isPending ? 'Đang lưu và lập chỉ mục...' : 'Lưu tài liệu'} <FilePlus2 size={15} /></button></form></section>
    <section className="dashboard-section knowledge-list"><div className="dashboard-section-head"><div><span className="dashboard-eyebrow">NỘI DUNG ĐÃ LƯU</span><h2>Tài liệu trong kho</h2></div><span className="knowledge-total">{documents.data?.data.meta?.total ?? '—'} tài liệu</span></div>
      {documents.isLoading ? <LoadingState label="Đang mở kho tri thức..." /> : documents.isError ? <ErrorState message={getApiError(documents.error)} retry={() => void documents.refetch()} /> : documents.data?.data.data.length ? <div className="knowledge-document-list">{documents.data.data.data.map((doc) => <article key={doc.id}><span className="knowledge-doc-icon"><BookOpenText size={16} /></span><div><strong>{doc.title}</strong><small>{doc.source} · Cập nhật {dates.format(new Date(doc.updatedAt))}</small></div><span className="knowledge-chunks">{doc._count.chunks} đoạn</span><span className={`knowledge-status ${doc.status === 'READY' ? 'is-ready' : ''}`}>{doc.status === 'READY' ? 'Sẵn sàng' : doc.status === 'PROCESSING' ? 'Đang xử lý' : 'Cần xem lại'}</span></article>)}</div> : <div className="dashboard-empty"><Database size={22} /><h3>Kho tri thức đang trống</h3><p>Thêm một tài liệu hoặc đồng bộ các nguồn có sẵn trong dự án.</p></div>}
    </section>
  </div>;
}
