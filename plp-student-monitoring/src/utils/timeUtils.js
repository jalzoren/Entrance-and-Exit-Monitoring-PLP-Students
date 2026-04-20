/**
 * timeUtils.js - Client-side time utilities
 * No backend dependency - all calculations done locally
 */

/**
 * Get current time in Philippine timezone
 * Returns: JS Date object adjusted for PH timezone
 */
export function getPhilippineTime() {
  return new Date();
}

/**
 * Format Philippine time for display
 * Returns: { day, date, time }
 */
export function formatPhilippineTime(date) {
  const day = date.toLocaleDateString("en-PH", { weekday: "long" }).toUpperCase();
  const dateStr = date.toLocaleDateString("en-PH", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "2-digit" 
  });
  const timeStr = date.toLocaleTimeString("en-PH", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true 
  });
  return { day, date: dateStr, time: timeStr };
}

/**
 * Get today's date range in Philippine time (for database queries)
 * Returns: { dayStart, dayEnd } in "YYYY-MM-DD HH:MM:SS" format
 */
export function getTodayPhRange() {
  const now = new Date();
  
  // Get Philippine date string
  const phDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  
  const dayStart = `${phDateStr} 00:00:00`;
  const dayEnd = `${phDateStr} 23:59:59`;
  
  return { dayStart, dayEnd };
}

/**
 * Format date range for display (e.g. "Apr 13 - Apr 20, 2026")
 */
export function formatDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  
  const fmt = (d) => 
    d.toLocaleDateString("en-PH", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Format peak hour for display
 * Input: { hour: 8, total: 45 }
 * Output: "8:00 AM (45 entries)"
 */
export function formatPeakHour(peakHour) {
  if (!peakHour) return null;
  
  const { hour, total } = peakHour;
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  
  const label = d.toLocaleTimeString("en-PH", { 
    hour: "numeric", 
    minute: "2-digit", 
    hour12: true 
  });
  
  return `${label} (${total} entries)`;
}

/**
 * Get time in milliseconds for server sync
 */
export function getNowMs() {
  return Date.now();
}

export default {
  getPhilippineTime,
  formatPhilippineTime,
  getTodayPhRange,
  formatDateRange,
  formatPeakHour,
  getNowMs,
};
