import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MoonStar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/auth-context';
import { getApiError } from '../services/api';

const loginSchema = z.object({ identifier: z.string().trim().min(3, 'Nhập email hoặc tên đăng nhập nhé.').max(254), password: z.string().min(1, 'Hãy nhập mật khẩu nhé.') }).refine((values) => values.identifier.includes('@') ? z.string().email().safeParse(values.identifier).success : /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,38}[a-zA-Z0-9]$/.test(values.identifier), { path: ['identifier'], message: 'Email hoặc tên đăng nhập chưa đúng.' });
const registerSchema = z.object({ displayName: z.string().trim().min(2, 'Tên cần có ít nhất 2 chữ.').max(100).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Tên hiển thị chứa ký tự không hợp lệ.'), username: z.string().trim().toLowerCase().min(3, 'Tên đăng nhập cần ít nhất 3 ký tự.').max(24, 'Tên đăng nhập không được quá 24 ký tự.').regex(/^[a-z0-9][a-z0-9._-]{1,22}[a-z0-9]$/, 'Dùng chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu và kết thúc bằng chữ hoặc số.').refine((value) => !/[._-]{2}/.test(value), 'Không dùng dấu câu liên tiếp.').refine((value) => !['admin', 'administrator', 'guest', 'support', 'system'].includes(value), 'Tên đăng nhập này chưa thể sử dụng.'), email: z.string().trim().toLowerCase().email('Địa chỉ email chưa đúng.').max(254), password: z.string().min(10, 'Mật khẩu cần ít nhất 10 ký tự.').max(72, 'Mật khẩu không được quá 72 ký tự.').refine((value) => new TextEncoder().encode(value).length <= 72, 'Mật khẩu hơi dài, bạn rút gọn một chút nhé.'), passwordConfirm: z.string() }).refine((values) => values.password === values.passwordConfirm, { path: ['passwordConfirm'], message: 'Hai mật khẩu chưa giống nhau.' });

export function LoginPage() {
  const { signIn } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), mode: 'onBlur', reValidateMode: 'onChange' });
  const submit = handleSubmit(async (values) => { try { await signIn(values); toast.success('Chào mừng bạn trở lại.'); navigate(destination, { replace: true }); } catch (error) { setError('root', { message: getApiError(error) }); } });
  return <AuthShell kicker="MỪNG BẠN TRỞ LẠI" title={<>Mỗi lần quay lại,<br /><em>một góc nhìn mới.</em></>}>
    <form className="auth-form" onSubmit={submit} noValidate>
      <label>Email hoặc tên đăng nhập<input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={254} aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? "login-identifier-error" : undefined} placeholder="ten-dang-nhap hoac ban@email.com" {...register('identifier')} />{errors.identifier && <small id="login-identifier-error" className="field-error" role="alert">{errors.identifier.message}</small>}</label>
      <label>Mật khẩu<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={1} maxLength={72} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined} placeholder="Nhập mật khẩu" {...register('password')} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errors.password && <small id="login-password-error" className="field-error" role="alert">{errors.password.message}</small>}</label>
      {errors.root && <p className="form-alert" role="alert">{errors.root.message}</p>}
      <button className="button auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'} <Sparkles size={15} /></button>
      <p className="auth-switch">Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>
    </form>
  </AuthShell>;
}

export function RegisterPage() {
  const { signUp } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [showPassword, setShowPassword] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), mode: 'onBlur', reValidateMode: 'onChange' });
  const submit = handleSubmit(async (form) => { try { await signUp({ displayName: form.displayName, username: form.username, email: form.email, password: form.password }); toast.success('Tài khoản của bạn đã sẵn sàng.'); navigate(destination, { replace: true }); } catch (error) { setError('root', { message: getApiError(error) }); } });
  return <AuthShell kicker="MỘT KHỞI ĐẦU NHẸ NHÀNG" title={<>Tạo một khoảng lặng<br /><em>cho riêng bạn.</em></>}>
    <form className="auth-form" onSubmit={submit} noValidate>
      <label>Bạn muốn mình gọi là gì?<input autoComplete="name" required minLength={2} maxLength={100} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? "register-name-error display-name-hint" : "display-name-hint"} placeholder="Tên bạn muốn được gọi" {...register('displayName')} />{errors.displayName && <small id="register-name-error" className="field-error" role="alert">{errors.displayName.message}</small>}<small id="display-name-hint" className="field-hint">Tên hiển thị dài từ 2 đến 100 ký tự.</small></label>
      <label>Tên đăng nhập<input autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "register-username-error username-hint" : "username-hint"} placeholder="vd: thinh_nguyen" {...register('username')} />{errors.username && <small id="register-username-error" className="field-error" role="alert">{errors.username.message}</small>}<small id="username-hint" className="field-hint">Chỉ dùng chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.</small></label>
      <label>Email<input type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "register-email-error register-email-hint" : "register-email-hint"} placeholder="ban@email.com" {...register('email')} />{errors.email && <small id="register-email-error" className="field-error" role="alert">{errors.email.message}</small>}<small id="register-email-hint" className="field-hint">Bạn có thể dùng email này để đăng nhập.</small></label>
      <label>Mật khẩu<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={10} maxLength={72} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "register-password-error register-password-hint" : "register-password-hint"} placeholder="Ít nhất 10 ký tự" {...register('password')} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errors.password && <small id="register-password-error" className="field-error" role="alert">{errors.password.message}</small>}<small id="register-password-hint" className="field-hint">Dùng ít nhất 10 ký tự; chọn mật khẩu dễ nhớ với bạn.</small></label>
      <label>Nhập lại mật khẩu<input type="password" autoComplete="new-password" required minLength={10} maxLength={72} aria-invalid={Boolean(errors.passwordConfirm)} aria-describedby={errors.passwordConfirm ? "password-confirm-error password-confirm-hint" : "password-confirm-hint"} placeholder="Nhập lại mật khẩu" {...register('passwordConfirm')} />{errors.passwordConfirm && <small id="password-confirm-error" className="field-error" role="alert">{errors.passwordConfirm.message}</small>}<small id="password-confirm-hint" className="field-hint">Nhập lại đúng mật khẩu ở trên.</small></label>
      {errors.root && <p className="form-alert" role="alert">{errors.root.message}</p>}
      <button className="button auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'} <Sparkles size={15} /></button>
      <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </form>
  </AuthShell>;
}

function AuthShell({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return <section className="auth-page section-wrap"><div className="auth-atmosphere"><div className="auth-orb" /><span>✧</span><i>✦</i></div><div className="auth-panel"><span className="auth-emblem"><MoonStar size={19} /></span><span className="section-kicker">{kicker}</span><h1>{title}</h1><p className="auth-intro">Một góc riêng để cất giữ những câu hỏi và lần trải bài của bạn.</p>{children}<small className="auth-privacy">Thông tin của bạn được giữ riêng tư.</small></div></section>;
}
