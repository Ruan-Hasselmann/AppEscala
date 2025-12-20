export function getDaysOfMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days: string[] = [];

  while (date.getMonth() === month) {
    days.push(date.toISOString().split("T")[0]);
    date.setDate(date.getDate() + 1);
  }

  return days;
}

/**
 * Converte YYYY-MM-DD em Date LOCAL sem timezone bug
 */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formata YYYY-MM-DD para pt-BR
 */
export function formatDateBR(date: string): string {
  return parseLocalDate(date).toLocaleDateString("pt-BR");
}
