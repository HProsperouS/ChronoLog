import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Calendar, Trophy, TrendingDown, AlertCircle, TrendingUp, Shuffle, Target, CheckCircle2, Loader2, Wand2 } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import * as api from '../api';
import {
  todayStr,
  formatDuration,
  addDaysYmd,
  startOfWeekMonday,
  endOfWeekSunday,
  formatCalendarWeekRange,
} from '../utils';
import { categoryColors } from '../constants';
import type { Insight, DailyStats } from '../types';

type SummaryMode = 'daily' | 'weekly';

function formatComparison(curr: number, prev: number, priorLabel: string): string {
  const c = Number(curr);
  const p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return `— vs ${priorLabel}`;
  if (c === 0 && p === 0) return `No data vs ${priorLabel}`;
  if (p === 0) return c > 0 ? `↑ vs ${priorLabel}` : `— vs ${priorLabel}`;
  const pct = ((c - p) / p) * 100;
  if (!Number.isFinite(pct)) return `— vs ${priorLabel}`;
  const arrow = pct >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(Math.round(pct))}% vs ${priorLabel}`;
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

const DEFAULT_DYNAMIC_CATEGORY_COLOR = '#9ca3af';

function colorFromCategoryName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 60% 55%)`;
}

function getCategoryColor(category: string): string {
  return categoryColors[category] ?? colorFromCategoryName(category) ?? DEFAULT_DYNAMIC_CATEGORY_COLOR;
}


export function Insights() {
  const [insights, setInsights]   = useState<Insight[]>([]);
  const [generating, setGenerating] = useState(false);
  const [rangeStats, setRangeStats] = useState<DailyStats[]>([]);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('daily');
  const [quota, setQuota] = useState<api.InsightsQuota | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const today = todayStr();
      const thisWeekMon = startOfWeekMonday(today);
      const thisWeekSun = endOfWeekSunday(thisWeekMon);
      const fetchFrom = addDaysYmd(thisWeekMon, -7);
      void Promise.all([
        api.getInsights(today),
        api.getWeeklyStatsRange(fetchFrom, thisWeekSun),
        api.getInsightsQuota(today),
      ]).then(([ins, stats, quotaInfo]) => {
        setInsights(ins);
        setRangeStats(stats);
        setQuota(quotaInfo);
      }).catch(() => {
        // keep existing UI state if poll fails
      });
    };
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, []);

  async function handleGenerate() {
    setGenerateError(null);
    setGenerating(true);
    try {
      const fresh = await api.generateInsights(todayStr());
      setInsights(fresh);
      const nextQuota = await api.getInsightsQuota(todayStr());
      setQuota(nextQuota);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate insights.';
      setGenerateError(message);
      try {
        const nextQuota = await api.getInsightsQuota(todayStr());
        setQuota(nextQuota);
      } catch {
        // ignore follow-up quota fetch failure
      }
    } finally {
      setGenerating(false);
    }
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
      TrendingDown,
      Trophy,
      AlertCircle,
      TrendingUp,
    };
    return icons[iconName] || Sparkles;
  };

  const getIconColor = (type: string) => {
    const colors: Record<string, string> = {
      pattern: 'from-indigo-500 to-purple-600',
      achievement: 'from-emerald-500 to-green-600',
      recommendation: 'from-orange-500 to-amber-600',
    };
    return colors[type] || 'from-indigo-500 to-purple-600';
  };

  // ─── This calendar week (Mon–Sun, local) for charts & habit grid ─────────────
  const weekStart = startOfWeekMonday(todayStr());
  const weekEnd = endOfWeekSunday(weekStart);
  const calendarWeekLabel = formatCalendarWeekRange(weekStart, weekEnd);

  const chartStats = useMemo(() => {
    return [...rangeStats]
      .filter((s) => s.date >= weekStart && s.date <= weekEnd)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rangeStats, weekStart, weekEnd]);

  const productivityTrend = useMemo(
    () =>
      chartStats.map((d) => ({
        date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        score: d.focusScore,
        focusTime: d.totalTime,
      })),
    [chartStats],
  );

  const weeklyDistributionMeta = useMemo(() => {
    const totals = new Map<string, number>();

    for (const day of chartStats) {
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

    const MAX_VISIBLE_CATEGORIES = 8;
    const visibleCategories = sortedCategories.slice(0, MAX_VISIBLE_CATEGORIES).map(([category]) => category);
    const hiddenCategories = sortedCategories.slice(MAX_VISIBLE_CATEGORIES).map(([category]) => category);

    return {
      visibleCategories,
      hiddenCategories,
    };
  }, [chartStats]);

  const timeDistributionTrend = useMemo(
    () =>
      chartStats.map((d) => {
        const row: Record<string, string | number> = {
          day: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        };

        for (const category of weeklyDistributionMeta.visibleCategories) {
          row[category] = d.categoryTotals?.[category] ?? 0;
        }

        if (weeklyDistributionMeta.hiddenCategories.length > 0) {
          row.Other = weeklyDistributionMeta.hiddenCategories.reduce(
            (sum, category) => sum + (d.categoryTotals?.[category] ?? 0),
            0
          );
        }

        return row;
      }),
    [chartStats, weeklyDistributionMeta],
  );

  // ─── Summary cards: Daily = today vs yesterday; Weekly = last 7 vs prior 7 ───
  const summary = useMemo(() => {
    const sorted = [...rangeStats].sort((a, b) => a.date.localeCompare(b.date));
    const priorDaily = 'yesterday';
    const priorWeekly = 'prior calendar week';

    if (summaryMode === 'daily') {
      const today = todayStr();
      const ymdYest = addDaysYmd(today, -1);
      const t = sorted.find((s) => s.date === today);
      const y = sorted.find((s) => s.date === ymdYest);
      const focusC = t?.focusScore ?? 0;
      const focusP = y?.focusScore ?? 0;
      const prodC = ((t?.categoryTotals.Work ?? 0) + (t?.categoryTotals.Study ?? 0)) / 60;
      const prodP = ((y?.categoryTotals.Work ?? 0) + (y?.categoryTotals.Study ?? 0)) / 60;
      const ctxC = t?.contextSwitches ?? 0;
      const ctxP = y?.contextSwitches ?? 0;
      return {
        focusDisplay: `${focusC}`,
        focusCmp: formatComparison(focusC, focusP, priorDaily),
        prodDisplay: (() => {
          const totalMinutes = Math.round(prodC * 60);
          if (totalMinutes < 60) return `${totalMinutes}m`;

          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
        })(),
        prodCmp: formatComparison(prodC, prodP, priorDaily),
        ctxDisplay: `${ctxC}`,
        ctxCmp: formatComparison(ctxC, ctxP, priorDaily),
        ctxHint: 'Today (productive ↔ non-productive)',
        prodHint: 'Work + Study',
      };
    }

    const prevStart = addDaysYmd(weekStart, -7);
    const prevEnd = addDaysYmd(weekStart, -1);
    const curr7 = sorted.filter((s) => s.date >= weekStart && s.date <= weekEnd);
    const prev7 = sorted.filter((s) => s.date >= prevStart && s.date <= prevEnd);
    const avgFocus = (days: DailyStats[]) =>
      days.length ? days.reduce((s, d) => s + d.focusScore, 0) / days.length : 0;
    const sumProdMin = (days: DailyStats[]) =>
      days.reduce((s, d) => s + (d.categoryTotals.Work ?? 0) + (d.categoryTotals.Study ?? 0), 0);
    const sumCtx = (days: DailyStats[]) => days.reduce((s, d) => s + d.contextSwitches, 0);

    const focusC = Math.round(avgFocus(curr7));
    const focusP = Math.round(avgFocus(prev7));
    const prodC = sumProdMin(curr7) / 60;
    const prodP = sumProdMin(prev7) / 60;
    const ctxAvgC = sumCtx(curr7) / 7;
    const ctxAvgP = prev7.length >= 7 ? sumCtx(prev7) / 7 : 0;

    const hasPrev = prev7.length >= 7;
    const needPrevMsg = 'Not enough history (need last full week too)';
    return {
      focusDisplay: `${focusC}`,
      focusCmp: hasPrev ? formatComparison(focusC, focusP, priorWeekly) : needPrevMsg,
      prodDisplay: (() => {
        const totalMinutes = Math.round(prodC * 60);
        if (totalMinutes < 60) return `${totalMinutes}m`;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
      })(),
      prodCmp: hasPrev ? formatComparison(prodC, prodP, priorWeekly) : needPrevMsg,
      ctxDisplay: ctxAvgC.toFixed(1),
      ctxCmp: hasPrev ? formatComparison(ctxAvgC, ctxAvgP, priorWeekly) : needPrevMsg,
      ctxHint: 'Avg / day (this calendar week)',
      prodHint: 'Total Work + Study (this calendar week)',
    };
  }, [rangeStats, summaryMode, weekStart, weekEnd]);

  // ─── Habit tracker helpers ────────────────────────────────────────────────────

  type HabitLevel = 'none' | 'far' | 'mid' | 'near' | 'hit';

  function levelToClasses(level: HabitLevel): string {
    switch (level) {
      case 'far':
        return 'bg-[#1a1d28] border border-white/5 text-gray-500';
      case 'mid':
        return 'bg-[#1f2937] border border-white/10 text-gray-400';
      case 'near':
        return 'bg-[#065f46] border border-emerald-500/20 text-emerald-300';
      case 'hit':
        return 'bg-[#10b981] border border-emerald-400/40 text-white';
      case 'none':
      default:
        return 'bg-white/5 border border-white/10 text-gray-400';
    }
  }

  function weekdayLabel(date: string): string {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  }

  function buildHabitDays() {
    if (!chartStats.length) return [];
    return chartStats.map((d) => {
      const productiveMinutes = (d.categoryTotals.Work ?? 0) + (d.categoryTotals.Study ?? 0);
      const entertainmentMinutes = d.categoryTotals.Entertainment ?? 0;
      return {
        date: d.date,
        label: weekdayLabel(d.date),
        contextSwitches: d.contextSwitches,
        productiveHours: productiveMinutes / 60,
        entertainmentHours: entertainmentMinutes / 60,
        hasData: d.totalTime > 0,
      };
    });
  }

  const habitDays = buildHabitDays();

  function levelForContextSwitches(value: number, hasData: boolean): HabitLevel {
    if (!hasData) return 'none';
    if (value <= 10) return 'hit';
    if (value <= 20) return 'near';
    if (value <= 30) return 'mid';
    return 'far';
  }

  function levelForProductiveHours(value: number, hasData: boolean): HabitLevel {
    if (!hasData) return 'none';
    if (value >= 8) return 'hit';
    if (value >= 7) return 'near';
    if (value >= 5) return 'mid';
    return 'far';
  }

  function levelForEntertainmentHours(value: number, hasData: boolean): HabitLevel {
    if (!hasData) return 'none';
    if (value <= 0.5) return 'hit';
    if (value <= 1) return 'near';
    if (value <= 2) return 'mid';
    return 'far';
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">AI Insights</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Personalized productivity analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setSummaryMode('daily')}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  summaryMode === 'daily'
                    ? 'bg-indigo-500/25 text-indigo-300'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setSummaryMode('weekly')}
                className={`px-3 py-1.5 text-xs font-medium transition-all border-l border-white/10 ${
                  summaryMode === 'weekly'
                    ? 'bg-indigo-500/25 text-indigo-300'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Weekly
              </button>
            </div>
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white/5 border border-white/10 rounded-lg max-w-[220px] sm:max-w-none"
              title="Week runs Mon–Sun in your local timezone"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate sm:whitespace-normal">Charts: {calendarWeekLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {/* Insights Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-5">
            <Sparkles className="w-6 h-6 text-indigo-400 mb-3" />
            <p className="text-xs text-gray-500 mb-1">Focus Score</p>
            <p className="text-2xl font-semibold text-white">{summary.focusDisplay}%</p>
            <p className="text-[10px] text-gray-600 mt-1">
              {summaryMode === 'daily' ? 'Today' : '7-day average'}
            </p>
            <p className="text-xs text-indigo-400 mt-2">{summary.focusCmp}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/20 rounded-xl p-5">
            <Trophy className="w-6 h-6 text-emerald-400 mb-3" />
            <p className="text-xs text-gray-500 mb-1">Total Productive Time</p>
            <p className="text-2xl font-semibold text-white">{summary.prodDisplay}</p>
            <p className="text-[10px] text-gray-600 mt-1">{summary.prodHint}</p>
            <p className="text-xs text-emerald-400 mt-2">{summary.prodCmp}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-5">
            <Shuffle className="w-6 h-6 text-orange-400 mb-3" />
            <p className="text-xs text-gray-500 mb-1">Context Switches</p>
            <p className="text-2xl font-semibold text-white">{summary.ctxDisplay}</p>
            <p className="text-[10px] text-gray-600 mt-1">{summary.ctxHint}</p>
            <p className="text-xs text-orange-400 mt-2">{summary.ctxCmp}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Productivity Trend */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Productivity Score</h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={productivityTrend}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  domain={[0, 100]} 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#13131a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Time Distribution */}
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Weekly Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timeDistributionTrend}>
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />

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
                  formatter={(value: number) => formatDuration(value)}
                  contentStyle={{
                    backgroundColor: '#13131a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                {weeklyDistributionMeta.visibleCategories.map((category) => (
                  <Area
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stackId="1"
                    stroke="none"
                    fill={getCategoryColor(category)}
                    fillOpacity={0.85}
                  />
                ))}

                {weeklyDistributionMeta.hiddenCategories.length > 0 && (
                  <Area
                    type="monotone"
                    dataKey="Other"
                    stackId="1"
                    stroke="none"
                    fill="#9ca3af"
                    fillOpacity={0.7}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Habit Tracker */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Habit Tracker</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>Furthest From Goal</span>
              <div className="flex items-center gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-[#1a1d28]"></div>
                <div className="w-3 h-3 rounded-sm bg-[#1f2937]"></div>
                <div className="w-3 h-3 rounded-sm bg-[#065f46]"></div>
                <div className="w-3 h-3 rounded-sm bg-[#059669]"></div>
                <div className="w-3 h-3 rounded-sm bg-[#10b981]"></div>
              </div>
              <span>Nearest to Goal</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Habit 1: Context Switches */}
            <div className="group">
              <div className="flex items-center gap-3 mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-white font-medium">Have less than 20 context switches</p>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <div className="flex gap-1.5">
                  {habitDays.map((d) => {
                    const level = levelForContextSwitches(d.contextSwitches, d.hasData);
                    const classes = levelToClasses(level);
                    const tooltip = d.hasData ? `${d.contextSwitches} switches` : 'No data';
                    return (
                      <div key={`ctx-${d.date}`} className="group/day relative">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold hover:scale-110 transition-transform cursor-pointer ${classes}`}
                        >
                          {d.label}
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a24] px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none">
                          {tooltip}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Habit 2: Productivity Hours */}
            <div className="group">
              <div className="flex items-center gap-3 mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-white font-medium">Reach 7 hours of productivity</p>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <div className="flex gap-1.5">
                  {habitDays.map((d) => {
                    const level = levelForProductiveHours(d.productiveHours, d.hasData);
                    const classes = levelToClasses(level);
                    const tooltip = d.hasData
                      ? `${d.productiveHours.toFixed(1)} hours`
                      : 'No data';
                    return (
                      <div key={`prod-${d.date}`} className="group/day relative">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold hover:scale-110 transition-transform cursor-pointer ${classes}`}
                        >
                          {d.label}
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a24] px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none">
                          {tooltip}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Habit 3: Entertainment Time */}
            <div className="group">
              <div className="flex items-center gap-3 mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-white font-medium">Spend less than 1 hour on entertainment</p>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <div className="flex gap-1.5">
                  {habitDays.map((d) => {
                    const level = levelForEntertainmentHours(d.entertainmentHours, d.hasData);
                    const classes = levelToClasses(level);
                    const tooltip = d.hasData
                      ? `${d.entertainmentHours.toFixed(1)} hours`
                      : 'No data';
                    return (
                      <div key={`ent-${d.date}`} className="group/day relative">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold hover:scale-110 transition-transform cursor-pointer ${classes}`}
                        >
                          {d.label}
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a24] px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none">
                          {tooltip}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights List */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">Today&apos;s AI insights</h2>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-xl">
                    Short takeaways from your tracking data for{' '}
                    <span className="text-gray-400 font-medium">{todayStr()}</span>. Generate a fresh batch anytime.
                  </p>
                  {quota && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Daily generates: <span className="text-gray-300">{quota.used}/{quota.limit}</span>
                      {' · '}
                      Remaining: <span className="text-gray-300">{quota.remaining}</span>
                      {quota.cooldownRemainingMinutes > 0 && (
                        <>
                          {' · '}
                          Cooldown: <span className="text-gray-300">{quota.cooldownRemainingMinutes}m</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating || !(quota?.canGenerate ?? true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate insights
                  </>
                )}
              </button>
            </div>
            {generateError && (
              <p className="mt-3 text-xs text-rose-300">{generateError}</p>
            )}
          </div>

          <div className="p-5">
            {insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Sparkles className="h-7 w-7 text-indigo-400/80" />
                </div>
                <p className="text-sm font-medium text-white">No insights for today yet</p>
                <p className="mt-2 max-w-sm text-xs text-gray-500 leading-relaxed">
                  We haven&apos;t saved any AI cards for this date. Use <span className="text-gray-400">Generate insights</span>{' '}
                  above to analyze today&apos;s activity — you&apos;ll need backend + Lambda configured for it to succeed.
                </p>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating || !(quota?.canGenerate ?? true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {generating ? 'Working…' : 'Try generate'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-600 mb-1">
                  {insights.length} insight{insights.length === 1 ? '' : 's'} · today
                </p>
                {insights.map((insight) => {
                  const Icon = getIcon(insight.icon);
                  const gradientColor = getIconColor(insight.type);
                  const time = new Date(insight.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={insight.id}
                      className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-lg hover:bg-white/[0.07] hover:border-white/10 transition-all"
                    >
                      <div className={`bg-gradient-to-br ${gradientColor} p-2.5 rounded-lg flex-shrink-0 h-fit`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                          <span className="text-[10px] text-gray-500 ml-2 shrink-0">{time}</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-2">{insight.description}</p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            insight.type === 'pattern'     ? 'bg-indigo-500/10 text-indigo-400'
                            : insight.type === 'achievement' ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-orange-500/10 text-orange-400'
                          }`}
                        >
                          {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="mt-4 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-2">Weekly Summary</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                This week, you've shown great improvement in maintaining focus during morning hours.
                Your deep work sessions have increased by 25%, and you successfully reduced social media
                time by 30 minutes per day on average. Consider applying your morning routine to
                afternoon sessions to maintain consistency throughout the day.
              </p>
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors">
                View Detailed Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}