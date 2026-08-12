// Audio positions are logged as raw minutes (the unit the API and the "must advance
// past resume" check both use) but displayed and typed as HH:MM, matching how a
// player shows elapsed time.
export function formatMinutesAsHhmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Returns null for anything that isn't HH:MM, rather than guessing -- the caller
// disables Save on null instead of sending a malformed position.
export function parseHhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const [, hours, minutes] = match;
  return Number(hours) * 60 + Number(minutes);
}
