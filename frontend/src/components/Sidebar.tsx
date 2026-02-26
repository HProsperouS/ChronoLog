import { LayoutDashboard, Activity, Lightbulb, FolderTree, Settings, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onMobileClose?: () => void;
}

export function Sidebar({ className = '', collapsed = false, onToggle, onMobileClose }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/activity', icon: Activity, label: 'Activity' },
    { path: '/insights', icon: Lightbulb, label: 'Insights' },
    { path: '/categories', icon: FolderTree, label: 'Categories' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div
      className={`
        ${collapsed ? 'w-[64px]' : 'w-56'}
        bg-[#0a0a0f] border-r border-white/5 flex flex-col flex-shrink-0
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      {/* Logo + Toggle */}
      {collapsed ? (
        <div className="flex justify-center py-5">
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 hover:opacity-80 transition-all"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[15px] font-semibold text-white truncate">ChronoLog</h1>
          </div>
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 pt-1 ${collapsed ? '' : 'px-3'}`}>
        <ul className="list-none p-0 m-0 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  className={`
                    flex items-center w-full rounded-lg transition-all text-[13px] font-medium
                    ${collapsed ? 'justify-center py-3' : 'gap-3 px-2 py-2.5'}
                    ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - User profile */}
      {!collapsed && (
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-semibold text-white">
              U
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">
                User Name
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                user@example.com
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
