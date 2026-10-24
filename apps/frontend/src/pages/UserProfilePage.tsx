import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleUserRound, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getApiError } from '../services/api';
import { useAuth } from '../contexts/auth-context';

export function UserProfilePage() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [validationError, setValidationError] = useState('');
  const save = useMutation({ mutationFn: updateProfile, onSuccess: () => { setValidationError(''); toast.success('Hồ sơ của bạn đã được cập nhật.'); } });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = displayName.trim();
    if (value.length < 2 || value.length > 100 || /[\u0000-\u001f\u007f]/.test(value)) {
      setValidationError('Tên hiển thị cần từ 2 đến 100 ký tự và không chứa ký tự đặc biệt.');
      return;
    }
    setValidationError('');
    save.mutate(value);
  }
  return <div className="dashboard-page">
    <header className="dashboard-page-heading"><span className="dashboard-eyebrow">THÔNG TIN CỦA BẠN</span><h1>Hồ sơ <em>cá nhân</em></h1><p>Chỉnh sửa cách mình gọi bạn trong những lần trải bài.</p></header>
    <section className="profile-card"><span className="profile-avatar"><CircleUserRound size={24} /></span><div className="profile-identity"><strong>{user?.displayName}</strong><span>{user?.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên Mystic Tarot'}</span></div>
      <form className="profile-form" onSubmit={submit} noValidate>
        <label htmlFor="profile-display-name">Tên hiển thị</label><input id="profile-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required aria-invalid={Boolean(validationError)} aria-describedby="profile-name-hint" />
        <small id="profile-name-hint" className={validationError ? 'field-error' : 'field-hint'}>{validationError || `${displayName.length}/100 ký tự · Ít nhất 2 ký tự`}</small>
        <label htmlFor="profile-email">Email</label><input id="profile-email" value={user?.email ?? ''} readOnly />
        <label htmlFor="profile-username">Tên đăng nhập</label><input id="profile-username" value={user?.username ?? 'Chưa thiết lập'} readOnly />
        <button className="button" type="submit" disabled={save.isPending || displayName.trim() === user?.displayName}>{save.isPending ? 'Đang lưu...' : 'Lưu thay đổi'} <Save size={15} /></button>
        {save.isError && <p className="form-alert" role="alert">{getApiError(save.error)}</p>}
      </form>
    </section>
  </div>;
}
