import { LayoutDashboard, Activity, Lightbulb, FolderTree, Settings, Clock, Palette } from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/activity', icon: Activity, label: 'Activity' },
    { path: '/insights', icon: Lightbulb, label: 'Insights' },
    { path: '/categories', icon: FolderTree, label: 'Categories' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`w-56 bg-[#0a0a0f] flex flex-col ${className}`}>
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white">ChronoLog</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px] font-medium ${
                    item.special
                      ? 'bg-gradient-to-r from-orange-500/20 to-indigo-500/20 text-orange-300 hover:from-orange-500/30 hover:to-indigo-500/30 border border-orange-500/30'
                      : isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-lg p-3.5">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white mb-0.5">AI Insights</p>
              <p className="text-[10px] text-gray-400 leading-snug">
                Get personalized productivity tips
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}