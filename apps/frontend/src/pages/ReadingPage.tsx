import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, Heart, Sparkles, UserRound, Wallet } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { readingApi, getApiError } from '../services/api';
import { useAuth } from '../contexts/auth-context';

const schema = z.object({
  querentName: z.string().trim().min(2, 'Hãy nhập tên bạn muốn được gọi.').max(80, 'Tên không được quá 80 ký tự.').refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Tên chứa ký tự không hợp lệ.'),
  querentBirthDate: z.string().min(1, 'Hãy nhập ngày sinh.').refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    const localToday = new Date().toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !Number.isNaN(date.getTime())
      && date.toISOString().slice(0, 10) === value
      && value >= '1900-01-01'
      && value <= localToday;
  }, 'Ngày sinh chưa đúng, bạn kiểm tra lại nhé.'),
  querentGender: z.enum(['', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  question: z.string().trim().min(8, 'Bạn viết thêm một chút để gọi rõ điều mình đang băn khoăn nhé.').max(1000, 'Câu hỏi hơi dài rồi, bạn rút gọn lại nhé.'),
  topic: z.enum(['LOVE', 'CAREER', 'FINANCE', 'PERSONAL_GROWTH', 'GENERAL']),
  spreadType: z.enum(['ONE_CARD', 'THREE_CARDS', 'FIVE_CARDS']),
});
type FormValues = z.infer<typeof schema>;
const topics = [
  { value: 'LOVE', label: 'Tình yêu', icon: Heart }, { value: 'CAREER', label: 'Công việc', icon: BriefcaseBusiness },
  { value: 'FINANCE', label: 'Tài chính', icon: Wallet }, { value: 'PERSONAL_GROWTH', label: 'Bản thân', icon: UserRound },
  { value: 'GENERAL', label: 'Tổng quan', icon: Sparkles },
] as const;
const questionSuggestions: Array<{ topic: FormValues['topic']; question: string }> = [
  { topic: 'LOVE', question: 'Mình cần hiểu điều gì về mối quan hệ hiện tại?' },
  { topic: 'CAREER', question: 'Cơ hội nào trong công việc mình nên chú ý?' },
  { topic: 'FINANCE', question: 'Mình nên lưu ý điều gì khi quản lý tài chính cá nhân?' },
  { topic: 'PERSONAL_GROWTH', question: 'Mình có thể buông bỏ điều gì để phát triển?' },
  { topic: 'GENERAL', question: 'Thông điệp nào quan trọng nhất với mình lúc này?' },
];
const spreads = [
  { value: 'ONE_CARD', name: 'Một lá', count: '01', description: 'Một góc nhìn cho hiện tại', glyph: '✧' },
  { value: 'THREE_CARDS', name: 'Ba lá', count: '03', description: 'Quá khứ · Hiện tại · Phía trước', glyph: '✧  ✧  ✧' },
  { value: 'FIVE_CARDS', name: 'Năm lá', count: '05', description: 'Khám phá bức tranh sâu hơn', glyph: '✧ ✧ ✧ ✧ ✧' },
] as const;

export function ReadingPage() {
  const navigate = useNavigate();
  const { user, ensureGuestSession } = useAuth();
  const [step, setStep] = useState(1);
  const { register, control, handleSubmit, trigger, setValue, formState: { errors }, watch } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { querentName: '', querentBirthDate: '', querentGender: '', topic: 'GENERAL', spreadType: 'THREE_CARDS' } });
  const mutation = useMutation({ mutationFn: async (input: Parameters<typeof readingApi.create>[0]) => { await ensureGuestSession(); return readingApi.create(input); }, onSuccess: (reading) => navigate(`/reading/${reading.id}`) });
  const selectedSpread = watch('spreadType');
  const onSubmit = (values: FormValues) => mutation.mutate({ ...values, idempotencyKey: crypto.randomUUID() });

  return <section className="section-wrap reading-builder">
    <div className="reading-topline"><Link to="/" className="back-link">← Trở về</Link><span>TRẢI BÀI <span className="gold-text">·</span> {String(step).padStart(2, '0')} / 02</span></div>
    <div className="reading-progress"><span style={{ width: step === 1 ? '50%' : '100%' }} /></div>
    <motion.div className="reading-heading" key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="eyebrow"><span className="eyebrow-line" /> HÃY DÀNH MỘT KHOẢNH KHẮC</div><h1>{step === 1 ? <>Điều gì đang ở<br /><em>trong tâm trí bạn?</em></> : <>Chọn cách bạn muốn<br /><em>lắng nghe.</em></>}</h1><p>{step === 1 ? 'Bạn không cần đặt câu hỏi thật hoàn hảo. Hãy bắt đầu bằng điều mình muốn hiểu rõ hơn. Bạn có thể bắt đầu ngay, chưa cần tạo tài khoản.' : 'Mỗi trải bài mở ra một cách nhìn khác. Chọn nhịp độ phù hợp với câu hỏi của bạn.'}</p></motion.div>
    <form className="reading-form" onSubmit={handleSubmit(onSubmit)}>
      {step === 1 ? <div className="form-panel question-panel">
        <fieldset className="personal-fields">
          <legend>ĐÔI ĐIỀU VỀ BẠN</legend>
          <div className="personal-field">
            <label htmlFor="querentName">BẠN MUỐN MÌNH GỌI LÀ GÌ?</label>
            <input id="querentName" autoComplete="name" required minLength={2} maxLength={80} aria-invalid={Boolean(errors.querentName)} aria-describedby={errors.querentName ? "querent-name-error querent-name-count" : "querent-name-count"} placeholder="Ví dụ: Minh Anh" {...register('querentName')} />
            <small id="querent-name-count" className="field-hint">{watch('querentName')?.length ?? 0}/80 ký tự · cần ít nhất 2</small>
            {errors.querentName && <small id="querent-name-error" className="field-error" role="alert">{errors.querentName.message}</small>}
          </div>
          <div className="personal-field">
            <label htmlFor="querentBirthDate">NGÀY SINH CỦA BẠN</label>
            <input id="querentBirthDate" type="date" autoComplete="bday" required min="1900-01-01" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(errors.querentBirthDate)} aria-describedby={errors.querentBirthDate ? "querent-birthdate-error querent-birthdate-hint" : "querent-birthdate-hint"} {...register('querentBirthDate')} />
            <small id="querent-birthdate-hint" className="field-hint">Chọn ngày từ 01/01/1900 đến hôm nay.</small>
            {errors.querentBirthDate && <small id="querent-birthdate-error" className="field-error" role="alert">{errors.querentBirthDate.message}</small>}
          </div>
          <div className="personal-field">
            <label htmlFor="querentGender">GIỚI TÍNH <span>(BẠN CÓ THỂ BỎ QUA)</span></label>
            <select id="querentGender" aria-describedby="querent-gender-hint" {...register('querentGender')}>
              <option value="">Chọn nếu bạn muốn</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
              <option value="PREFER_NOT_TO_SAY">Không muốn chia sẻ</option>
            </select>
            <small id="querent-gender-hint" className="field-hint">Không bắt buộc.</small>
          </div>
          <p className="personal-info-note">Tên gọi và ngày sinh sẽ đi cùng trải bài trong không gian riêng của bạn. Chỉ chia sẻ điều bạn thấy thoải mái.</p>
        </fieldset>
        <label htmlFor="question">ĐIỀU BẠN MUỐN NHÌN RÕ HƠN</label>
        <textarea id="question" rows={4} required minLength={8} maxLength={1000} aria-invalid={Boolean(errors.question)} aria-describedby="question-feedback" placeholder="Ví dụ: Mình có thể làm gì để tìm lại cảm hứng trong công việc?" {...register('question')} />
        <div className="field-meta" id="question-feedback"><span className={errors.question ? 'field-error' : ''} aria-live="polite">{errors.question?.message ?? 'Viết từ 8 đến 1.000 ký tự; câu hỏi và trải bài chỉ mình bạn xem được.'}</span><span>{watch('question')?.length ?? 0}/1000</span></div>
        <fieldset className="question-suggestions">
          <legend>CÂU HỎI GỢI Ý</legend>
          <div className="question-suggestion-list">
            {questionSuggestions.map((suggestion) => <button
              className={`question-suggestion ${watch('question') === suggestion.question ? 'question-suggestion-selected' : ''}`}
              type="button"
              key={suggestion.topic}
              aria-pressed={watch('question') === suggestion.question}
              onClick={() => {
                setValue('question', suggestion.question, { shouldDirty: true, shouldValidate: true });
                setValue('topic', suggestion.topic, { shouldDirty: true });
              }}
            ><span>{topics.find((topic) => topic.value === suggestion.topic)?.label}</span><strong>{suggestion.question}</strong></button>)}
          </div>
        </fieldset>
        <fieldset className="topic-field"><legend>ĐIỀU BẠN MUỐN LẮNG NGHE</legend><Controller control={control} name="topic" render={({ field }) => <div className="topic-options">{topics.map(({ value, label, icon: Icon }) => <button type="button" key={value} className={`topic-option ${field.value === value ? 'topic-selected' : ''}`} onClick={() => field.onChange(value)} aria-pressed={field.value === value}><Icon size={16} /><span>{label}</span></button>)}</div>} /></fieldset>
        <button className="button form-next" type="button" onClick={async () => { if (await trigger(['querentName', 'querentBirthDate', 'question', 'topic'])) setStep(2); }}>
          Tiếp tục <ArrowRight size={16} />
        </button>
      </div> : <div className="form-panel spread-panel">
        <fieldset><legend>BẠN MUỐN LẮNG NGHE BAO NHIÊU LÁ?</legend><Controller control={control} name="spreadType" render={({ field }) => <div className="spread-options">{spreads.map((spread) => <button type="button" key={spread.value} className={`spread-option ${field.value === spread.value ? 'spread-selected' : ''}`} onClick={() => field.onChange(spread.value)} aria-pressed={field.value === spread.value}><span className="spread-count">{spread.count} LÁ</span><span className="spread-glyph">{spread.glyph}</span><strong>{spread.name}</strong><small>{spread.description}</small><span className="spread-radio" /></button>)}</div>} /></fieldset>
        <div className="spread-note"><Sparkles size={17} /><p>Những lá bài sẽ lần lượt xuất hiện. Hãy ngắm nhìn chúng trước khi mở lời gợi ý.</p></div>
        {mutation.isError && <p className="form-alert" role="alert">{getApiError(mutation.error)}</p>}
        <div className="form-actions"><button className="button button-ghost" type="button" onClick={() => setStep(1)}>← Quay lại</button><button className="button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Đang xáo bài...' : 'Rút bài'} {!mutation.isPending && <Sparkles size={15} />}</button></div>
        <small className="submit-caption">{selectedSpread === 'ONE_CARD' ? 'Một lá · Một lời nhắn' : selectedSpread === 'THREE_CARDS' ? 'Ba lá · Một hành trình' : 'Năm lá · Bức tranh rộng hơn'}</small>
      </div>}
    </form>
    <div className="privacy-note">✦ <span>Không gian riêng</span> · {user ? 'Trải bài được lưu trong lịch sử tài khoản của bạn.' : 'Bạn có thể bắt đầu ngay, chưa cần tài khoản. Đăng nhập để lưu lịch sử và tiếp tục ở nơi khác.'}</div>
  </section>;
}
