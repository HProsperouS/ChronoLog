import { useEffect, useMemo, useState } from 'react';
import { Clock, TrendingUp, Target, Zap } from 'lucide-react';
import { StatCard } from './StatCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import * as api from '../api';
import { categoryColors } from '../constants';
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
  'Deep Work',
  'Study',
  'Communication',
  'Meetings',
  'Admin',
  'Entertainment',
  'Gaming',
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

function getCategoryColor(category: string): string {
  if (category === 'Other') return '#9ca3af';
  return categoryColors[category] ?? colorFromCategoryName(category);
}

export function Dashboard() {
  const navigate = useNavigate();
  const [daily, setDaily] = useState<DailyStats | null>(null);
  const [yesterdayDaily, setYesterdayDaily] = useState<DailyStats | null>(null);
  const [weekly, setWeekly] = useState<DailyStats[]>([]);
  const [pieDate, setPieDate] = useState(todayStr());
  const [pieDaily, setPieDaily] = useState<DailyStats | null>(null);
  const [showAllPieSlices, setShowAllPieSlices] = useState(false);
  const [showWeeklyOtherDetails, setShowWeeklyOtherDetails] = useState(false);


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
        api.getDailyStats(pieDate).catch(() => null),
      ]).then(([d, y, w, p]) => {
        setDaily(d);
        setYesterdayDaily(y);
        setWeekly(w);
        setPieDaily(p);
      });
    };
    fetch();
    const timer = setInterval(fetch, 30_000);
    return () => clearInterval(timer);
  }, [pieDate]);

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
    const color = getCategoryColor(name);
    return (
      <div style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
        <div style={{ color }}>{name}</div>
        <div style={{ color: '#e5e7eb', marginTop: 2 }}>{formatDuration(value)}</div>
      </div>
    );
  };

  if (!daily || !pieDaily) {
    return <div className="flex-1 bg-[#0a0a0f] flex items-center justify-center"><p className="text-gray-500 text-sm">Loading...</p></div>;
  }

  const dailyStats = daily;
  const pieStats = pieDaily;

  const weekStart = startOfWeekMonday(todayStr());
  const weekEnd = endOfWeekSunday(weekStart);
  const calendarWeekLabel = formatCalendarWeekRange(weekStart, weekEnd);

  const pieCategoryMeta = (() => {
    const MIN_VISIBLE_CATEGORIES = 4;
    const MIN_PERCENT_FOR_OWN_SLICE = 0.08; // 8%

    const sorted = Object.entries(pieStats.categoryTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    let visible = sorted.filter(([, value]) =>
      pieStats.totalTime > 0 && (value / pieStats.totalTime) >= MIN_PERCENT_FOR_OWN_SLICE
    );

    if (visible.length < Math.min(MIN_VISIBLE_CATEGORIES, sorted.length)) {
      visible = sorted.slice(0, Math.min(MIN_VISIBLE_CATEGORIES, sorted.length));
    }

    const visibleNames = new Set(visible.map(([name]) => name));
    const hidden = sorted.filter(([name]) => !visibleNames.has(name));

    const otherValue = hidden.reduce((sum, [, value]) => sum + value, 0);

    const summaryPieData = (otherValue > 0
      ? [...visible, ['Other', otherValue] as [string, number]]
      : visible
    ).map(([name, value]) => ({
      name,
      value,
      percent: pieStats.totalTime > 0 ? (value / pieStats.totalTime) * 100 : 0,
    }));

    const fullPieData = sorted.map(([name, value]) => ({
      name,
      value,
      percent: pieStats.totalTime > 0 ? (value / pieStats.totalTime) * 100 : 0,
    }));

    const allLegendItems = sorted.map(([name, value]) => ({
      name,
      value,
      percent: pieStats.totalTime > 0 ? (value / pieStats.totalTime) * 100 : 0,
    }));

    return {
      summaryPieData,
      fullPieData,
      allLegendItems,
    };
  })();

  const activePieData = showAllPieSlices
    ? pieCategoryMeta.fullPieData
    : pieCategoryMeta.summaryPieData;

  const pieLegendItems = pieCategoryMeta.allLegendItems;

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

  const productiveTime = daily.productiveMinutes ?? 0;
  const mostUsed = daily.topApps[0]?.appName ?? '—';

  function trendWithYesterday(curr: number, prev: number) {
    const t = trendVsYesterday(curr, prev);
    return t ? { ...t, label: 'vs yesterday' as const } : undefined;
  }

  const productiveTrend = yesterdayDaily
    ? trendWithYesterday(
        productiveTime,
        yesterdayDaily.productiveMinutes ?? 0,
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
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Distribution</h2>
                <p className="text-xs text-gray-500 mt-1">Choose a day and click a segment to view details</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="date"
                    value={pieDate}
                    min={weekStart}
                    max={weekEnd}
                    onChange={(e) => setPieDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-md border border-white/10 text-gray-300 bg-white/5"
                  />
                  <button
                    type="button"
                    className="px-2.5 py-1 text-xs rounded-md border border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
                    onClick={() => setShowAllPieSlices((v) => !v)}
                  >
                    {showAllPieSlices ? 'Show summary' : 'Show all slices'}
                  </button>
                </div>
              </div>

            <div className="flex items-center gap-6 h-[280px]">
              <div className="flex-1 h-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activePieData}
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
                      {activePieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={getCategoryColor(entry.name)}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}

                    </Pie>
                    <Tooltip content={renderPieTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

                <div className="w-56 h-full shrink-0 overflow-y-auto pr-5">
                  <div className="space-y-2">
                    {pieLegendItems.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: getCategoryColor(entry.name) }}
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
          </div>

          {/* Weekly Activity */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Weekly Activity</h2>
            <p className="text-xs text-gray-500 mb-4">{calendarWeekLabel}</p>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

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

                {weeklyCategoryMeta.visibleCategories.map((category, index) => {
                  const isLastVisible =
                    index === weeklyCategoryMeta.visibleCategories.length - 1 &&
                    weeklyCategoryMeta.hiddenCategories.length === 0;

                  return (
                    <Bar
                      key={category}
                      dataKey={category}
                      stackId="a"
                      fill={getCategoryColor(category)}
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

            <div className="mt-3 max-h-32 overflow-y-auto space-y-1 pr-1">
              {weeklyCategoryMeta.visibleCategories.map((category) => (
                <div key={category} className="flex items-center gap-2 text-xs text-gray-400">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(category) }}
                  />
                  <span>{category}</span>
                </div>
              ))}

              {weeklyCategoryMeta.hiddenCategories.length > 0 && (
                <div className="space-y-1">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    onClick={() => setShowWeeklyOtherDetails((v) => !v)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor('Other') }}
                    />
                    <span>
                      {showWeeklyOtherDetails ? '▼' : '▶'} Other
                    </span>
                  </button>

                  {showWeeklyOtherDetails && (
                    <div className="ml-4 space-y-1">
                      {weeklyCategoryMeta.hiddenCategories.map((category) => (
                        <div key={category} className="flex items-center gap-2 text-xs text-gray-500">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: getCategoryColor(category) }}
                          />
                          <span>{category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(app.category) }} />
                      <span className="text-sm font-medium text-white">{app.appName}</span>
                      <span className="text-xs text-gray-500">{app.category}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-400">{formatDuration(app.duration)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: getCategoryColor(app.category) }} />
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
