import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/auth-context';

// Tarot All-Seeing Eye — biểu tượng nhãn thần Tarot
function TarotEyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="26" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3.5 3.5" opacity="0.45"/>
      <path d="M10 32 C17 18, 47 18, 54 32 C47 46, 17 46, 10 32 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
      <circle cx="32" cy="32" r="9" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.7"/>
      <circle cx="32" cy="32" r="4.5" fill="currentColor" opacity="0.92"/>
      <path d="M32 8 L33.4 12.4 L38 12.4 L34.3 15 L35.7 19.4 L32 16.8 L28.3 19.4 L29.7 15 L26 12.4 L30.6 12.4 Z" fill="currentColor" opacity="0.8"/>
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const handleSignOut = async () => { await signOut().catch(() => undefined); close(); navigate('/'); };
  return <header className="site-header">
    <div className="nav-shell">
      <Link className="brand" to="/" onClick={close}>
        {/* Logo mark: outer ring xoay chậm, eye glow pulse */}
        <motion.span
          className="brand-mark"
          animate={{ boxShadow: ['0 0 0px rgba(217,188,131,0)', '0 0 14px rgba(217,188,131,0.35)', '0 0 0px rgba(217,188,131,0)'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <TarotEyeIcon />
          </motion.span>
        </motion.span>
        <span>MYSTIC<span className="brand-gold"> TAROT</span><small>LẮNG NGHE · CHIÊM NGHIỆM</small></span>
      </Link>
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
