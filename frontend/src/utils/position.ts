import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';

// A position in a read is a page number or a minute offset depending on the format, and
// both sheets that take one have to convert in both directions. The unit is a boolean at
// every call site because that is what the engagement carries -- a read is audio or it is
// not -- and passing it keeps the two conversions from drifting apart between the sheet
// that logs a position and the one that edits it.

// Null for anything that isn't a position, which is the state both sheets render as "enter
// a number"/"enter a time" and disable Save on. An empty field is null rather than 0: it
// is nothing entered yet, not a position at the start of the book.
export function parsePosition(value: string, isAudio: boolean): number | null {
  if (isAudio) return parseHhmmToMinutes(value);
  return value.trim() === '' || Number.isNaN(Number(value)) ? null : Number(value);
}

export function formatPosition(value: number, isAudio: boolean): string {
  return isAudio ? formatMinutesAsHhmm(value) : String(value);
}
