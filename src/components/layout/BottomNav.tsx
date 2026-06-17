'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2 } from 'lucide-react';
import { useModeStore } from '../../store/useModeStore';

export default function BottomNav() {
  const pathname = usePathname();
  const { getModeColor } = useModeStore();
  const color = getModeColor();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: '/', label: 'Home', icon: Home, matchPath: '/' },
    { href: '/stats', label: 'Stats', icon: BarChart2, matchPath: '/stats' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-50 bg-white/95 backdrop-blur-md border-t border-[#e2ddd6]">
      <div className="flex items-stretch pb-safe">
        {navItems.map(({ href, label, icon: Icon, matchPath }) => {
          const active = isActive(matchPath);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2 pt-2.5 transition-opacity"
            >
              <Icon
                size={22}
                className="transition-colors"
                style={{ color: active ? color : '#9c9890' }}
              />
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? color : '#9c9890' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
