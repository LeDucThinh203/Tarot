import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, MoonStar, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const handleSignOut = async () => { await signOut().catch(() => undefined); close(); navigate('/'); };
  return <header className="site-header">
    <div className="nav-shell">
      <Link className="brand" to="/" onClick={close}><span className="brand-mark"><MoonStar size={20} /></span><span>MYSTIC<span className="brand-gold"> TAROT</span><small>LẮNG NGHE · CHIÊM NGHIỆM</small></span></Link>
      <button className="mobile-menu" type="button" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav className={`nav-links ${open ? 'nav-open' : ''}`} aria-label="Điều hướng chính">
        <NavLink to="/" end onClick={close}>Khám phá</NavLink>
        <NavLink to="/library" onClick={close}>Thư viện bài</NavLink>
        {user && <NavLink to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} onClick={close}>{user.role === 'ADMIN' ? 'Quản trị' : 'Không gian của tôi'}</NavLink>}
        {user ? <><span className="nav-user">Chào, {user.displayName.split(' ')[0]}</span><button className="nav-login" onClick={handleSignOut}>Đăng xuất</button></> : <><NavLink className="nav-login" to="/login" onClick={close}>Đăng nhập</NavLink><Link className="button button-small" to="/reading" onClick={close}>Trải bài ngay <Sparkles size={14} /></Link></>}
      </nav>
    </div>
  </header>;
}
