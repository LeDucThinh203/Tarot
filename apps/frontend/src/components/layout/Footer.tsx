import { Link } from 'react-router-dom';
import { MoonStar } from 'lucide-react';

export function Footer() {
  return <footer className="site-footer"><div className="footer-inner">
    <Link className="brand footer-brand" to="/"><span className="brand-mark"><MoonStar size={18} /></span><span>MYSTIC<span className="brand-gold"> TAROT</span><small>LẮNG NGHE · CHIÊM NGHIỆM</small></span></Link>
    <p>Tarot không định sẵn tương lai. Mỗi lá bài chỉ mở ra một góc nhìn để bạn tự lựa chọn.</p>
    <div><Link to="/reading">Trải bài</Link><Link to="/library">Thư viện lá bài</Link></div>
    <small>© {new Date().getFullYear()} Mystic Tarot · Một khoảng lặng dành cho bạn.</small>
  </div></footer>;
}
