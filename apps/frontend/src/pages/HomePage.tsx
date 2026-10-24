import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, BookOpen, Compass, Feather, Sparkles, Stars } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tarotApi } from '../services/api';
import { TarotCardView } from '../components/tarot/TarotCardView';

const steps = [
  { icon: Compass, number: '01', title: 'Nói điều bạn đang băn khoăn', text: 'Dành một khoảnh khắc gọi tên điều bạn muốn nhìn rõ hơn.' },
  { icon: Stars, number: '02', title: 'Đón nhận những lá bài', text: 'Chọn một, ba hoặc năm lá. Hãy ngắm nhìn những lá bài vừa xuất hiện.' },
  { icon: BookOpen, number: '03', title: 'Lắng nghe lời gợi mở', text: 'Câu hỏi và những lá bài cùng mở ra một góc nhìn để bạn tự chọn bước tiếp theo.' },
];

export function HomePage() {
  const { data } = useQuery({ queryKey: ['tarot-cards', 'featured'], queryFn: async () => (await tarotApi.list({ page: 1, limit: 3, arcana: 'MAJOR' })).data.data });
  return <>
    <section className="hero section-wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> MỘT KHOẢNG LẶNG DÀNH CHO BẠN</div>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>Lắng nghe những<br /><em>biểu tượng</em> bên trong.</motion.h1>
        <p className="hero-subtitle">Một khoảng lặng để nhìn lại điều đang khiến bạn băn khoăn. Hãy để những biểu tượng Tarot gợi mở một góc nhìn mới.</p>
        <div className="hero-actions"><Link className="button" to="/reading">Bắt đầu trải bài <ArrowRight size={17} /></Link><a className="text-link" href="#how-it-works">Tìm hiểu hành trình <ArrowDown size={15} /></a></div>
        <div className="hero-note"><span className="note-dot" /> RIÊNG TƯ · DỊU DÀNG · BẠN TỰ LỰA CHỌN</div>
      </div>
      <div className="hero-art" aria-label="Hình minh họa lá bài Tarot dưới bầu trời sao" role="img">
        <div className="hero-glow" /><span className="hero-constellation const-a">✦</span><span className="hero-constellation const-b">✧</span><span className="hero-constellation const-c">·</span>
        <div className="hero-tarot-card"><div className="hero-card-top">XVII <span>✧</span> 0</div><span className="hero-moon">☾</span><div className="hero-figure"><span className="figure-halo" /><span className="figure-body" /><span className="figure-star">✦</span></div><div className="hero-card-caption">ÁNH SÁNG TĨNH LẶNG</div></div>
        <div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="hero-art-caption"><span>BẦU TRỜI NỘI TÂM</span><small>XVII · KHOẢNH KHẮC SÁNG TỎ</small></div>
      </div>
      <div className="hero-bottom-mark"><span>01</span><span className="hero-mark-line" /><span>CUỘN XUỐNG ĐỂ KHÁM PHÁ</span></div>
    </section>

    <section className="intro-strip"><div className="section-wrap intro-inner"><Feather size={20} /><p>Tarot không quyết định tương lai thay bạn. <span>Đó là một chiếc gương — để nhìn hiện tại bằng một góc độ khác.</span></p></div></section>

    <section id="how-it-works" className="section-wrap process-section">
      <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> MỘT KHOẢNG LẶNG DÀNH CHO BẠN</div><h2>Chậm lại. <em>Hỏi. Lắng nghe.</em></h2></div><p>Mỗi trải bài bắt đầu từ điều đang ở trong tâm trí bạn — và khép lại bằng một góc nhìn để mang theo.</p></div>
      <div className="step-grid">{steps.map(({ icon: Icon, number, title, text }, index) => <motion.article className="step-card" key={number} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .1 }}><div className="step-icon"><Icon size={20} /></div><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></motion.article>)}</div>
    </section>

    <section className="featured-section"><div className="section-wrap featured-inner">
      <div className="featured-copy"><div className="eyebrow"><span className="eyebrow-line" /> BỘ BÀI 78 LÁ</div><h2>Mỗi lá bài,<br /><em>một câu chuyện.</em></h2><p>Từ những bước chuyển lớn đến những điều bình dị mỗi ngày — mỗi lá bài đều mở ra một cách nhìn riêng.</p><Link className="text-link" to="/library">Ghé thăm những lá bài <ArrowRight size={15} /></Link></div>
      <div className="featured-cards">{data?.map((card, index) => <div className={`featured-card featured-card-${index + 1}`} key={card.id}><TarotCardView card={card} /></div>)}</div>
    </div></section>

    <section className="section-wrap closing-cta"><div className="closing-stars">✧ <span>✦</span> ✧</div><div className="eyebrow">ĐIỀU GÌ ĐANG Ở TRONG TÂM TRÍ BẠN?</div><h2>Một câu hỏi có thể<br />mở ra <em>một góc nhìn mới.</em></h2><Link className="button" to="/reading">Bắt đầu trải bài <Sparkles size={16} /></Link><small>Bạn có thể bắt đầu ngay, chưa cần tạo tài khoản.</small></section>
  </>;
}
