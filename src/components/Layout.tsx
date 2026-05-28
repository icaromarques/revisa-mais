import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SessionModal } from './SessionModal';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      <Sidebar />
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen main-gradient">
        <Outlet />
      </div>
      <SessionModal />
    </div>
  );
}
