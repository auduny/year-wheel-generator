/* Pure date logic for expanding recurring events into concrete dates.
 * No DOM access. Loaded as a plain script in the browser and via require() in tests. */
(function (root) {
  'use strict';

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInYear(year) {
    return isLeapYear(year) ? 366 : 365;
  }

  // month is 1..12
  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  // All dates are built in UTC to avoid DST surprises.
  function makeDate(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day));
  }

  function clampDay(year, month, day) {
    if (day === 'last') return daysInMonth(year, month);
    const max = daysInMonth(year, month);
    const d = Number(day);
    if (!Number.isFinite(d) || d < 1) return 1;
    return Math.min(d, max);
  }

  // 1-based day of year
  function dayOfYear(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.floor((date.getTime() - start) / 86400000) + 1;
  }

  // Monday = 0 ... Sunday = 6
  function weekdayMon0(date) {
    return (date.getUTCDay() + 6) % 7;
  }

  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7; // Sunday -> 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of this ISO week
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  }

  // Returns the Monday that starts each ISO week touching the given year,
  // as [{week, date}] where date is clamped to Jan 1 for the first partial week.
  function isoWeeksInYear(year) {
    const out = [];
    const jan1 = makeDate(year, 1, 1);
    const dec31 = makeDate(year, 12, 31);
    let cursor = new Date(jan1.getTime());
    // walk back to Monday
    cursor.setUTCDate(cursor.getUTCDate() - weekdayMon0(cursor));
    while (cursor <= dec31) {
      const visible = cursor < jan1 ? jan1 : new Date(cursor.getTime());
      const thursday = new Date(cursor.getTime());
      thursday.setUTCDate(thursday.getUTCDate() + 3);
      out.push({ week: isoWeek(thursday), date: visible, start: new Date(cursor.getTime()) });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return out;
  }

  // Optional season on weekly, monthly and daily events: fromMonth..toMonth
  // inclusive, wrapping past New Year when fromMonth > toMonth (e.g. Nov–Mar).
  function hasSeason(r) {
    return !!r && r.fromMonth >= 1 && r.fromMonth <= 12 && r.toMonth >= 1 && r.toMonth <= 12;
  }

  function inSeason(r, month) {
    if (!hasSeason(r)) return true;
    return r.fromMonth <= r.toMonth
      ? month >= r.fromMonth && month <= r.toMonth
      : month >= r.fromMonth || month <= r.toMonth;
  }

  function expandEvent(event, year) {
    const r = event && event.recurrence;
    if (!r) return [];
    return expandRule(r, year).filter((d) => inSeason(r, d.getUTCMonth() + 1));
  }

  function expandRule(r, year) {
    switch (r.type) {
      case 'yearly': {
        const month = Math.min(Math.max(Number(r.month) || 1, 1), 12);
        return [makeDate(year, month, clampDay(year, month, r.day))];
      }
      case 'quarterly': {
        const offset = Math.min(Math.max(Number(r.monthInQuarter) || 1, 1), 3);
        const dates = [];
        for (let q = 0; q < 4; q++) {
          const month = q * 3 + offset;
          dates.push(makeDate(year, month, clampDay(year, month, r.day)));
        }
        return dates;
      }
      case 'monthly': {
        const dates = [];
        for (let month = 1; month <= 12; month++) {
          dates.push(makeDate(year, month, clampDay(year, month, r.day)));
        }
        return dates;
      }
      case 'weekly': {
        const weekday = Math.min(Math.max(Number(r.weekday) || 0, 0), 6);
        const dates = [];
        const first = makeDate(year, 1, 1);
        const shift = (weekday - weekdayMon0(first) + 7) % 7;
        const cursor = new Date(first.getTime());
        cursor.setUTCDate(cursor.getUTCDate() + shift);
        while (cursor.getUTCFullYear() === year) {
          dates.push(new Date(cursor.getTime()));
          cursor.setUTCDate(cursor.getUTCDate() + 7);
        }
        return dates;
      }
      case 'daily': {
        const dates = [];
        const cursor = makeDate(year, 1, 1);
        while (cursor.getUTCFullYear() === year) {
          dates.push(new Date(cursor.getTime()));
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        return dates;
      }
      default:
        return [];
    }
  }

  // 0 degrees at 12 o'clock, increasing clockwise. Jan 1 -> 0.
  function angleFor(date, year) {
    return ((dayOfYear(date) - 1) / daysInYear(year)) * 360;
  }

  // Angle at the START of a given day-of-year (1-based) and the end of it.
  function angleForDayOfYear(doy, year) {
    return ((doy - 1) / daysInYear(year)) * 360;
  }

  function monthStartAngle(year, month) {
    return angleFor(makeDate(year, month, 1), year);
  }

  function monthEndAngle(year, month) {
    if (month === 12) return 360;
    return monthStartAngle(year, month + 1);
  }

  const api = {
    isLeapYear, daysInYear, daysInMonth, makeDate, clampDay, dayOfYear,
    weekdayMon0, isoWeek, isoWeeksInYear, hasSeason, inSeason, expandEvent, angleFor,
    angleForDayOfYear, monthStartAngle, monthEndAngle,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Recurrence = api;
})(typeof window !== 'undefined' ? window : globalThis);
