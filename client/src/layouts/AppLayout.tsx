import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {/* Fixed Sticky Sidebar */}
      <Sidebar />

      {/* Main content viewport */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

