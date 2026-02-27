import { useEffect, useState } from 'react';
import { Clock, TrendingUp, Target, Zap } from 'lucide-react';
import { StatCard } from './StatCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import * as api from '../api';
import { categoryColors } from '../constants';
import type { DailyStats } from '../types';

const TODAY = '2026-02-05';

export function Dashboard() {
  const navigate = useNavigate();
  const [daily, setDaily]   = useState<DailyStats | null>(null);
  const [weekly, setWeekly] = useState<DailyStats[]>([]);

  useEffect(() => {
    api.getDailyStats(TODAY).then(setDaily);
    api.getWeeklyStats().then(setWeekly);
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0] as { name: string; value: number };
    const color = categoryColors[name] ?? '#e5e7eb';
    return (
      <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
        <div style={{ color }}>{name}</div>
        <div style={{ color: '#e5e7eb', marginTop: 2 }}>{formatTime(value)}</div>
      </div>
    );
  };

  if (!daily) {
    return <div className="flex-1 bg-[#0a0a0f] flex items-center justify-center"><p className="text-gray-500 text-sm">Loading...</p></div>;
  }

  const pieData = Object.entries(daily.categoryTotals)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const weeklyBarData = weekly.map((d) => ({
    day: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    Work:          d.categoryTotals.Work,
    Study:         d.categoryTotals.Study,
    Entertainment: d.categoryTotals.Entertainment,
    Communication: d.categoryTotals.Communication,
  }));

  const productiveTime = daily.categoryTotals.Work + daily.categoryTotals.Study;
  const mostUsed = daily.topApps[0]?.appName ?? '—';

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(TODAY + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
              This Week
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <StatCard title="Productive Time" value={formatTime(productiveTime)} icon={Clock}      trend={{ value: '12%', isPositive: true }} color="indigo"  />
          <StatCard title="Focus Score"     value={`${daily.focusScore}%`}      icon={Target}     trend={{ value: '5%',  isPositive: true }} color="green"   />
          <StatCard title="Most Used"       value={mostUsed}                    icon={TrendingUp}                                           color="purple"  />
          <StatCard title="Longest Session" value={formatTime(daily.longestSession)} icon={Zap}  trend={{ value: '20m', isPositive: true }} color="orange"  />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6">
          {/* Today's Distribution */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Today's Distribution</h2>
            <p className="text-xs text-gray-500 mb-3">Click on a segment to view details</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90} dataKey="value" stroke="none"
                  onClick={() => navigate('/activity')} cursor="pointer"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={categoryColors[entry.name]} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip content={renderPieTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Activity */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Weekly Activity</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatTime(v)}
                  contentStyle={{ backgroundColor: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                <Bar dataKey="Work"          stackId="a" fill={categoryColors.Work}          radius={[0,0,0,0]} />
                <Bar dataKey="Study"         stackId="a" fill={categoryColors.Study}         radius={[0,0,0,0]} />
                <Bar dataKey="Entertainment" stackId="a" fill={categoryColors.Entertainment} radius={[0,0,0,0]} />
                <Bar dataKey="Communication" stackId="a" fill={categoryColors.Communication} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Applications */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Applications</h2>
          <div className="space-y-3">
            {daily.topApps.map((app, i) => {
              const percentage = daily.totalTime > 0 ? (app.duration / daily.totalTime) * 100 : 0;
              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColors[app.category] }} />
                      <span className="text-sm font-medium text-white">{app.appName}</span>
                      <span className="text-xs text-gray-500">{app.category}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400">{formatTime(app.duration)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: categoryColors[app.category] }} />
                    </div>
                    <span className="text-xs text-gray-600 w-10 text-right">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
