import * as ActivityStore from '../store/activity.store';
import { autoCategory } from './category.service';
import type { Activity, CreateActivityBody } from '../types';

function toDateString(iso: string): string {
  return iso.slice(0, 10);
}

export function createActivity(body: CreateActivityBody): Activity {
  const date = toDateString(body.startTime);
  const activities = ActivityStore.readDay(date);

  const category = body.category ?? autoCategory(body.appName, body.windowTitle, body.url);

  const activity: Activity = {
    id: ActivityStore.nextActivityId(activities),
    appName: body.appName,
    windowTitle: body.windowTitle,
    url: body.url,
    category,
    duration: body.duration,
    startTime: body.startTime,
    endTime: body.endTime,
    date,
  };

  activities.push(activity);
  ActivityStore.writeDay(date, activities);
  return activity;
}

export function listActivities(date: string): Activity[] {
  return ActivityStore.readDay(date).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
}

export function listActivitiesRange(from: string, to: string): Activity[] {
  return ActivityStore.readRange(from, to);
}

export function deleteActivity(id: number, date: string): boolean {
  const activities = ActivityStore.readDay(date);
  const filtered = activities.filter((a) => a.id !== id);
  if (filtered.length === activities.length) return false;
  ActivityStore.writeDay(date, filtered);
  return true;
}

export function availableDates(): string[] {
  return ActivityStore.availableDates();
}
