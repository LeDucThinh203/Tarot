import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
export function NotFoundPage() { return <section className="section-wrap not-found"><span>MỘT LỐI RẼ KHÁC</span><h1>Hình như bạn đã<br /><em>rẽ sang một vì sao khác.</em></h1><p>Đường dẫn này chưa mở ra điều bạn đang tìm.</p><Link className="button" to="/">Trở về nơi bắt đầu <Sparkles size={15} /></Link></section>; }
