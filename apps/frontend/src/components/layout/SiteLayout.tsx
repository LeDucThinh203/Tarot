import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function SiteLayout() {
  return <><Header /><main className="site-main"><Outlet /></main><Footer /></>;
}
