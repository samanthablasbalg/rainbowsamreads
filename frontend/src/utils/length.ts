import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';

export function parseLength(isAudio: boolean, value: string): number | null {
  return isAudio ? parseHhmmToMinutes(value) : parsePages(value);
}

export function formatLength(isAudio: boolean, value: number): string {
  return isAudio ? formatMinutesAsHhmm(value) : String(value);
}

export function lengthField(isAudio: boolean, knownLength: number | null, value: number) {
  return isAudio && knownLength === null
    ? { audio_length_minutes: value }
    : { length_override: value };
}

function parsePages(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0 ? Number(trimmed) : null;
}
