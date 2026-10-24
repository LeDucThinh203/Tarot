import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CalendarDays, CircleCheck, Sparkles } from 'lucide-react';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { useAuth } from '../contexts/auth-context';
import { getApiError, readingApi, usersApi } from '../services/api';

const dates = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
const topicLabels: Record<string, string> = { LOVE: 'Tình yêu', CAREER: 'Công việc', FINANCE: 'Tài chính', PERSONAL_GROWTH: 'Bản thân', GENERAL: 'Tổng quan' };

export function UserDashboardPage() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ['user-dashboard'], queryFn: usersApi.dashboard });
  const recent = useQuery({ queryKey: ['readings', 'dashboard-recent'], queryFn: () => readingApi.list({ page: 1, limit: 5 }) });
  const readings = recent.data?.data.data ?? [];
  return <div className="dashboard-page">
    <header className="dashboard-welcome"><div><span className="dashboard-eyebrow">MỘT KHOẢNG LẶNG DÀNH RIÊNG</span><h1>Chào {user?.displayName.split(' ')[0] ?? 'bạn'},<br /><em>mình lại gặp nhau.</em></h1><p>Những câu hỏi và trải bài của bạn được gìn giữ tại đây.</p></div><Link className="button" to="/reading">Bắt đầu trải bài <Sparkles size={15} /></Link></header>
    {stats.isLoading ? <LoadingState label="Đang mở không gian của bạn..." /> : stats.isError ? <ErrorState message={getApiError(stats.error)} retry={() => void stats.refetch()} /> : <div className="dashboard-stat-grid">
      <DashboardStat icon={<BookOpen size={17} />} label="Tổng trải bài" value={stats.data?.readings ?? 0} note="Mỗi câu hỏi là một góc nhìn mới" />
      <DashboardStat icon={<CircleCheck size={17} />} label="Đã có lời luận" value={stats.data?.interpretedReadings ?? 0} note="Những lần bạn đã cùng bài chiêm nghiệm" />
      <DashboardStat icon={<CalendarDays size={17} />} label="Đồng hành từ" value={stats.data?.createdAt ? dates.format(new Date(stats.data.createdAt)) : '—'} note="Hành trình của riêng bạn" />
    </div>}
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><span className="dashboard-eyebrow">DẤU ẤN GẦN ĐÂY</span><h2>Những lần bạn đã gửi gắm</h2></div><Link className="text-link" to="/dashboard/readings">Xem tất cả <ArrowRight size={14} /></Link></div>
      {recent.isLoading ? <LoadingState label="Đang tìm những trải bài gần đây..." /> : recent.isError ? <ErrorState message={getApiError(recent.error)} retry={() => void recent.refetch()} /> : readings.length ? <div className="dashboard-recent-list">{readings.map((reading) => <Link to={`/reading/${reading.id}`} className="dashboard-recent-item" key={reading.id}><span className="dashboard-recent-date">{dates.format(new Date(reading.createdAt))}</span><span className="dashboard-recent-copy"><strong>{reading.question}</strong><small>{topicLabels[reading.topic]} · {reading.cards.length} lá</small></span><span className={`dashboard-status ${reading.interpretation ? 'is-ready' : ''}`}>{reading.interpretation ? 'Đã luận giải' : 'Đang chờ'}</span><ArrowRight size={15} /></Link>)}</div> : <div className="dashboard-empty"><span>✦</span><h3>Trải bài đầu tiên đang chờ bạn</h3><p>Hãy bắt đầu bằng điều đang ở trong lòng bạn hôm nay.</p><Link className="button button-ghost" to="/reading">Đặt câu hỏi <Sparkles size={14} /></Link></div>}
    </section>
  </div>;
}

function DashboardStat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | number; note: string }) {
  return <article className="dashboard-stat"><span className="dashboard-stat-icon">{icon}</span><span className="dashboard-stat-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
