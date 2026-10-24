import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { AdminDashboardStats, AdminUser, ApiEnvelope, KnowledgeDocument, Reading, ReadingChatMessage, TarotCard, User, UserDashboardStats } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
export const api = axios.create({ baseURL, withCredentials: true, headers: { 'Content-Type': 'application/json' } });
let accessToken: string | null = null;
let refreshFlight: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshFlight) {
    refreshFlight = axios.post<ApiEnvelope<{ accessToken: string }>>(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => { accessToken = data.data.accessToken; return accessToken; })
      .catch(() => { accessToken = null; return null; })
      .finally(() => { refreshFlight = null; });
  }
  return refreshFlight;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});
api.interceptors.response.use((response) => response, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const url = original?.url ?? '';
  if (error.response?.status !== 401 || !original || original._retried || /\/auth\/(login|register|refresh|logout|guest)/.test(url)) throw error;
  original._retried = true;
  const token = await refreshAccessToken();
  if (!token) throw error;
  original.headers.set('Authorization', `Bearer ${token}`);
  return api.request(original);
});

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> { return (await promise).data.data; }

export const authApi = {
  register: (input: { email: string; username: string; password: string; displayName: string }) => unwrap(api.post<ApiEnvelope<{ user: User; accessToken: string }>>('/auth/register', input)),
  login: (input: { identifier: string; password: string }) => unwrap(api.post<ApiEnvelope<{ user: User; accessToken: string }>>('/auth/login', input)),
  guest: () => unwrap(api.post<ApiEnvelope<{ accessToken: string }>>('/auth/guest', {})),
  refresh: () => refreshAccessToken(),
  me: () => unwrap(api.get<ApiEnvelope<User>>('/auth/me')),
  logout: () => api.post('/auth/logout'),
};

export const usersApi = {
  profile: () => unwrap(api.get<ApiEnvelope<User & { createdAt: string }>>('/users/me')),
  dashboard: () => unwrap(api.get<ApiEnvelope<UserDashboardStats>>('/users/me/dashboard')),
  updateProfile: (displayName: string) => unwrap(api.patch<ApiEnvelope<User & { createdAt: string }>>('/users/me', { displayName })),
};

export const adminApi = {
  dashboard: () => unwrap(api.get<ApiEnvelope<AdminDashboardStats>>('/admin/dashboard')),
  users: (params: { page: number; limit: number; search?: string }) => api.get<ApiEnvelope<AdminUser[]>>('/admin/users', { params }),
  updateUser: (id: string, input: { role?: 'USER' | 'ADMIN'; password?: string }) => unwrap(api.patch<ApiEnvelope<AdminUser>>(`/admin/users/${encodeURIComponent(id)}`, input)),
  setUserDisabled: (id: string, disabled: boolean) => unwrap(api.patch<ApiEnvelope<AdminUser>>(`/admin/users/${encodeURIComponent(id)}/status`, { disabled })),
  knowledgeDocuments: (params: { page: number; limit: number }) => api.get<ApiEnvelope<KnowledgeDocument[]>>('/admin/knowledge/documents', { params }),
  createKnowledgeDocument: (input: { title: string; content: string }) => unwrap(api.post<ApiEnvelope<{ document: Omit<KnowledgeDocument, '_count'>; indexedChunks: number }>>('/admin/knowledge/documents', input)),
  ingestKnowledge: () => unwrap(api.post<ApiEnvelope<{ documents: number; chunks: number }>>('/admin/knowledge/ingest')),
  reindexKnowledge: () => unwrap(api.post<ApiEnvelope<{ documents: number; chunks: number }>>('/admin/knowledge/reindex')),
};

export const tarotApi = {
  list: (params: { page?: number; limit?: number; search?: string; arcana?: string }) => api.get<ApiEnvelope<TarotCard[]>>('/tarot-cards', { params }),
  bySlug: async (slug: string) => unwrap(api.get<ApiEnvelope<TarotCard>>(`/tarot-cards/slug/${encodeURIComponent(slug)}`)),
};

export const readingApi = {
  create: async (input: { querentName: string; querentBirthDate: string; querentGender: string; question: string; topic: string; spreadType: string; idempotencyKey: string }) => unwrap(api.post<ApiEnvelope<Reading>>('/readings', input, { headers: { 'Idempotency-Key': input.idempotencyKey } })),
  get: async (id: string) => unwrap(api.get<ApiEnvelope<Reading>>(`/readings/${id}`)),
  interpret: async (id: string) => unwrap(api.post<ApiEnvelope<Reading['interpretation']>>(`/readings/${id}/interpretation`)),
  getChat: async (id: string) => unwrap(api.get<ApiEnvelope<ReadingChatMessage[]>>(`/readings/${id}/chat`)),
  sendChat: async (id: string, content: string) => unwrap(api.post<ApiEnvelope<{ userMessage: ReadingChatMessage; assistantMessage: ReadingChatMessage }>>(`/readings/${id}/chat`, { content })),
  list: (params: { page: number; limit: number; search?: string }) => api.get<ApiEnvelope<Reading[]>>('/readings', { params }),
  remove: (id: string) => api.delete(`/readings/${id}`),
};

const gentleErrorMessages: Record<string, string> = {
  AI_DAILY_LIMIT: 'Hôm nay bạn đã dùng hết lượt xem bài. Hãy quay lại vào ngày mai nhé.',
  AI_QUOTA_EXCEEDED: 'Mình chưa thể gửi lời gợi mở lúc này. Bạn thử lại sau ít phút nhé.',
  AI_TIMEOUT: 'Lời gợi mở cần thêm thời gian. Những lá bạn đã rút vẫn được giữ lại; hãy thử lại sau nhé.',
  AI_NOT_CONFIGURED: 'Mình chưa thể mở lời gợi ý lúc này. Bạn thử lại sau nhé.',
  AI_CONFIGURATION_ERROR: 'Mình chưa thể mở lời gợi ý lúc này. Bạn thử lại sau nhé.',
  AI_REQUEST_REJECTED: 'Mình chưa thể mở lời gợi ý lúc này. Bạn thử lại sau nhé.',
  AI_MODEL_UNAVAILABLE: 'Mình chưa thể mở lời gợi ý lúc này. Bạn thử lại sau nhé.',
  AI_UPSTREAM_ERROR: 'Mình chưa thể mở lời gợi ý lúc này. Bạn thử lại sau nhé.',
  AI_EMPTY_OUTPUT: 'Lời gợi mở chưa sẵn sàng. Bạn thử lại sau nhé.',
  AI_INVALID_OUTPUT: 'Lời gợi mở chưa sẵn sàng. Bạn thử lại sau nhé.',
  AI_CARD_MISMATCH: 'Lời gợi mở chưa sẵn sàng. Bạn thử lại sau nhé.',
  INTERPRETATION_IN_PROGRESS: 'Mình đang lắng nghe trải bài này. Chờ một chút rồi thử lại nhé.',
  READING_NOT_INTERPRETED: 'Mở lời gợi mở trước, rồi bạn có thể hỏi tiếp nhé.',
  GUEST_CHAT_LIMIT: 'Bạn đã dùng hết hai câu hỏi dành cho khách. Đăng nhập hoặc tạo tài khoản để hỏi tiếp nhé.',
  INVALID_CREDENTIALS: 'Email/tên đăng nhập hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.',
  ACCOUNT_IDENTIFIER_TAKEN: 'Email hoặc tên đăng nhập này đã được dùng. Bạn chọn thông tin khác nhé.',
  EMAIL_TAKEN: 'Email này đã có tài khoản. Bạn thử đăng nhập nhé.',
  UNAUTHORIZED: 'Phiên đăng nhập đã khép lại. Hãy đăng nhập lại để tiếp tục nhé.',
  FORBIDDEN: 'Bạn chưa thể mở nội dung này.',
  NOT_FOUND: 'Mình chưa tìm thấy nội dung này. Hãy quay lại rồi thử mở lại nhé.',
  VALIDATION_ERROR: 'Một vài thông tin còn thiếu. Bạn kiểm tra lại nhé.',
  BAD_REQUEST: 'Thông tin chưa đầy đủ. Bạn kiểm tra lại nhé.',
};

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    if (code === 'VALIDATION_ERROR') {
      const details: unknown = error.response?.data?.error?.details;
      if (Array.isArray(details)) {
        const issue = details.find((item): item is { message: string } => Boolean(item) && typeof item === 'object' && 'message' in item && typeof item.message === 'string');
        if (issue) return issue.message;
      }
    }
    if (typeof code === 'string' && gentleErrorMessages[code]) return gentleErrorMessages[code];
    if (!error.response) return 'Mình chưa kết nối được lúc này. Bạn thử lại sau ít phút nhé.';
  }
  return 'Mình chưa thể hoàn thành điều này lúc này. Bạn thử lại sau nhé.';
}
