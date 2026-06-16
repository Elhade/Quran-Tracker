'use client';
import TopModeBar from './TopModeBar';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppShell({ children, hideNav }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f3ef] max-w-[420px] mx-auto relative">
      <TopModeBar />
      <div className="pt-11 pb-20">
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
