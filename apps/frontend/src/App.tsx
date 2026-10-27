import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SiteLayout } from './components/layout/SiteLayout';
import { AdminDashboardLayout, UserDashboardLayout } from './components/layout/DashboardLayouts';
import { useAuth } from './contexts/auth-context';
import { MysticCursor } from './components/common/MysticCursor';
import { RavenFlock } from './components/common/RavenFlock';
import { MoonPhase } from './components/common/MoonPhase';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const ReadingPage = lazy(() => import('./pages/ReadingPage').then((module) => ({ default: module.ReadingPage })));
const ReadingResultPage = lazy(() => import('./pages/ReadingResultPage').then((module) => ({ default: module.ReadingResultPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((module) => ({ default: module.LibraryPage })));
const TarotCardPage = lazy(() => import('./pages/LibraryPage').then((module) => ({ default: module.TarotCardPage })));
const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage').then((module) => ({ default: module.UserDashboardPage })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then((module) => ({ default: module.UserProfilePage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminKnowledgePage = lazy(() => import('./pages/AdminKnowledgePage').then((module) => ({ default: module.AdminKnowledgePage })));

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader" role="status">Đang mở trang quản trị...</div>;
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
export default function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><MysticCursor /><RavenFlock /><MoonPhase /><Suspense fallback={<div className="page-loader" role="status">Đang mở cánh cửa...</div>}><Routes>
    <Route element={<SiteLayout />}>
      <Route index element={<HomePage />} /><Route path="library" element={<LibraryPage />} /><Route path="library/:slug" element={<TarotCardPage />} />
      <Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} />
      <Route path="reading" element={<ReadingPage />} /><Route path="reading/:id" element={<ReadingResultPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="history" element={<HistoryPage />} />
        <Route element={<UserDashboardLayout />}>
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="dashboard/readings" element={<HistoryPage />} />
          <Route path="dashboard/profile" element={<UserProfilePage />} />
        </Route>
        <Route element={<AdminRoute />}><Route element={<AdminDashboardLayout />}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/knowledge" element={<AdminKnowledgePage />} />
        </Route></Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></Suspense><Toaster theme="dark" position="bottom-right" toastOptions={{ className: 'mystic-toast' }} /></BrowserRouter></AuthProvider></QueryClientProvider>;
}
