import { Fragment, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, KeyRound, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { adminApi, getApiError } from '../services/api';
import type { AdminUser } from '../types/api';

const dateFormat = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });

export function AdminUsersPage() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<'USER' | 'ADMIN'>('USER');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-users', search, page], queryFn: () => adminApi.users({ page, limit: 15, ...(search ? { search } : {}) }) });
  const users = query.data?.data.data ?? [];
  const meta = query.data?.data.meta;
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: { role?: 'USER' | 'ADMIN'; password?: string } }) => adminApi.updateUser(id, input), onSuccess: async (_account, variables) => { toast.success('Thông tin tài khoản đã được cập nhật. Các phiên đăng nhập cũ đã kết thúc.'); setEditingId(null); setPasswordDraft(''); await client.invalidateQueries({ queryKey: ['admin-users'] }); await client.invalidateQueries({ queryKey: ['admin-dashboard'] }); } });
  const setDisabled = useMutation({ mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => adminApi.setUserDisabled(id, disabled), onSuccess: async (_account, variables) => { toast.success(variables.disabled ? 'Tài khoản đã được vô hiệu hóa.' : 'Tài khoản đã được kích hoạt lại.'); setEditingId(null); await client.invalidateQueries({ queryKey: ['admin-users'] }); await client.invalidateQueries({ queryKey: ['admin-dashboard'] }); } });
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); setSearch(draft.trim()); }
  function openEditor(person: AdminUser) { setEditingId((current) => current === person.id ? null : person.id); setRoleDraft(person.role); setPasswordDraft(''); setPasswordError(''); update.reset(); setDisabled.reset(); }
  function saveAccount(event: FormEvent<HTMLFormElement>, person: AdminUser) {
    event.preventDefault();
    const password = passwordDraft;
    if (password && (password.length < 10 || password.length > 72 || new TextEncoder().encode(password).length > 72)) { setPasswordError('Mật khẩu cần từ 10 đến 72 ký tự và tối đa 72 byte.'); return; }
    setPasswordError('');
    const input: { role?: 'USER' | 'ADMIN'; password?: string } = {};
    if (roleDraft !== person.role) input.role = roleDraft;
    if (password) input.password = password;
    if (!input.role && !input.password) { setPasswordError('Chọn vai trò mới hoặc nhập mật khẩu mới trước khi lưu.'); return; }
    update.mutate({ id: person.id, input });
  }
  function toggleDisabled(person: AdminUser) {
    const disabled = !person.disabledAt;
    const prompt = disabled
      ? `Vô hiệu hóa tài khoản ${person.displayName}? Người này sẽ bị đăng xuất và không thể đăng nhập cho đến khi được kích hoạt lại.`
      : `Kích hoạt lại tài khoản ${person.displayName}?`;
    if (window.confirm(prompt)) setDisabled.mutate({ id: person.id, disabled });
  }
  const busy = update.isPending || setDisabled.isPending;
  return <div className="dashboard-page">
    <header className="dashboard-page-heading"><span className="dashboard-eyebrow">CỘNG ĐỒNG</span><h1>Thành viên <em>Mystic</em></h1><p>Tìm tài khoản, quản lý quyền truy cập và hỗ trợ khôi phục mật khẩu.</p></header>
    <form className="admin-search-form" onSubmit={submitSearch}><label className="search-field"><Search size={16} /><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={100} placeholder="Tìm theo tên, email hoặc tên đăng nhập" aria-label="Tìm thành viên" /><span>{draft.length}/100</span></label><button className="button button-ghost" type="submit">Tìm thành viên</button></form>
    {update.isError || setDisabled.isError ? <p className="form-alert" role="alert">{getApiError(update.error ?? setDisabled.error)}</p> : null}
    {query.isLoading ? <LoadingState label="Đang mở danh sách thành viên..." /> : query.isError ? <ErrorState message={getApiError(query.error)} retry={() => void query.refetch()} /> : users.length ? <>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thành viên</th><th>Tài khoản</th><th>Ngày tham gia</th><th>Trải bài</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>{users.map((person) => <Fragment key={person.id}>
        <tr className={person.disabledAt ? 'admin-user-disabled' : ''}><td><span className="admin-person"><span>{person.displayName.trim().charAt(0).toLocaleUpperCase('vi-VN')}</span><strong>{person.displayName}</strong></span></td><td><span className="admin-account">{person.email}<small>{person.username ? `@${person.username}` : 'Chưa có tên đăng nhập'}</small></span></td><td>{dateFormat.format(new Date(person.createdAt))}</td><td>{person._count.readings}</td><td><span className={`role-chip ${person.role === 'ADMIN' ? 'role-admin' : ''}`}>{person.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}</span></td><td><span className={`account-state ${person.disabledAt ? 'account-state-disabled' : ''}`}>{person.disabledAt ? 'Đã vô hiệu' : 'Đang hoạt động'}</span></td><td><button type="button" className="admin-manage-button" onClick={() => openEditor(person)} aria-expanded={editingId === person.id}>{editingId === person.id ? 'Đóng' : 'Quản lý'}</button></td></tr>
        {editingId === person.id && <tr className="admin-edit-row"><td colSpan={7}><form className="admin-user-editor" onSubmit={(event) => saveAccount(event, person)} noValidate>
          <div className="admin-editor-heading"><ShieldCheck size={17} /><span><strong>Quản lý {person.displayName}</strong><small>Đổi quyền hoặc đặt mật khẩu mới. Thay đổi sẽ kết thúc các phiên đăng nhập hiện tại.</small></span></div>
          <div className="admin-editor-fields"><label htmlFor={`role-${person.id}`}>Vai trò<select id={`role-${person.id}`} value={roleDraft} onChange={(event) => setRoleDraft(event.target.value as 'USER' | 'ADMIN')}><option value="USER">Thành viên</option><option value="ADMIN">Quản trị viên</option></select></label><label htmlFor={`password-${person.id}`}>Mật khẩu mới <small>(không bắt buộc)</small><input id={`password-${person.id}`} type="password" autoComplete="new-password" value={passwordDraft} onChange={(event) => { setPasswordDraft(event.target.value); setPasswordError(''); }} minLength={10} maxLength={72} placeholder="Ít nhất 10 ký tự" /></label></div>
          <small className={passwordError ? 'field-error' : 'field-hint'}>{passwordError || 'Để trống nếu chỉ muốn đổi vai trò.'}</small>
          <div className="admin-editor-actions"><button className="button" type="submit" disabled={busy}>{update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'} <KeyRound size={14} /></button><button className="button button-ghost admin-account-toggle" type="button" disabled={busy} onClick={() => toggleDisabled(person)}>{person.disabledAt ? <><CheckCircle2 size={14} /> Kích hoạt lại</> : <><Ban size={14} /> Vô hiệu hóa</>}</button></div>
        </form></td></tr>}
      </Fragment>)}</tbody></table></div>
      {(meta?.totalPages ?? 0) > 1 && <nav className="admin-pagination" aria-label="Trang thành viên"><span>{meta?.total?.toLocaleString('vi-VN')} thành viên · Trang {page}/{meta?.totalPages}</span><div><button className="button button-ghost" type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trước</button><button className="button button-ghost" type="button" disabled={page >= (meta?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}>Tiếp</button></div></nav>}
    </> : <div className="dashboard-empty"><UsersRound size={23} /><h3>Chưa tìm thấy thành viên</h3><p>Hãy thử tìm bằng một tên hoặc địa chỉ email khác.</p></div>}
  </div>;
}
