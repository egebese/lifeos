// Local-time YYYY-MM-DD utilities. Avoid `toISOString().slice(0,10)` which is UTC
// and silently rolls the date over near midnight.

export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function todayKey(): string {
  return ymdLocal(new Date());
}

// Build an ISO timestamp anchored to the given YYYY-MM-DD in local time.
// If the date is today, use the current time-of-day so meals show their real
// clock time. For past dates, pick noon so they unambiguously land in that day
// regardless of UTC offset.
export function isoForDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const now = new Date();
  const sameDay =
    now.getFullYear() === y &&
    now.getMonth() === m - 1 &&
    now.getDate() === d;
  const dt = sameDay
    ? new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds())
    : new Date(y, m - 1, d, 12, 0, 0);
  return dt.toISOString();
}
