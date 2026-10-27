import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Heart,
  Layers,
  LayoutDashboard,
  MoonStar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '../components/common/LoadingState';
import { adminApi, getApiError } from '../services/api';
import type { Topic, SpreadType } from '../types/api';
import './admin-dashboard.css';

const topicConfig: Record<Topic, { label: string; icon: typeof Heart; fillClass: string; pillClass: string }> = {
  LOVE: { label: 'Tình cảm & Mối quan hệ', icon: Heart, fillClass: 'fill-love', pillClass: 'love' },
  CAREER: { label: 'Sự nghiệp & Công danh', icon: Briefcase, fillClass: 'fill-career', pillClass: 'career' },
  FINANCE: { label: 'Tài chính & Tài lộc', icon: Coins, fillClass: 'fill-finance', pillClass: 'finance' },
  PERSONAL_GROWTH: { label: 'Phát triển bản thân', icon: Compass, fillClass: 'fill-growth', pillClass: 'growth' },
  GENERAL: { label: 'Tổng quan cuộc sống', icon: MoonStar, fillClass: 'fill-general', pillClass: 'general' },
};

const spreadConfig: Record<SpreadType, { label: string; sub: string; fillClass: string }> = {
  ONE_CARD: { label: '1 Lá (Hiện tại / Thông điệp ngày)', sub: 'Chiêm nghiệm ngắn gọn & trực diện', fillClass: 'fill-spread-1' },
  THREE_CARDS: { label: '3 Lá (Quá khứ - Hiện tại - Tương lai)', sub: 'Dòng chảy thời gian & bối cảnh', fillClass: 'fill-spread-3' },
  FIVE_CARDS: { label: '5 Lá (Khám phá toàn cảnh sâu sắc)', sub: 'Đa chiều & lời khuyên hành động', fillClass: 'fill-spread-5' },
};

const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'system'>('overview');
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
    refetchInterval: 60_000,
  });

  const ingestMutation = useMutation({
    mutationFn: adminApi.ingestKnowledge,
    onSuccess: async (data) => {
      toast.success(`Đồng bộ thành công! Đã nạp ${data.documents} tài liệu và ${data.chunks} đoạn tri thức.`);
      await client.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => {
      toast.error(getApiError(err));
    },
  });

  const reindexMutation = useMutation({
    mutationFn: adminApi.reindexKnowledge,
    onSuccess: async (data) => {
      toast.success(`Làm mới vector RAG thành công! Đã cập nhật ${data.documents} tài liệu, ${data.chunks} đoạn.`);
      await client.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => {
      toast.error(getApiError(err));
    },
  });

  const isBusy = ingestMutation.isPending || reindexMutation.isPending;
  const data = query.data;

  // Calculate highest count for 7-day chart scale
  const maxTrendVal = Math.max(
    ...(data?.dailyTrends?.map((d) => Math.max(d.readings, d.aiRequests)) ?? [1]),
    4
  );

  return (
    <div className="dashboard-page admin-dashboard-root">
      <header className="dashboard-welcome admin-welcome">
        <div>
          <span className="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN QUẢN TRỊ</span>
          <h1>
            Chào mừng trở lại,<br />
            <em>người giữ nhịp.</em>
          </h1>
          <p>Giám sát toàn diện nhịp đập thư viện Mystic Tarot, hiệu năng AI và hành trình cộng đồng.</p>
        </div>

        <div className="admin-dash-header-actions">
          <button
            type="button"
            className="admin-action-btn"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            title="Tải lại dữ liệu mới nhất"
          >
            <RefreshCw size={13} className={query.isFetching ? 'spin-icon' : ''} />
            <span>{query.isFetching ? 'Đang làm mới...' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            className="admin-action-btn btn-primary"
            disabled={isBusy}
            onClick={() => ingestMutation.mutate()}
            title="Đồng bộ ngay tài liệu từ kho lưu trữ"
          >
            <Sparkles size={13} />
            <span>{ingestMutation.isPending ? 'Đang đồng bộ...' : 'Đồng bộ RAG tức thì'}</span>
          </button>
        </div>
      </header>

      {query.isLoading ? (
        <LoadingState label="Đang phân tích và tổng hợp số liệu vận hành..." />
      ) : query.isError ? (
        <ErrorState message={getApiError(query.error)} retry={() => void query.refetch()} />
      ) : data ? (
        <>
          {/* Primary KPI Metrics Grid */}
          <section className="admin-stats-grid-primary" aria-label="Chỉ số chính">
            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon-wrap">
                  <UsersRound size={17} />
                </span>
                <span className="admin-stat-badge badge-green">
                  {data.activeUsers ?? data.users} đang hoạt động
                </span>
              </div>
              <span className="admin-stat-label">Thành viên đăng ký</span>
              <strong className="admin-stat-value">{data.users.toLocaleString('vi-VN')}</strong>
              <small className="admin-stat-sub">
                {data.newUsersThisWeek > 0
                  ? `+${data.newUsersThisWeek} tài khoản mới tuần này`
                  : `${data.guests ?? 0} khách trải nghiệm`}
              </small>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon-wrap">
                  <Flame size={17} />
                </span>
                <span className="admin-stat-badge badge-gold">
                  {data.interpretationRate}% đã hoàn tất
                </span>
              </div>
              <span className="admin-stat-label">Trải bài Tarot</span>
              <strong className="admin-stat-value">{data.readings.toLocaleString('vi-VN')}</strong>
              <small className="admin-stat-sub">
                {data.interpretedReadings} đã có lời luận · {data.readingsThisWeek ?? 0} tuần này
              </small>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon-wrap">
                  <BrainCircuit size={17} />
                </span>
                <span className="admin-stat-badge">
                  {data.aiRequestsTotal ?? 0} tổng lượt
                </span>
              </div>
              <span className="admin-stat-label">Hoạt động AI Gemini</span>
              <strong className="admin-stat-value">{data.aiRequestsToday.toLocaleString('vi-VN')}</strong>
              <small className="admin-stat-sub">
                {(data.tokensToday ?? 0).toLocaleString('vi-VN')} tokens dùng hôm nay
              </small>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon-wrap">
                  <Database size={17} />
                </span>
                <span className="admin-stat-badge badge-green">
                  {data.readyDocs ?? data.documents} sẵn sàng
                </span>
              </div>
              <span className="admin-stat-label">Kho tri thức RAG</span>
              <strong className="admin-stat-value">{data.documents.toLocaleString('vi-VN')}</strong>
              <small className="admin-stat-sub">
                {data.chunks.toLocaleString('vi-VN')} đoạn vector · {data.cards} lá Tarot
              </small>
            </article>
          </section>

          {/* Interactive Navigation Tabs */}
          <nav className="admin-tab-nav" aria-label="Phân mục bảng điều khiển">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={15} />
              <span>Tổng quan & Xu hướng</span>
            </button>

            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Activity size={15} />
              <span>Dòng hoạt động gần đây</span>
              <span className="tab-count">{data.recentReadings?.length ?? 0}</span>
            </button>

            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              <ShieldCheck size={15} />
              <span>Tình trạng Hệ thống & RAG</span>
            </button>
          </nav>

          {/* Tab 1: Overview & Analytics */}
          {activeTab === 'overview' && (
            <>
              {/* 7-Day Trend Chart & Spreads */}
              <div className="admin-grid-2col">
                <section className="admin-panel">
                  <div className="admin-panel-head">
                    <div>
                      <h3>Xu hướng trải bài 7 ngày qua</h3>
                      <span>Theo dõi lượt mở quẻ và yêu cầu AI suy ngẫm theo thời gian thực</span>
                    </div>
                  </div>

                  <div className="admin-chart-wrap">
                    <div className="admin-chart-legend">
                      <div className="legend-item">
                        <span className="legend-dot readings" />
                        <span>Trải bài ({data.readingsThisWeek ?? 0} tuần này)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot ai" />
                        <span>Lượt gọi AI ({data.aiRequestsToday} hôm nay)</span>
                      </div>
                    </div>

                    <div className="admin-bar-chart">
                      {data.dailyTrends?.map((item) => {
                        const readingHeight = Math.max((item.readings / maxTrendVal) * 100, 4);
                        const aiHeight = Math.max((item.aiRequests / maxTrendVal) * 100, 4);

                        return (
                          <div key={item.date} className="chart-bar-col">
                            <div className="chart-bar-tooltip">
                              <strong>{item.date}</strong>
                              <div>Trải bài: {item.readings}</div>
                              <div>Gọi AI: {item.aiRequests}</div>
                            </div>
                            <div className="chart-bar-group">
                              <div
                                className="chart-bar bar-readings"
                                style={{ height: `${readingHeight}%` }}
                                title={`Trải bài: ${item.readings}`}
                              />
                              <div
                                className="chart-bar bar-ai"
                                style={{ height: `${aiHeight}%` }}
                                title={`Lượt AI: ${item.aiRequests}`}
                              />
                            </div>
                            <span className="chart-bar-label">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Spread Type Distribution */}
                <section className="admin-panel">
                  <div className="admin-panel-head">
                    <div>
                      <h3>Kiểu trải bài được chọn</h3>
                      <span>Tỉ lệ các trải bài theo mức độ đào sâu</span>
                    </div>
                    <Layers size={17} color="var(--gold)" />
                  </div>

                  <div className="admin-dist-list">
                    {data.spreadBreakdown?.map((spread) => {
                      const conf = spreadConfig[spread.spreadType] ?? {
                        label: spread.spreadType,
                        sub: '',
                        fillClass: 'fill-spread-1',
                      };
                      return (
                        <div key={spread.spreadType} className="admin-dist-item">
                          <div className="admin-dist-header">
                            <span className="dist-name">
                              <strong>{conf.label}</strong>
                            </span>
                            <span className="dist-numbers">
                              <strong>{spread.count}</strong> lượt ({spread.percentage}%)
                            </span>
                          </div>
                          <div className="dist-progress-track">
                            <div
                              className={`dist-progress-fill ${conf.fillClass}`}
                              style={{ width: `${spread.percentage}%` }}
                            />
                          </div>
                          <small style={{ color: '#8c8596', fontSize: '10px' }}>{conf.sub}</small>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Topic Distribution */}
              <section className="admin-panel" style={{ marginBottom: '24px' }}>
                <div className="admin-panel-head">
                  <div>
                    <h3>Phân bố chủ đề vấn đáp</h3>
                    <span>Những khía cạnh cuộc sống được người dùng quan tâm chiêm nghiệm nhiều nhất</span>
                  </div>
                </div>

                <div className="admin-dist-list">
                  {data.topicBreakdown?.map((topicItem) => {
                    const conf = topicConfig[topicItem.topic] ?? {
                      label: topicItem.topic,
                      icon: MoonStar,
                      fillClass: 'fill-general',
                      pillClass: 'general',
                    };
                    const Icon = conf.icon;

                    return (
                      <div key={topicItem.topic} className="admin-dist-item">
                        <div className="admin-dist-header">
                          <span className="dist-name">
                            <Icon size={14} />
                            <span>{conf.label}</span>
                          </span>
                          <span className="dist-numbers">
                            <strong>{topicItem.count.toLocaleString('vi-VN')}</strong> lượt hỏi ({topicItem.percentage}%)
                          </span>
                        </div>
                        <div className="dist-progress-track">
                          <div
                            className={`dist-progress-fill ${conf.fillClass}`}
                            style={{ width: `${topicItem.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* Tab 2: Live Activity Feed */}
          {activeTab === 'activity' && (
            <div className="admin-grid-2col">
              {/* Recent Readings List */}
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <h3>Trải bài vừa thực hiện</h3>
                    <span>Các phiên mở bài mới nhất từ người dùng</span>
                  </div>
                  <Clock size={16} color="var(--gold)" />
                </div>

                {data.recentReadings?.length ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Người hỏi</th>
                          <th>Chủ đề</th>
                          <th>Câu hỏi</th>
                          <th>Trạng thái</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentReadings.map((reading) => {
                          const topic = topicConfig[reading.topic] ?? {
                            label: reading.topic,
                            pillClass: 'general',
                          };
                          return (
                            <tr key={reading.id}>
                              <td style={{ whiteSpace: 'nowrap', color: '#8c8596', fontSize: '11px' }} title={dateTimeFormat.format(new Date(reading.createdAt))}>
                                {formatTimeAgo(reading.createdAt)}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <strong>{reading.querentName || reading.user?.displayName || 'Khách'}</strong>
                              </td>
                              <td>
                                <span className={`topic-pill ${topic.pillClass}`}>
                                  {topic.label.split(' ')[0]}
                                </span>
                              </td>
                              <td>
                                <span className="table-text-truncate" title={reading.question}>
                                  {reading.question}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`admin-stat-badge ${
                                    reading.status === 'INTERPRETED' ? 'badge-green' : ''
                                  }`}
                                >
                                  {reading.status === 'INTERPRETED' ? 'Đã luận giải' : 'Đang rút lá'}
                                </span>
                              </td>
                              <td>
                                <Link
                                  to={`/reading/${reading.id}`}
                                  className="admin-action-btn"
                                  style={{ padding: '4px 8px', fontSize: '10px' }}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink size={11} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <p>Chưa có trải bài nào gần đây.</p>
                  </div>
                )}
              </section>

              {/* Recent Users & AI Requests */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section className="admin-panel">
                  <div className="admin-panel-head">
                    <div>
                      <h3>Thành viên mới gia nhập</h3>
                      <span>Người dùng đăng ký tài khoản gần đây</span>
                    </div>
                    <Link to="/admin/users" className="admin-action-btn" style={{ padding: '4px 10px' }}>
                      Xem tất cả <ArrowRight size={12} />
                    </Link>
                  </div>

                  {data.recentUsers?.length ? (
                    <table className="admin-data-table">
                      <tbody>
                        {data.recentUsers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="table-user-cell">
                                <span className="user-avatar-sm">
                                  {user.displayName.trim().charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <strong style={{ display: 'block', fontSize: '12px' }}>
                                    {user.displayName}
                                  </strong>
                                  <small style={{ color: '#8c8596', fontSize: '10px' }}>{user.email}</small>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '11px', color: '#8c8596' }}>
                                {user._count?.readings ?? 0} trải bài
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="dashboard-empty">
                      <p>Chưa có thành viên đăng ký mới.</p>
                    </div>
                  )}
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-head">
                    <div>
                      <h3>Lượt gọi AI mới nhất</h3>
                      <span>Tokens tiêu thụ qua các phiên luận giải</span>
                    </div>
                    <Zap size={15} color="var(--gold)" />
                  </div>

                  {data.recentAiUsage?.length ? (
                    <table className="admin-data-table">
                      <tbody>
                        {data.recentAiUsage.map((usage) => (
                          <tr key={usage.id}>
                            <td>
                              <strong style={{ color: '#c7aef5', fontSize: '11px' }}>
                                {usage.modelName}
                              </strong>
                              <small style={{ display: 'block', color: '#8c8596', fontSize: '10px' }}>
                                {usage.user?.displayName || 'Người dùng ẩn'}
                              </small>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', color: '#eee' }}>
                                {((usage.promptTokens ?? 0) + (usage.outputTokens ?? 0)).toLocaleString('vi-VN')}
                              </span>
                              <small style={{ display: 'block', color: '#8c8596', fontSize: '9px' }}>tokens</small>
                            </td>
                            <td style={{ textAlign: 'right', color: '#8c8596', fontSize: '10px' }} title={dateTimeFormat.format(new Date(usage.createdAt))}>
                              {formatTimeAgo(usage.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="dashboard-empty">
                      <p>Chưa có lượt gọi AI nào hôm nay.</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* Tab 3: System Health & RAG */}
          {activeTab === 'system' && (
            <>
              <section className="system-status-grid" aria-label="Tình trạng dịch vụ">
                <article className="system-status-card">
                  <div className="status-card-top">
                    <span className="status-indicator">
                      <span className="status-dot" />
                      Google Gemini AI
                    </span>
                    <Cpu size={16} color="#34d399" />
                  </div>
                  <strong>Mô hình: {data.systemHealth?.geminiModel || 'gemini-3.5-flash-lite'}</strong>
                  <small>
                    Cấu hình kết nối API sẵn sàng. Giới hạn {data.systemHealth?.dailyLimitPerUser || 8} lượt/ngày cho mỗi thành viên.
                  </small>
                </article>

                <article className="system-status-card">
                  <div className="status-card-top">
                    <span className="status-indicator">
                      <span className="status-dot" />
                      RAG Vector Engine
                    </span>
                    <Database size={16} color="#34d399" />
                  </div>
                  <strong>
                    {data.systemHealth?.embeddingModel || 'gemini-embedding-001'} ({data.systemHealth?.dimension || 768}D)
                  </strong>
                  <small>
                    {data.chunks} đoạn tri thức đã lập vector chỉ mục, hỗ trợ trích dẫn ngữ cảnh chính xác cho lời luận giải.
                  </small>
                </article>

                <article className="system-status-card">
                  <div className="status-card-top">
                    <span className="status-indicator">
                      <span className="status-dot" />
                      Cơ sở dữ liệu SQLite & Prisma
                    </span>
                    <CheckCircle2 size={16} color="#34d399" />
                  </div>
                  <strong>Hoạt động tối ưu</strong>
                  <small>
                    Lưu trữ trọn vẹn lịch sử trải bài, phiên đăng nhập, kho lá bài Tarot và nhật ký token AI.
                  </small>
                </article>
              </section>

              {/* Quick Actions Panel */}
              <section className="admin-panel" style={{ marginBottom: '24px' }}>
                <div className="admin-panel-head">
                  <div>
                    <h3>Thao tác quản trị nhanh</h3>
                    <span>Lối tắt điều hành các phân hệ quan trọng trong hệ thống</span>
                  </div>
                </div>

                <div className="quick-links-grid">
                  <Link to="/admin/knowledge" className="quick-link-box">
                    <span className="quick-link-icon">
                      <Database size={16} />
                    </span>
                    <div>
                      <strong>Kho tri thức Tarot</strong>
                      <small>Thêm tài liệu, quản lý và đồng bộ RAG</small>
                    </div>
                    <ArrowRight size={14} color="#8c8596" />
                  </Link>

                  <Link to="/admin/users" className="quick-link-box">
                    <span className="quick-link-icon">
                      <UsersRound size={16} />
                    </span>
                    <div>
                      <strong>Quản lý thành viên</strong>
                      <small>Tìm kiếm, phân quyền & vô hiệu hóa</small>
                    </div>
                    <ArrowRight size={14} color="#8c8596" />
                  </Link>

                  <button
                    type="button"
                    className="quick-link-box"
                    style={{ textAlign: 'left', cursor: 'pointer', background: 'none' }}
                    disabled={isBusy}
                    onClick={() => reindexMutation.mutate()}
                  >
                    <span className="quick-link-icon">
                      <RefreshCw size={16} className={reindexMutation.isPending ? 'spin-icon' : ''} />
                    </span>
                    <div>
                      <strong>Lập lại chỉ mục RAG</strong>
                      <small>{reindexMutation.isPending ? 'Đang xử lý...' : 'Tính toán lại toàn bộ vector embeddings'}</small>
                    </div>
                    <Sparkles size={14} color="#8c8596" />
                  </button>

                  <Link to="/library" className="quick-link-box" target="_blank" rel="noreferrer">
                    <span className="quick-link-icon">
                      <BookOpen size={16} />
                    </span>
                    <div>
                      <strong>Thư viện 78 lá Tarot</strong>
                      <small>Xem bộ bài Ẩn Chính & Ẩn Phụ trên giao diện người dùng</small>
                    </div>
                    <ExternalLink size={14} color="#8c8596" />
                  </Link>

                  <Link to="/reading" className="quick-link-box" target="_blank" rel="noreferrer">
                    <span className="quick-link-icon">
                      <Sparkles size={16} />
                    </span>
                    <div>
                      <strong>Thử nghiệm trải bài</strong>
                      <small>Mở phiên rút bài mới kiểm tra thuật toán</small>
                    </div>
                    <ExternalLink size={14} color="#8c8596" />
                  </Link>

                  <Link to="/history" className="quick-link-box" target="_blank" rel="noreferrer">
                    <span className="quick-link-icon">
                      <Clock size={16} />
                    </span>
                    <div>
                      <strong>Lịch sử trải bài công khai</strong>
                      <small>Xem danh sách trải bài đã thực hiện</small>
                    </div>
                    <ExternalLink size={14} color="#8c8596" />
                  </Link>
                </div>
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
