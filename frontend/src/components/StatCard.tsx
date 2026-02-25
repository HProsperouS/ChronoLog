import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: string;
}

export function StatCard({ title, value, icon: Icon, trend, color = 'indigo' }: StatCardProps) {
  const colorClasses: Record<string, { gradient: string; iconBg: string; trendBg: string }> = {
    indigo: { 
      gradient: 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20', 
      iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      trendBg: 'bg-indigo-500/10 text-indigo-400'
    },
    green: { 
      gradient: 'from-emerald-500/10 to-green-500/10 border-emerald-500/20', 
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
      trendBg: 'bg-emerald-500/10 text-emerald-400'
    },
    orange: { 
      gradient: 'from-orange-500/10 to-amber-500/10 border-orange-500/20', 
      iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
      trendBg: 'bg-orange-500/10 text-orange-400'
    },
    purple: { 
      gradient: 'from-purple-500/10 to-pink-500/10 border-purple-500/20', 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      trendBg: 'bg-purple-500/10 text-purple-400'
    },
  };

  const colors = colorClasses[color] || colorClasses.indigo;

  return (
    <div className={`bg-[#13131a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${colors.iconBg} p-2.5 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={`${colors.trendBg} px-2 py-0.5 rounded text-xs font-medium`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1.5">{title}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}