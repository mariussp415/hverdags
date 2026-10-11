import { localISODate } from './meal-dates.mjs';

// Calendar cells always begin on Monday; includes neighbouring days to complete the last week.
export function monthGrid(monthISO) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthISO)) throw new Error('Invalid month');
  const [year, month] = monthISO.split('-').map(Number);
  const first = new Date(year, month-1, 1, 12);
  const offset = (first.getDay()+6)%7;
  const daysInMonth = new Date(year,month,0,12).getDate();
  first.setDate(first.getDate()-offset);
  const cells = Math.ceil((offset+daysInMonth)/7)*7;
  return Array.from({length:cells},(_,index)=>{const day=new Date(first);day.setDate(day.getDate()+index);return localISODate(day);});
}
export function shiftMonth(monthISO, delta) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthISO)) throw new Error('Invalid month');
  const [year,month] = monthISO.split('-').map(Number);
  const date = new Date(year,month-1+delta,1,12);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
