import { useEffect, useState } from 'react';
import { Sparkles, Calendar, Trophy, TrendingDown, AlertCircle, TrendingUp, Shuffle, Target, CheckCircle2 } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import * as api from '../api';
import { todayStr, formatDuration } from '../utils';
import type { Insight, DailyStats } from '../types';

const TODAY = todayStr();

export function Insights() {
  const [insights, setInsights]   = useState<Insight[]>([]);
  const [generating, setGenerating] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    api.getInsights(TODAY).then(setInsights);
    api.getWeeklyStats().then(setWeeklyStats);
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const fresh = await api.generateInsights(TODAY);
      setInsights(fresh);
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

  // ─── Derived stats from backend weekly data ───────────────────────────────────

  const productivityTrend = weeklyStats.map((d) => ({
    date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    score: d.focusScore,
    focusTime: d.totalTime,
  }));

  const timeDistributionTrend = weeklyStats.map((d) => {
    const productive = d.categoryTotals.Work + d.categoryTotals.Study;
    const unproductive = d.categoryTotals.Entertainment;
    const neutral = d.totalTime - productive - unproductive;
    return {
      day: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      productive,
      neutral,
      unproductive,
    };
  });

  const latestDay = weeklyStats[weeklyStats.length - 1];
  const latestProductiveMinutes =
    latestDay ? latestDay.categoryTotals.Work + latestDay.categoryTotals.Study : 0;
  const latestProductiveHours = parseFloat((latestProductiveMinutes / 60).toFixed(1));
  const latestFocusScore = latestDay?.focusScore ?? 0;
  const latestContextSwitches = latestDay?.contextSwitches ?? 0;

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
    if (!weeklyStats.length) return [];
    return weeklyStats.map((d) => {
      const productiveMinutes = d.categoryTotals.Work + d.categoryTotals.Study;
      const entertainmentMinutes = d.categoryTotals.Entertainment;
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
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
              <Calendar className="w-3.5 h-3.5" />
              Last 7 Days
            </button>
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
            <p className="text-2xl font-semibold text-white">{latestFocusScore}%</p>
            <p className="text-xs text-indigo-400 mt-2">↑ 8% from last week</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/20 rounded-xl p-5">
            <Trophy className="w-6 h-6 text-emerald-400 mb-3" />
            <p className="text-xs text-gray-500 mb-1">Productive Hours</p>
            <p className="text-2xl font-semibold text-white">{latestProductiveHours}h</p>
            <p className="text-xs text-emerald-400 mt-2">↑ 12% from last week</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-5">
            <Shuffle className="w-6 h-6 text-orange-400 mb-3" />
            <p className="text-xs text-gray-500 mb-1">Context Switches</p>
            <p className="text-2xl font-semibold text-white">{latestContextSwitches}</p>
            <p className="text-xs text-orange-400 mt-2">↑ 18% from last week</p>
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
                <Area
                  type="monotone"
                  dataKey="productive"
                  stackId="1"
                  stroke="none"
                  fill="#10b981"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  stackId="1"
                  stroke="none"
                  fill="#6b7280"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="unproductive"
                  stackId="1"
                  stroke="none"
                  fill="#f59e0b"
                  fillOpacity={0.8}
                />
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
                      ? `${parseFloat(d.productiveHours.toFixed(1))} hours`
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
                      ? `${parseFloat(d.entertainmentHours.toFixed(1))} hours`
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
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">AI-Generated Insights</h2>
          <div className="space-y-3">
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
                      <span className="text-[10px] text-gray-500 ml-2">{time}</span>
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