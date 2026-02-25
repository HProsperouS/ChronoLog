import { Calendar, Clock, Filter } from 'lucide-react';
import { todayActivities, categoryColors } from '../data/mockData';
import { useState } from 'react';

export function ActivityTimeline() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Check if activity is productive
  const isProductiveActivity = (category: string) => {
    return category === 'Work' || category === 'Study';
  };

  // Generate timeline bar data
  const generateTimelineBar = () => {
    const startHour = 9; // 9 AM
    const endHour = 19; // 7 PM
    const totalMinutes = (endHour - startHour) * 60; // 600 minutes (10 hours)
    
    const sortedActivities = [...todayActivities]
      .filter(a => a.appName !== 'Spotify')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return sortedActivities.map(activity => {
      const activityStart = activity.startTime.getHours() * 60 + activity.startTime.getMinutes();
      const startOffset = activityStart - (startHour * 60);
      const left = (startOffset / totalMinutes) * 100;
      const width = (activity.duration / totalMinutes) * 100;
      
      return {
        ...activity,
        left: Math.max(0, left),
        width: Math.min(width, 100 - Math.max(0, left)),
        isProductive: isProductiveActivity(activity.category),
      };
    });
  };

  const timelineData = generateTimelineBar();

  const categories = ['All', 'Work', 'Study', 'Entertainment', 'Communication', 'Utilities'];

  const filteredActivities = todayActivities
    .filter(a => a.appName !== 'Spotify') // Exclude background apps
    .filter(a => selectedCategory === 'All' || a.category === selectedCategory)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Activity Timeline</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Chronological view of your activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
              <Calendar className="w-3.5 h-3.5" />
              Today
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Productivity Timeline Bar */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Daily Productivity Overview</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                <span className="text-xs text-gray-400">Productive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-xs text-gray-400">Non-Productive</span>
              </div>
            </div>
          </div>

          {/* Timeline Bar */}
          <div className="relative">
            {/* Time labels */}
            <div className="flex justify-between text-[10px] text-gray-500 mb-2">
              <span>9 AM</span>
              <span>11 AM</span>
              <span>1 PM</span>
              <span>3 PM</span>
              <span>5 PM</span>
              <span>7 PM</span>
            </div>

            {/* Background bar */}
            <div className="relative h-10 bg-white/5 rounded-lg overflow-hidden">
              {/* Activity blocks */}
              {timelineData.map((activity) => (
                <div
                  key={activity.id}
                  className="absolute top-0 h-full transition-all hover:opacity-80 cursor-pointer group"
                  style={{
                    left: `${activity.left}%`,
                    width: `${activity.width}%`,
                    backgroundColor: activity.isProductive ? '#10b981' : '#f59e0b',
                  }}
                  title={`${activity.appName} - ${formatDuration(activity.duration)}`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {activity.appName} • {formatDuration(activity.duration)}
                  </div>
                </div>
              ))}
            </div>

            {/* Hour markers */}
            <div className="absolute top-[28px] left-0 right-0 flex justify-between pointer-events-none">
              {[0, 20, 40, 60, 80, 100].map((pos, i) => (
                <div
                  key={i}
                  className="w-px h-4 bg-white/10"
                  style={{ marginLeft: pos === 0 ? '0' : '-0.5px' }}
                />
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-[10px] text-emerald-400 font-medium mb-1">PRODUCTIVE TIME</p>
              <p className="text-lg font-semibold text-white">
                {formatDuration(
                  timelineData
                    .filter(a => a.isProductive)
                    .reduce((sum, a) => sum + a.duration, 0)
                )}
              </p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-[10px] text-orange-400 font-medium mb-1">NON-PRODUCTIVE TIME</p>
              <p className="text-lg font-semibold text-white">
                {formatDuration(
                  timelineData
                    .filter(a => !a.isProductive)
                    .reduce((sum, a) => sum + a.duration, 0)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mb-5">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-6">
          <div className="space-y-1">
            {(() => {
              // Calculate max duration for relative scaling
              const maxDuration = Math.max(...filteredActivities.map(a => a.duration), 1);
              
              return filteredActivities.map((activity, index) => {
                const isLast = index === filteredActivities.length - 1;
              
                return (
                  <div key={activity.id} className="flex gap-4">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: categoryColors[activity.category] }}
                      />
                      {!isLast && (
                        <div className="w-px flex-1 bg-white/5 my-1" style={{ minHeight: '50px' }} />
                      )}
                    </div>

                    {/* Activity card */}
                    <div className="flex-1 pb-5">
                      <div className="bg-white/5 border border-white/5 rounded-lg p-4 hover:bg-white/[0.07] hover:border-white/10 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-white">{activity.appName}</h3>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                                style={{ backgroundColor: categoryColors[activity.category] }}
                              >
                                {activity.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{activity.windowTitle || activity.url || 'No title'}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-semibold text-white">{formatDuration(activity.duration)}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                            </p>
                          </div>
                        </div>

                        {/* Duration bar - scaled relative to longest activity */}
                        <div className="mt-3">
                          <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(activity.duration / maxDuration) * 100}%`,
                                backgroundColor: categoryColors[activity.category],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {filteredActivities.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No activities found</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Activities</p>
            <p className="text-xl font-semibold text-white">{filteredActivities.length}</p>
          </div>
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Time</p>
            <p className="text-xl font-semibold text-white">
              {formatDuration(filteredActivities.reduce((sum, a) => sum + a.duration, 0))}
            </p>
          </div>
          <div className="bg-[#13131a] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Avg Session</p>
            <p className="text-xl font-semibold text-white">
              {filteredActivities.length > 0
                ? formatDuration(
                    Math.round(
                      filteredActivities.reduce((sum, a) => sum + a.duration, 0) /
                        filteredActivities.length
                    )
                  )
                : '0m'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}