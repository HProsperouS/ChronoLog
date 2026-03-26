import { useEffect, useMemo, useState } from 'react';
import { Clock, TrendingUp, Target, Zap } from 'lucide-react';
import { StatCard } from './StatCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import * as api from '../api';
import { getCategoryColor } from '../constants';
import { todayStr, formatDuration, addDaysYmd, startOfWeekMonday, endOfWeekSunday, formatCalendarWeekRange } from '../utils';
import type { DailyStats } from '../types';

/** Trend badge: % change vs yesterday (higher curr = positive arrow). */
function trendVsYesterday(curr: number, prev: number): { value: string; isPositive: boolean } | undefined {
  const c = Number(curr);
  const p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return undefined;
  if (c === 0 && p === 0) return undefined;
  if (p === 0) return c > 0 ? { value: 'new', isPositive: true } : undefined;
  const pct = ((c - p) / p) * 100;
  if (!Number.isFinite(pct)) return undefined;
  return { value: `${Math.abs(Math.round(pct))}%`, isPositive: pct >= 0 };
}

const BUILT_IN_CATEGORY_ORDER = [
  'Work',
  'Study',
  'Entertainment',
  'Communication',
  'Utilities',
  'ChronoLog',
  'Uncategorized',
] as const;

function colorFromCategoryName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 60% 55%)`;
}

function getDashboardCategoryColor(category: string): string {
  if (category === 'Other') return '#9ca3af';
  const resolved = getCategoryColor(category);
  return resolved ?? colorFromCategoryName(category);
}

export function Dashboard() {
  const navigate = useNavigate();
  const [daily, setDaily]             = useState<DailyStats | null>(null);
  const [yesterdayDaily, setYesterdayDaily] = useState<DailyStats | null>(null);
  const [weekly, setWeekly]           = useState<DailyStats[]>([]);

  useEffect(() => {
    const fetch = () => {
      const today = todayStr();
      const yest  = addDaysYmd(today, -1);
      const weekStart = startOfWeekMonday(today);
      const weekEnd = endOfWeekSunday(weekStart);
      void Promise.all([
        api.getDailyStats(today),
        api.getDailyStats(yest).catch(() => null),
        api.getWeeklyStatsRange(weekStart, weekEnd),
      ]).then(([d, y, w]) => {
        setDaily(d);
        setYesterdayDaily(y);
        setWeekly(w);
      });
    };
    fetch();
    const timer = setInterval(fetch, 30_000);
    return () => clearInterval(timer);
  }, []);

    const weeklyCategoryMeta = useMemo(() => {
      const totals = new Map<string, number>();

      for (const day of weekly) {
        for (const [category, minutes] of Object.entries(day.categoryTotals ?? {})) {
          const safeMinutes = minutes ?? 0;
          totals.set(category, (totals.get(category) ?? 0) + safeMinutes);
        }
      }

    const sortedCategories = Array.from(totals.entries())
      .filter(([, minutes]) => minutes > 0)
      .sort((a, b) => {
        const aBuiltInIndex = BUILT_IN_CATEGORY_ORDER.indexOf(a[0] as (typeof BUILT_IN_CATEGORY_ORDER)[number]);
        const bBuiltInIndex = BUILT_IN_CATEGORY_ORDER.indexOf(b[0] as (typeof BUILT_IN_CATEGORY_ORDER)[number]);

        const aIsBuiltIn = aBuiltInIndex !== -1;
        const bIsBuiltIn = bBuiltInIndex !== -1;

        if (aIsBuiltIn && bIsBuiltIn) return aBuiltInIndex - bBuiltInIndex;
        if (aIsBuiltIn) return -1;
        if (bIsBuiltIn) return 1;

        return b[1] - a[1];
      });

    const MAX_VISIBLE_CATEGORIES = 6;
    const visibleCategories = sortedCategories.slice(0, MAX_VISIBLE_CATEGORIES).map(([category]) => category);
    const hiddenCategories = sortedCategories.slice(MAX_VISIBLE_CATEGORIES).map(([category]) => category);

    return {
      visibleCategories,
      hiddenCategories,
    };
  }, [weekly]);

  const renderPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0] as { name: string; value: number };
    const color = getDashboardCategoryColor(name);
    return (
      <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
        <div style={{ color }}>{name}</div>
        <div style={{ color: '#e5e7eb', marginTop: 2 }}>{formatDuration(value)}</div>
      </div>
    );
  };

  if (!daily) {
    return <div className="flex-1 bg-[#0a0a0f] flex items-center justify-center"><p className="text-gray-500 text-sm">Loading...</p></div>;
  }

  const weekStart = startOfWeekMonday(todayStr());
  const weekEnd = endOfWeekSunday(weekStart);
  const calendarWeekLabel = formatCalendarWeekRange(weekStart, weekEnd);

  const pieData = (() => {
    const MAX_VISIBLE_CATEGORIES = 6;

    const sorted = Object.entries(daily.categoryTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const visible = sorted.slice(0, MAX_VISIBLE_CATEGORIES);
    const hidden = sorted.slice(MAX_VISIBLE_CATEGORIES);

    const otherValue = hidden.reduce((sum, [, value]) => sum + value, 0);

    const combined = otherValue > 0
      ? [...visible, ['Other', otherValue] as [string, number]]
      : visible;

    return combined.map(([name, value]) => ({
      name,
      value,
      percent: daily.totalTime > 0 ? (value / daily.totalTime) * 100 : 0,
    }));
  })();

  const weeklyBarData = [...weekly]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const row: Record<string, string | number> = {
        day: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      };

      for (const category of weeklyCategoryMeta.visibleCategories) {
        row[category] = d.categoryTotals?.[category] ?? 0;
      }

      if (weeklyCategoryMeta.hiddenCategories.length > 0) {
        row.Other = weeklyCategoryMeta.hiddenCategories.reduce(
          (sum, category) => sum + (d.categoryTotals?.[category] ?? 0),
          0
        );
      }

      return row;
    });

  console.log('[Dashboard] weekly', weekly);
  console.log('[Dashboard] weeklyCategoryMeta', weeklyCategoryMeta);
  console.log('[Dashboard] weeklyBarData', weeklyBarData);

  const productiveTime = (daily.categoryTotals.Work ?? 0) + (daily.categoryTotals.Study ?? 0);
  const mostUsed = daily.topApps[0]?.appName ?? '—';

  function trendWithYesterday(curr: number, prev: number) {
    const t = trendVsYesterday(curr, prev);
    return t ? { ...t, label: 'vs yesterday' as const } : undefined;
  }

  const productiveTrend = yesterdayDaily
    ? trendWithYesterday(
        productiveTime,
        (yesterdayDaily.categoryTotals.Work ?? 0) + (yesterdayDaily.categoryTotals.Study ?? 0),
      )
    : undefined;
  const focusTrend = yesterdayDaily
    ? trendWithYesterday(daily.focusScore, yesterdayDaily.focusScore)
    : undefined;
  const longestTrend = yesterdayDaily
    ? trendWithYesterday(daily.longestSession, yesterdayDaily.longestSession)
    : undefined;


  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
              This Week
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all">
              Export
            </button>
          </div> */}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <StatCard title="Productive Time" value={formatDuration(productiveTime)} icon={Clock}      trend={productiveTrend} color="indigo"  />
          <StatCard title="Focus Score"     value={`${daily.focusScore}%`}      icon={Target}     trend={focusTrend}      color="green"   />
          <StatCard title="Most Used"       value={mostUsed}                    icon={TrendingUp}                                           color="purple"  />
          <StatCard title="Longest Session" value={formatDuration(daily.longestSession)} icon={Zap}  trend={longestTrend}    color="orange"  />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6">
          {/* Today's Distribution */}
          {/* Today's Distribution */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Today's Distribution</h2>
            <p className="text-xs text-gray-500 mb-3">Click on a segment to view details</p>

            <div className="flex items-center gap-6 h-[280px]">
              <div className="flex-1 h-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={false}
                      labelLine={false}
                      dataKey="value"
                      stroke="none"
                      onClick={() => navigate('/activity')}
                      cursor="pointer"
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={getDashboardCategoryColor(entry.name)}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={renderPieTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-56 shrink-0 space-y-2 overflow-y-auto pr-1">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: getDashboardCategoryColor(entry.name) }}
                      />
                      <span className="text-gray-300 truncate">{entry.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white font-medium">{Math.round(entry.percent)}%</div>
                      <div className="text-xs text-gray-500">{formatDuration(entry.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Weekly Activity</h2>
            <p className="text-xs text-gray-500 mb-4">{calendarWeekLabel}</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    console.log('[Dashboard][Weekly Tooltip]', {
                      label,
                      payload: payload.map((p) => ({
                        name: p.name,
                        dataKey: p.dataKey,
                        value: p.value,
                        color: p.color,
                        payload: p.payload,
                      })),
                    });

                    return (
                      <div className="bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
                        <div className="font-semibold mb-2">{label}</div>
                        {payload.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-4">
                            <span>{String(p.name)}</span>
                            <span>{formatDuration(Number(p.value ?? 0))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                {weeklyCategoryMeta.visibleCategories.map((category, index) => {
                  const isLastVisible =
                    index === weeklyCategoryMeta.visibleCategories.length - 1 &&
                    weeklyCategoryMeta.hiddenCategories.length === 0;

                  return (
                    <Bar
                      key={category}
                      dataKey={category}
                      stackId="a"
                      fill={getDashboardCategoryColor(category)}
                      radius={isLastVisible ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  );
                })}

                {weeklyCategoryMeta.hiddenCategories.length > 0 && (
                  <Bar
                    dataKey="Other"
                    stackId="a"
                    fill="#9ca3af"
                    radius={[4, 4, 0, 0]}
                  />
                )}
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
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getDashboardCategoryColor(app.category) }} />
                      <span className="text-sm font-medium text-white">{app.appName}</span>
                      <span className="text-xs text-gray-500">{app.category}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400">{formatDuration(app.duration)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: getDashboardCategoryColor(app.category) }} />
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
