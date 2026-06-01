import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SessionModal } from './SessionModal';
import { SidebarProvider } from '@/contexts/SidebarContext';

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-on-surface flex">
        <Sidebar />
        <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen main-gradient max-w-[100vw] lg:max-w-[calc(100vw-240px)]">
          <Outlet />
        </div>
        <SessionModal />
      </div>
    </SidebarProvider>
  );
}
