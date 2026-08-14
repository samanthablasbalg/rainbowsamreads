export function formatMinutesAsHhmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseHhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const [, hours, minutes] = match;
  return Number(hours) * 60 + Number(minutes);
}
