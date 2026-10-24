import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, ChartNoAxesCombined, CircleUserRound, Database, History, MoonStar, UsersRound } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';

const userLinks = [
  { to: '/dashboard', label: 'Tổng quan', icon: ChartNoAxesCombined, end: true },
  { to: '/dashboard/readings', label: 'Trải bài của tôi', icon: History },
  { to: '/dashboard/profile', label: 'Hồ sơ', icon: CircleUserRound },
];
const adminLinks = [
  { to: '/admin', label: 'Tổng quan', icon: ChartNoAxesCombined, end: true },
  { to: '/admin/users', label: 'Người dùng', icon: UsersRound },
  { to: '/admin/knowledge', label: 'Kho tri thức', icon: Database },
];

export function UserDashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  const items = userLinks;
  return <DashboardFrame title="Góc của bạn" subtitle="Một nơi riêng để trở lại với những điều đã chiêm nghiệm." icon={<MoonStar size={18} />} items={items} pathname={location.pathname} displayName={user?.displayName} />;
}

export function AdminDashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <DashboardFrame title="Không gian quản trị" subtitle="Theo dõi hoạt động và chăm sóc thư viện Mystic Tarot." icon={<BookOpen size={18} />} items={adminLinks} pathname={location.pathname} displayName={user?.displayName} admin />;
}

function DashboardFrame({ title, subtitle, icon, items, pathname, displayName, admin = false }: {
  title: string; subtitle: string; icon: React.ReactNode;
  items: Array<{ to: string; label: string; icon: typeof ChartNoAxesCombined; end?: boolean }>;
  pathname: string; displayName?: string; admin?: boolean;
}) {
  const activeLabel = items.find((item) => item.end ? pathname === item.to : pathname.startsWith(item.to))?.label ?? items[0].label;
  return <section className={`dashboard-shell section-wrap ${admin ? 'dashboard-admin' : ''}`}>
    <aside className="dashboard-sidebar">
      <div className="dashboard-side-heading"><span className="dashboard-side-icon">{icon}</span><div><strong>{title}</strong><small>{displayName ? `Xin chào, ${displayName}` : subtitle}</small></div></div>
      <span className="dashboard-nav-label">KHÔNG GIAN CỦA BẠN</span>
      <nav className="dashboard-nav" aria-label={admin ? 'Điều hướng quản trị' : 'Điều hướng cá nhân'}>
        {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-nav-link${isActive ? ' active' : ''}`}><Icon size={16} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="dashboard-side-note"><span>✦</span><p>{admin ? 'Mỗi chi tiết nhỏ đều góp phần giữ cho hành trình chiêm nghiệm được trọn vẹn.' : 'Những điều bạn đã gửi gắm luôn được giữ trong không gian riêng.'}</p></div>
    </aside>
    <main className="dashboard-main"><div className="dashboard-mobile-title">{title}</div><div className="dashboard-breadcrumb"><span>{admin ? 'QUẢN TRỊ' : 'KHÔNG GIAN RIÊNG'}</span><i>·</i>{activeLabel}</div><Outlet /></main>
  </section>;
}
