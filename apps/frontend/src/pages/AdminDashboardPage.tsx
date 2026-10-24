import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, BrainCircuit, Database, Sparkles, UsersRound } from 'lucide-react';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { adminApi, getApiError } from '../services/api';

export function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.dashboard });
  return <div className="dashboard-page">
    <header className="dashboard-welcome admin-welcome"><div><span className="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</span><h1>Chào mừng trở lại,<br /><em>người giữ nhịp.</em></h1><p>Theo dõi sức khỏe thư viện và hành trình của cộng đồng.</p></div><Link className="button button-ghost" to="/admin/knowledge">Mở kho tri thức <ArrowRight size={15} /></Link></header>
    {query.isLoading ? <LoadingState label="Đang tổng hợp hoạt động..." /> : query.isError ? <ErrorState message={getApiError(query.error)} retry={() => void query.refetch()} /> : <>
      <div className="dashboard-stat-grid admin-stat-grid">
        <AdminStat icon={<UsersRound size={17} />} label="Thành viên" value={query.data?.users ?? 0} detail="Tài khoản đã đăng ký" />
        <AdminStat icon={<Sparkles size={17} />} label="Trải bài" value={query.data?.readings ?? 0} detail={`${query.data?.interpretedReadings ?? 0} trải bài đã có lời luận`} />
        <AdminStat icon={<BookOpen size={17} />} label="Lá bài" value={query.data?.cards ?? 0} detail="Trong thư viện Tarot" />
        <AdminStat icon={<Database size={17} />} label="Tài liệu tri thức" value={query.data?.documents ?? 0} detail={`${query.data?.chunks ?? 0} đoạn tri thức đã lập chỉ mục`} />
      </div>
      <section className="dashboard-section admin-activity">
        <div className="dashboard-section-head"><div><span className="dashboard-eyebrow">TÌNH TRẠNG HÔM NAY</span><h2>Hoạt động của hệ thống</h2></div></div>
        <div className="admin-health-row"><span className="admin-health-icon"><BrainCircuit size={19} /></span><div><strong>Lượt gọi AI</strong><small>Số lượt diễn giải và trò chuyện trong ngày</small></div><b>{query.data?.aiRequestsToday ?? 0}</b></div>
        <div className="admin-shortcuts"><Link to="/admin/users"><UsersRound size={16} /><span><strong>Thành viên</strong><small>Tìm và xem danh sách tài khoản</small></span><ArrowRight size={15} /></Link><Link to="/admin/knowledge"><Database size={16} /><span><strong>Kho tri thức Tarot</strong><small>Bổ sung tài liệu và cập nhật nội dung đã lập chỉ mục</small></span><ArrowRight size={15} /></Link></div>
      </section>
    </>}
  </div>;
}

function AdminStat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <article className="dashboard-stat"><span className="dashboard-stat-icon">{icon}</span><span className="dashboard-stat-label">{label}</span><strong>{value.toLocaleString('vi-VN')}</strong><small>{detail}</small></article>;
}
