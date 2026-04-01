import type { Activity, CategoryDefinition, ProductivityType } from '../types';

export type ContextSwitchMode = 'all' | 'productivity-only';

type TimelineBar = Activity & {
  productivityType: ProductivityType;
  visibleDuration: number;
  left: number;
  width: number;
};

function getProductivityType(
  category: string,
  categoryDefinitions: CategoryDefinition[],
): ProductivityType {
  return (
    categoryDefinitions.find((c) => c.name === category)?.productivityType ?? 'neutral'
  );
}

function buildTimelineBars(
  activities: Activity[],
  categoryDefinitions: CategoryDefinition[],
  startHour: number,
  endHour: number,
): TimelineBar[] {
  const windowStartMin = startHour * 60;
  const windowEndMin = endHour * 60;
  const totalMins = Math.max(windowEndMin - windowStartMin, 1);

  return activities
    .filter((activity) => !activity.excludeFromAnalytics)
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
        productivityType: getProductivityType(activity.category, categoryDefinitions),
        visibleDuration: durationInWindow,
      };
    })
    .filter(Boolean) as TimelineBar[];
}

function shouldMergeForOverview(
  prev: TimelineBar,
  current: TimelineBar,
  next: TimelineBar | undefined,
  contextSwitchMinMinutes = 1,
) {
  if (!next) return false;
  if (current.visibleDuration >= contextSwitchMinMinutes) return false;
  return prev.productivityType === next.productivityType;
}

function mergeTimelineForOverview(items: TimelineBar[]): TimelineBar[] {
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
        const mergedDuration =
          prev.visibleDuration + current.visibleDuration + next.visibleDuration;
        const mergedLeft = prev.left;
        const mergedWidth = next.left + next.width - prev.left;

        nextPass[nextPass.length - 1] = {
          ...prev,
          duration: prev.duration + current.duration + next.duration,
          endTime: next.endTime,
          visibleDuration: mergedDuration,
          left: mergedLeft,
          width: mergedWidth,
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
}

export function getContextSwitchCount(params: {
  activities: Activity[];
  categoryDefinitions: CategoryDefinition[];
  startHour: number;
  endHour: number;
  mode: ContextSwitchMode;
}): number {
  const { activities, categoryDefinitions, startHour, endHour, mode } = params;

  const timelineData = mergeTimelineForOverview(
    buildTimelineBars(activities, categoryDefinitions, startHour, endHour),
  );

  if (mode === 'all') {
    return timelineData.reduce((count, activity, index) => {
      if (index === 0) return count;
      return timelineData[index - 1].category === activity.category ? count : count + 1;
    }, 0);
  }

  let count = 0;
  let lastCountedState: 'productive' | 'non_productive' | null = null;

  for (const activity of timelineData) {
    const state = activity.productivityType;

    if (state !== 'productive' && state !== 'non_productive') continue;

    if (lastCountedState === null) {
      lastCountedState = state;
      continue;
    }

    if (state !== lastCountedState) {
      count += 1;
      lastCountedState = state;
      continue;
    }

    lastCountedState = state;
  }

  return count;
}