import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';

export function parsePosition(value: string, isAudio: boolean): number | null {
  if (isAudio) return parseHhmmToMinutes(value);
  return value.trim() === '' || Number.isNaN(Number(value)) ? null : Number(value);
}

export function formatPosition(value: number, isAudio: boolean): string {
  return isAudio ? formatMinutesAsHhmm(value) : String(value);
}
