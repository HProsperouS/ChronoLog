import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse on tablet, auto-expand on desktop
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
      else setCollapsed(false);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close mobile drawer on route change or resize to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setMobileOpen(false);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, inline on desktop */}
      <div className={`
        md:relative md:flex md:flex-shrink-0
        fixed inset-y-0 left-0 z-50
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          collapsed={mobileOpen ? false : collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">ChronoLog</span>
        </div>

        {children}
      </main>
    </div>
  );
}
