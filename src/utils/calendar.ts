export function formatDateDayMonth(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}`;
}
