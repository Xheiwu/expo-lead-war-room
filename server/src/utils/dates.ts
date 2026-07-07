export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export function formatDateTime(date?: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("zh-CN", { hour12: false });
}

export function isTimeInRange(now: Date, start: string, end: string) {
  const hhmm = now.toTimeString().slice(0, 5);
  return hhmm >= start && hhmm <= end;
}

export function isTodayRange() {
  return { gte: startOfToday(), lte: endOfToday() };
}
