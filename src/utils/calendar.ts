export function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];

  // Ajuste para começar no domingo
  const startOffset = firstDay.getDay();
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

export function getMonthName(year: number, month: number) {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
