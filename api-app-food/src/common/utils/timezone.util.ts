/**
 * Timezone utility for Vietnam timezone (UTC+7)
 */

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_OFFSET_HOURS = 7;

/**
 * Get current date/time in Vietnam timezone
 * @returns Date object adjusted to Vietnam timezone
 */
export function nowVietnam(): Date {
  const now = new Date();
  // Add 7 hours to UTC to get Vietnam time
  return new Date(now.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Convert a date to Vietnam timezone
 * @param date Date to convert (can be string, number, or Date)
 * @returns Date object adjusted to Vietnam timezone
 */
export function toVietnamTime(date: string | number | Date): Date {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return nowVietnam();
  }
  return new Date(d.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Parse a date string and return in Vietnam timezone
 * If the string includes timezone info, it will be converted
 * If no timezone info, it will be treated as Vietnam time
 * @param dateString Date string from external API
 * @returns Date object
 */
export function parseToVietnamTime(dateString: string | undefined | null): Date {
  if (!dateString) {
    return nowVietnam();
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return nowVietnam();
  }

  // If the string doesn't include timezone info, assume it's already in local time
  // and just return as-is
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.match(/T\d{2}:\d{2}:\d{2}-/)) {
    return d;
  }

  // If it includes timezone info (like 'Z' for UTC or '+07:00'),
  // add Vietnam offset
  return new Date(d.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Format date to ISO string in Vietnam timezone
 * @param date Date to format
 * @returns ISO string with Vietnam time (but without timezone suffix)
 */
export function formatVietnamISO(date: Date): string {
  const vietnamDate = new Date(date.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
  return vietnamDate.toISOString().replace('Z', '+07:00');
}
