'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/recurrence.js');

const ymd = (d) => d.toISOString().slice(0, 10);

test('leap years', () => {
  assert.equal(R.isLeapYear(2024), true);
  assert.equal(R.isLeapYear(2027), false);
  assert.equal(R.isLeapYear(1900), false);
  assert.equal(R.isLeapYear(2000), true);
  assert.equal(R.daysInYear(2024), 366);
  assert.equal(R.daysInYear(2027), 365);
  assert.equal(R.daysInMonth(2024, 2), 29);
  assert.equal(R.daysInMonth(2027, 2), 28);
});

test('yearly expands to one date', () => {
  const dates = R.expandEvent({ recurrence: { type: 'yearly', month: 5, day: 17 } }, 2027);
  assert.deepEqual(dates.map(ymd), ['2027-05-17']);
});

test('yearly clamps day to month length', () => {
  const dates = R.expandEvent({ recurrence: { type: 'yearly', month: 2, day: 31 } }, 2027);
  assert.deepEqual(dates.map(ymd), ['2027-02-28']);
});

test('quarterly expands to four dates in the right months', () => {
  const dates = R.expandEvent({ recurrence: { type: 'quarterly', monthInQuarter: 2, day: 10 } }, 2027);
  assert.deepEqual(dates.map(ymd), ['2027-02-10', '2027-05-10', '2027-08-10', '2027-11-10']);
});

test('monthly clamps and supports "last"', () => {
  const d31 = R.expandEvent({ recurrence: { type: 'monthly', day: 31 } }, 2024);
  assert.equal(d31.length, 12);
  assert.equal(ymd(d31[1]), '2024-02-29');
  assert.equal(ymd(d31[3]), '2024-04-30');
  const last = R.expandEvent({ recurrence: { type: 'monthly', day: 'last' } }, 2027);
  assert.equal(ymd(last[1]), '2027-02-28');
  assert.equal(ymd(last[11]), '2027-12-31');
});

test('daily gives every day of the year', () => {
  const days = R.expandEvent({ recurrence: { type: 'daily' } }, 2027);
  assert.equal(days.length, 365);
  assert.equal(ymd(days[0]), '2027-01-01');
  assert.equal(ymd(days[364]), '2027-12-31');
  assert.equal(R.expandEvent({ recurrence: { type: 'daily' } }, 2024).length, 366);
});

test('season limits repeating events, also across New Year', () => {
  const months = (ds) => [...new Set(ds.map((d) => d.getUTCMonth() + 1))];
  const lawn = R.expandEvent({ recurrence: { type: 'weekly', weekday: 5, fromMonth: 5, toMonth: 9 } }, 2027);
  assert.deepEqual(months(lawn), [5, 6, 7, 8, 9]);
  const snow = R.expandEvent({ recurrence: { type: 'weekly', weekday: 5, fromMonth: 12, toMonth: 3 } }, 2027);
  assert.deepEqual(months(snow), [1, 2, 3, 12]);
  const monthly = R.expandEvent({ recurrence: { type: 'monthly', day: 1, fromMonth: 6, toMonth: 6 } }, 2027);
  assert.deepEqual(monthly.map(ymd), ['2027-06-01']);
  const daily = R.expandEvent({ recurrence: { type: 'daily', fromMonth: 2, toMonth: 2 } }, 2028);
  assert.equal(daily.length, 29);
});

test('weekly gives 52 or 53 dates on the right weekday', () => {
  // 2027 starts on a Friday (weekday index 4) -> 53 Fridays
  const fridays = R.expandEvent({ recurrence: { type: 'weekly', weekday: 4 } }, 2027);
  assert.equal(fridays.length, 53);
  assert.equal(ymd(fridays[0]), '2027-01-01');
  assert.ok(fridays.every((d) => R.weekdayMon0(d) === 4));
  const mondays = R.expandEvent({ recurrence: { type: 'weekly', weekday: 0 } }, 2027);
  assert.equal(mondays.length, 52);
  assert.equal(ymd(mondays[0]), '2027-01-04');
  // 2024 is a leap year starting Monday -> 53 Mondays and 53 Tuesdays
  assert.equal(R.expandEvent({ recurrence: { type: 'weekly', weekday: 0 } }, 2024).length, 53);
  assert.equal(R.expandEvent({ recurrence: { type: 'weekly', weekday: 1 } }, 2024).length, 53);
  assert.equal(R.expandEvent({ recurrence: { type: 'weekly', weekday: 2 } }, 2024).length, 52);
});

test('unknown types expand to nothing', () => {
  assert.deepEqual(R.expandEvent({ recurrence: { type: 'bogus' } }, 2027), []);
  assert.deepEqual(R.expandEvent({}, 2027), []);
});

test('angles start at 0 and end just under 360', () => {
  assert.equal(R.angleFor(R.makeDate(2027, 1, 1), 2027), 0);
  const last = R.angleFor(R.makeDate(2027, 12, 31), 2027);
  assert.ok(last < 360 && last > 359);
  assert.equal(R.monthStartAngle(2027, 1), 0);
  assert.equal(R.monthEndAngle(2027, 12), 360);
  assert.ok(Math.abs(R.monthStartAngle(2027, 7) - 180) < 2);
});

test('ISO week numbers', () => {
  assert.equal(R.isoWeek(R.makeDate(2027, 1, 1)), 53); // Fri 1 Jan 2027 belongs to week 53 of 2026
  assert.equal(R.isoWeek(R.makeDate(2027, 1, 4)), 1);
  assert.equal(R.isoWeek(R.makeDate(2024, 1, 1)), 1);
  assert.equal(R.isoWeek(R.makeDate(2026, 12, 31)), 53);
  assert.equal(R.isoWeek(R.makeDate(2025, 12, 29)), 1); // week 1 of 2026
  const weeks = R.isoWeeksInYear(2027);
  assert.equal(weeks[0].week, 53);
  assert.equal(ymd(weeks[0].date), '2027-01-01');
  assert.equal(weeks[1].week, 1);
  assert.equal(ymd(weeks[1].date), '2027-01-04');
  assert.equal(weeks[weeks.length - 1].week, 52);
});
