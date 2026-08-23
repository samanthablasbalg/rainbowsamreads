import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';

// A length is pages or minutes depending on the format, and every sheet that asks for one
// has to switch on that in three places: reading the field, showing a known value back,
// and naming the field on the way out.

export function parseLength(isAudio: boolean, value: string): number | null {
  return isAudio ? parseHhmmToMinutes(value) : parsePages(value);
}

export function formatLength(isAudio: boolean, value: number): string {
  return isAudio ? formatMinutesAsHhmm(value) : String(value);
}

// An audio length is the first one this book has ever had, so it's a fact about the audio
// edition and gets captured there (ADR-0022). Every other length is a correction to one
// that already exists, which belongs to this read alone as a binding override (ADR-0021).
export function lengthField(isAudio: boolean, knownLength: number | null, value: number) {
  return isAudio && knownLength === null
    ? { audio_length_minutes: value }
    : { length_override: value };
}

function parsePages(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0 ? Number(trimmed) : null;
}
