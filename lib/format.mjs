export function tidy(value, max = 100) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}
export function isValidTask(value) {
  return tidy(value).length > 0;
}
export function isSameDay(date, now = new Date()) {
  if (!date) return false;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return date.slice(0, 10) === `${y}-${m}-${d}`;
}
