// Returner ISO-datoer uten UTC-tidssoneforskyvning.
export function localISODate(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function mondayOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return localISODate(d);
}
export function shiftISODate(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}
export function weekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => shiftISODate(monday, i));
}
