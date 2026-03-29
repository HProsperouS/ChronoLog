import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import * as api from '../api';
import { categoryColors } from '../constants';
import { dateStr, todayStr, formatDuration } from '../utils';
import type { Activity, CategoryDefinition, ProductivityType } from '../types';

function colorFromCategoryName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 60% 55%)`;
}

export function ActivityTimeline() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [categoryDefinitions, setCategoryDefinitions] = useState<CategoryDefinition[]>([]);

  const getDefaultWindow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    return {
      start: currentHour,
      end: Math.min(currentHour + 1, 24),
    };
  };

  const [windowStartHour, setWindowStartHour] = useState<number>(() => {
    const saved = localStorage.getItem('timelineWindowStartHour');
    if (saved !== null) return Number(saved);
    return getDefaultWindow().start;
  });

  const [windowEndHour, setWindowEndHour] = useState<number>(() => {
    const saved = localStorage.getItem('timelineWindowEndHour');
    if (saved !== null) return Number(saved);
    return getDefaultWindow().end;
  });

  const [contextSwitchMode, setContextSwitchMode] = useState<'all' | 'productivity-only'>(() => {
    const saved = localStorage.getItem('timelineContextSwitchMode');
    return saved === 'all' ? 'all' : 'productivity-only';
  });

  useEffect(() => {
    localStorage.setItem('timelineWindowStartHour', String(windowStartHour));
  }, [windowStartHour]);

  useEffect(() => {
    localStorage.setItem('timelineWindowEndHour', String(windowEndHour));
  }, [windowEndHour]);

  useEffect(() => {
    localStorage.setItem('timelineContextSwitchMode', contextSwitchMode);
  }, [contextSwitchMode]);

  useEffect(() => {
    void Promise.all([
      api.getAvailableDates(),
      api.getCategories(),
    ]).then(([dates, categories]) => {
      setAvailableDates(new Set(dates));
      setCategoryDefinitions(categories);
    });
  }, []);

  useEffect(() => {
    let lastToday = todayStr();
    const timer = setInterval(() => {
      const nowToday = todayStr();
      if (nowToday !== lastToday) {
        setSelectedDate((prev) => (dateStr(prev) === lastToday ? new Date() : prev));
        lastToday = nowToday;
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const date = dateStr(selectedDate);
    const isToday = date === todayStr();

    const refresh = async () => {
      const [nextActivities, nextCategories] = await Promise.all([
        api.getActivities(date),
        api.getCategories(),
      ]);

      setActivities(nextActivities);
      setCategoryDefinitions(nextCategories);

      if (isToday) {
        const dates = await api.getAvailableDates();
        setAvailableDates(new Set(dates));
      }
    };

    void refresh();
    if (!isToday) return;
    const timer = setInterval(() => {
      void refresh();
    }, 5_000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  const categoryColorMap = useMemo(
    () => Object.fromEntries(categoryDefinitions.map((c) => [c.name, c.color])),
    [categoryDefinitions],
  );

  const categoryProductivityMap = useMemo(
    () => Object.fromEntries(categoryDefinitions.map((c) => [c.name, c.productivityType])),
    [categoryDefinitions],
  );

  function getCategoryColor(category: string): string {
    return categoryColorMap[category] ?? categoryColors[category] ?? colorFromCategoryName(category);
  }

  function getProductivityType(category: string): ProductivityType {
    return categoryProductivityMap[category] ?? 'neutral';
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const isProductive = (category: string) => getProductivityType(category) === 'productive';

  const startHour = windowStartHour;
  const endHour = windowEndHour;
  const analyticsActivities = activities.filter((activity) => !activity.excludeFromAnalytics);

  const generateTimelineBar = () => {
    const windowStartMin = startHour * 60;
    const windowEndMin = endHour * 60;
    const totalMins = Math.max(windowEndMin - windowStartMin, 1);

    return analyticsActivities
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map((activity) => {
        const activityStartMin =
          activity.startTime.getHours() * 60 +
          activity.startTime.getMinutes() +
          activity.startTime.getSeconds() / 60;

        const activityEndMin =
          activity.endTime.getHours() * 60 +
          activity.endTime.getMinutes() +
          activity.endTime.getSeconds() / 60;

        const clippedStart = Math.max(activityStartMin, windowStartMin);
        const clippedEnd = Math.min(activityEndMin, windowEndMin);

        if (clippedEnd <= clippedStart) return null;

        const offset = clippedStart - windowStartMin;
        const durationInWindow = clippedEnd - clippedStart;
        const left = (offset / totalMins) * 100;
        const width = (durationInWindow / totalMins) * 100;

        return {
          ...activity,
          left: Math.max(0, left),
          width: Math.min(Math.max(width, 0.5), 100 - Math.max(0, left)),
          isProductive: isProductive(activity.category),
          productivityType: getProductivityType(activity.category),
          visibleDuration: durationInWindow,
        };
      })
      .filter(Boolean) as Array<Activity & {
      left: number;
      width: number;
      isProductive: boolean;
      productivityType: ProductivityType;
      visibleDuration: number;
    }>;
  };

  const timelineDataRaw = generateTimelineBar();
  const contextSwitchMinMinutes = 1;

  type TimelineBar = Activity & {
    left: number;
    width: number;
    isProductive: boolean;
    productivityType: ProductivityType;
    visibleDuration: number;
  };

  const shouldMergeForOverview = (
    prev: TimelineBar,
    current: TimelineBar,
    next: TimelineBar | undefined,
  ) => {
    if (!next) return false;
    if (current.visibleDuration >= contextSwitchMinMinutes) return false;
    return prev.productivityType === next.productivityType;
  };

  const mergeTimelineForOverview = (items: TimelineBar[]): TimelineBar[] => {
    if (items.length <= 1) return items;

    let working = [...items];
    let changed = true;

    while (changed) {
      changed = false;
      const nextPass: TimelineBar[] = [];

      for (let i = 0; i < working.length; i++) {
        const prev = nextPass[nextPass.length - 1];
        const current = working[i];
        const next = working[i + 1];

        if (!prev || !next) {
          nextPass.push(current);
          continue;
        }

        if (shouldMergeForOverview(prev, current, next)) {
          const mergedDuration = prev.visibleDuration + current.visibleDuration + next.visibleDuration;
          const mergedLeft = prev.left;
          const mergedWidth = next.left + next.width - prev.left;

          nextPass[nextPass.length - 1] = {
            ...prev,
            appName: prev.appName,
            windowTitle: prev.windowTitle,
            url: prev.url,
            duration: prev.duration + current.duration + next.duration,
            endTime: next.endTime,
            visibleDuration: mergedDuration,
            left: mergedLeft,
            width: mergedWidth,
            isProductive: prev.isProductive,
            productivityType: prev.productivityType,
          };

          i += 1;
          changed = true;
        } else {
          nextPass.push(current);
        }
      }

      working = nextPass;
    }

    return working;
  };

  const timelineData = mergeTimelineForOverview(timelineDataRaw);

  const contextSwitchMarkers = timelineData
    .map((activity, index) => {
      if (index === 0) return null;

      const prev = timelineData[index - 1];

      const isSwitch =
        contextSwitchMode === 'all'
          ? prev.category !== activity.category
          : prev.productivityType !== activity.productivityType &&
            (prev.productivityType === 'productive' || prev.productivityType === 'non_productive') &&
            (activity.productivityType === 'productive' || activity.productivityType === 'non_productive');

      if (!isSwitch) return null;

      return {
        id: activity.id,
        left: activity.left,
      };
    })
    .filter((marker) => marker !== null);

  const contextSwitchCount = contextSwitchMarkers.length;

  const windowHours = endHour - startHour;

  const contextMarkerWidth =
    windowHours <= 3 ? 3 :
    windowHours <= 8 ? 2 :
    1;

  const tickStepMinutes =
    windowHours <= 3
      ? 15
      : windowHours <= 8
      ? 30
      : windowHours <= 16
      ? 60
      : 120;

  const timeTicks = Array.from(
    { length: Math.floor((windowHours * 60) / tickStepMinutes) + 1 },
    (_, i) => {
      const totalMinutes = startHour * 60 + i * tickStepMinutes;
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const left =
        ((totalMinutes - startHour * 60) / (windowHours * 60)) * 100;

      const label =
        minute === 0
          ? hour === 0
            ? '12 AM'
            : hour < 12
            ? `${hour} AM`
            : hour === 12
            ? '12 PM'
            : `${hour - 12} PM`
          : `${minute.toString().padStart(2, '0')}`;

      return {
        left,
        label,
        minute,
        isMajor: minute === 0,
      };
    },
  );

  const categories = [
    'All',
    ...Array.from(new Set(activities.map((a) => a.category))).sort((a, b) => a.localeCompare(b)),
  ];

  const filteredActivities = activities
    .filter((a) => selectedCategory === 'All' || a.category === selectedCategory)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  const maxDuration = Math.max(...filteredActivities.map((a) => a.duration), 1);

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Activity Timeline</h1>
            <p className="text-xs text-gray-500 mt-0.5">Chronological view of your activity</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              {availableDates.has(dateStr(selectedDate)) ? '●' : ''}
            </button>
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 z-50">
                <div className="bg-[#13131a] border border-white/10 rounded-xl p-3 shadow-lg">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (!d) return;
                      setSelectedDate(d);
                      setIsDatePickerOpen(false);
                    }}
                    modifiers={{ hasData: (d) => availableDates.has(dateStr(d)) }}
                    modifiersStyles={{
                      hasData: { fontWeight: 'bold', textDecoration: 'underline', color: '#6366f1' },
                      today: { color: '#a5b4fc', fontWeight: '600', background: 'none' },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">Hourly Productivity Overview</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-xs text-gray-400">Productive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-400" />
                <span className="text-xs text-gray-400">Non-Productive / Neutral</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Start Hour</label>
                <span className="text-xs text-white font-medium">
                  {windowStartHour === 0 ? '12 AM' : windowStartHour < 12 ? `${windowStartHour} AM` : windowStartHour === 12 ? '12 PM' : `${windowStartHour - 12} PM`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={23}
                step={1}
                value={windowStartHour}
                onChange={(e) => {
                  const nextStart = Number(e.target.value);
                  setWindowStartHour(nextStart);
                  if (windowEndHour <= nextStart) {
                    setWindowEndHour(Math.min(nextStart + 1, 24));
                  }
                }}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">End Hour</label>
                <span className="text-xs text-white font-medium">
                  {windowEndHour === 24 ? '12 AM' : windowEndHour < 12 ? `${windowEndHour} AM` : windowEndHour === 12 ? '12 PM' : `${windowEndHour - 12} PM`}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                step={1}
                value={windowEndHour}
                onChange={(e) => {
                  const nextEnd = Number(e.target.value);
                  setWindowEndHour(nextEnd <= windowStartHour ? windowStartHour + 1 : nextEnd);
                }}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-gray-400">Context switch definition</span>

            <button
              type="button"
              onClick={() => setContextSwitchMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                contextSwitchMode === 'all'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Any category change
            </button>

            <button
              type="button"
              onClick={() => setContextSwitchMode('productivity-only')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                contextSwitchMode === 'productivity-only'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Productive ↔ Non-Productive only
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-xs text-gray-400">
              Window:{' '}
              <span className="text-white font-medium">
                {windowStartHour === 0 ? '12 AM' : windowStartHour < 12 ? `${windowStartHour} AM` : windowStartHour === 12 ? '12 PM' : `${windowStartHour - 12} PM`}
                {' '}to{' '}
                {windowEndHour === 24 ? '12 AM' : windowEndHour < 12 ? `${windowEndHour} AM` : windowEndHour === 12 ? '12 PM' : `${windowEndHour - 12} PM`}
              </span>
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                {contextSwitchMode === 'all' ? 'Context Switches' : 'Productivity Switches'}
              </p>
              <p className="text-sm font-semibold text-white">{contextSwitchCount}</p>
            </div>
          </div>

          <div className="relative">
            <div className="relative mb-2 h-4">
              {timeTicks.map((tick, idx) => (
                <div
                  key={`${tick.left}-${idx}`}
                  className="absolute -translate-x-1/2 text-[10px] text-gray-500"
                  style={{ left: `${tick.left}%` }}
                >
                  {tick.label}
                </div>
              ))}
            </div>

            <div className="relative h-8 bg-white/5 rounded-lg overflow-visible">
              {timeTicks.map((tick, idx) => (
                <div
                  key={`grid-${idx}`}
                  className={`absolute top-0 h-full pointer-events-none ${
                    tick.minute === 0 ? 'bg-white/12 w-px' : 'bg-white/6 w-px'
                  }`}
                  style={{ left: `${tick.left}%`, transform: 'translateX(-50%)' }}
                />
              ))}

              {timelineData.map((a) => (
                <div
                  key={a.id}
                  className="absolute top-0 h-full cursor-pointer group transition-all duration-75 hover:brightness-125 hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.8)] hover:z-10"
                  style={{
                    left: `${a.left}%`,
                    width: `${a.width}%`,
                    backgroundColor: a.isProductive ? '#10b981' : '#f59e0b',
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-30">
                    {a.appName} • {formatDuration(a.visibleDuration)}
                  </div>
                </div>
              ))}

              {contextSwitchMarkers.map((marker) => (
                <div
                  key={`switch-${marker.id}`}
                  className="absolute -top-1 -bottom-1 bg-slate-200/100 pointer-events-none z-20 rounded-full shadow-[0_0_6px_rgba(103,232,249,0.45)]"
                  style={{
                    left: `${marker.left}%`,
                    transform: 'translateX(-50%)',
                    width: `${contextMarkerWidth}px`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-[10px] text-emerald-400 font-medium mb-1">PRODUCTIVE TIME</p>
              <p className="text-lg font-semibold text-white">
                {formatDuration(
                  timelineData
                    .filter((a) => a.isProductive)
                    .reduce((s, a) => s + a.visibleDuration, 0),
                )}
              </p>
            </div>

            <div className="bg-orange-400/10 border border-orange-400/20 rounded-lg p-3">
              <p className="text-[10px] text-orange-400 font-medium mb-1">NON-PRODUCTIVE TIME</p>
              <p className="text-lg font-semibold text-white">
                {formatDuration(
                  timelineData
                    .filter((a) => !a.isProductive)
                    .reduce((s, a) => s + a.visibleDuration, 0),
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Activities</p>
            <p className="text-xl font-semibold text-white">{filteredActivities.length}</p>
          </div>
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Time</p>
            <p className="text-xl font-semibold text-white">
              {formatDuration(filteredActivities.reduce((s, a) => s + a.duration, 0))}
            </p>
          </div>
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Avg Session</p>
            <p className="text-xl font-semibold text-white">
              {filteredActivities.length > 0
                ? formatDuration(
                    Math.round(
                      filteredActivities.reduce((s, a) => s + a.duration, 0) / filteredActivities.length,
                    ),
                  )
                : '0m'}
            </p>
          </div>
        </div>

        <div className="bg-[#13131a] border border-white/5 rounded-xl p-6">
          <div className="space-y-1">
            {filteredActivities.map((activity, index) => (
              <div key={activity.id} className="flex gap-4">
                <div className="flex flex-col items-center pt-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(activity.category) }}
                  />
                  {index < filteredActivities.length - 1 && (
                    <div className="w-px flex-1 bg-white/5 my-1" style={{ minHeight: '50px' }} />
                  )}
                </div>

                <div className="flex-1 pb-5">
                  <div className="bg-white/5 border border-white/5 rounded-lg p-4 hover:bg-white/[0.07] hover:border-white/10 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{activity.appName}</h3>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                            style={{ backgroundColor: getCategoryColor(activity.category) }}
                          >
                            {activity.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {activity.windowTitle ?? activity.url ?? 'No title'}
                        </p>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-white">{formatDuration(activity.duration)}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatTime(activity.startTime)} – {formatTime(activity.endTime)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(activity.duration / maxDuration) * 100}%`,
                            backgroundColor: getCategoryColor(activity.category),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No activities found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}