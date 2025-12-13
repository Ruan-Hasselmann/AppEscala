export function getDaysOfMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days: string[] = [];

  while (date.getMonth() === month) {
    days.push(date.toISOString().split("T")[0]);
    date.setDate(date.getDate() + 1);
  }

  return days;
}
