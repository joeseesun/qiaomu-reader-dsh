export function shiftDayKey(dayKey, dayDelta) {
  const anchor = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(anchor.getTime())) return dayKey;
  anchor.setUTCDate(anchor.getUTCDate() + dayDelta);
  return anchor.toISOString().slice(0, 10);
}
export function readingStreak(dayLog, todayKey) {
  if (!dayLog) return 0;
  const readThatDay = (k) => (dayLog[k] || 0) > 0;
  let cursor = readThatDay(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  if (!readThatDay(cursor)) return 0;
  let streak = 0;
  while (streak < 4000 && readThatDay(cursor)) { streak += 1; cursor = shiftDayKey(cursor, -1); }
  return streak;
}
export function readingStats(dayLog, lifetimeSeconds, todayKey) {
  const log = dayLog || {};
  const dayKeys = Object.keys(log);
  let loggedSeconds = 0, daysRead = 0, best = 0, bestDay = "";
  for (const k of dayKeys) {
    const sec = log[k] || 0;
    loggedSeconds += sec;
    if (sec > 0) daysRead += 1;
    if (sec > best) { best = log[k]; bestDay = k; }
  }
  const recent = Array.from({ length: 14 }, (_, idx) => {
    const key = shiftDayKey(todayKey, idx - 13);
    return { key, sec: log[key] || 0 };
  });
  return {
    total: Math.max(lifetimeSeconds || 0, loggedSeconds),
    today: log[todayKey] || 0,
    streak: readingStreak(log, todayKey),
    daysRead,
    best,
    bestDay,
    avgPerDay: daysRead ? Math.round(loggedSeconds / daysRead) : 0,
    recent,
  };
}
