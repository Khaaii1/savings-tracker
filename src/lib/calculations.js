// All money math for the savings tracker lives here, isolated from React and
// the DOM so it can be unit tested with plain `node --test` and reused if a
// backend is ever added.

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

/** Normalize a date (or ISO string) to midnight local time, stripping time-of-day noise. */
export function toMidnight(dateLike) {
  const d = new Date(dateLike);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(from, to) {
  return Math.round((toMidnight(to) - toMidnight(from)) / MS_PER_DAY);
}

/** Weeks remaining between two dates, always rounded UP so a partial week still counts. */
export function weeksRemainingBetween(from, to) {
  const days = daysBetween(from, to);
  if (days <= 0) return 0;
  return Math.ceil(days / 7);
}

export function clampMoney(n) {
  if (!Number.isFinite(n)) return 0;
  // avoid floating point dust like 2779.9999999998
  return Math.round(n * 100) / 100;
}

/**
 * The amount still needed to reach the target. Never negative — once the
 * goal is met (or the starting savings already covered it) there's nothing
 * left to save.
 */
export function amountRemaining(targetAmount, currentTotal) {
  return Math.max(0, clampMoney(targetAmount - currentTotal));
}

/**
 * The weekly savings rate actually required to reach the target by the
 * deadline, given today's totals. Returns Infinity if the deadline has
 * already passed and the goal isn't met (it can no longer be reached on
 * schedule), and 0 if there's nothing left to save.
 */
export function requiredWeeklyRate({ targetAmount, currentTotal, today, deadline }) {
  const remaining = amountRemaining(targetAmount, currentTotal);
  if (remaining <= 0) return 0;
  const weeksLeft = weeksRemainingBetween(today, deadline);
  if (weeksLeft <= 0) return Infinity;
  return clampMoney(remaining / weeksLeft);
}

/**
 * Builds the fixed benchmark schedule for the life of the plan: a straight
 * line from the starting savings up to the target, split evenly across the
 * weeks between the plan's start date and its deadline. This schedule is
 * the yardstick weekly check-ins are compared against, so it does NOT shift
 * every time a new check-in comes in — only when the goal, deadline, or
 * starting savings themselves change.
 *
 * Returns [] when the deadline is on or before the start date (nothing to
 * schedule) — callers should treat that as "deadline passed / invalid".
 */
export function buildSchedule({ startDate, deadline, startingSavings, targetAmount }) {
  const totalWeeks = weeksRemainingBetween(startDate, deadline);
  if (totalWeeks <= 0) return [];

  const totalToSave = targetAmount - startingSavings;
  const perWeek = totalToSave / totalWeeks;
  const start = toMidnight(startDate);
  const finalDeadline = toMidnight(deadline);

  const schedule = [];
  for (let week = 1; week <= totalWeeks; week++) {
    const isLastWeek = week === totalWeeks;
    // Every week is a full 7 days except a possible shorter final week,
    // which always lands exactly on the deadline date.
    const weekEnding = isLastWeek
      ? finalDeadline
      : new Date(start.getTime() + week * MS_PER_WEEK);

    const expectedCumulative = isLastWeek
      ? clampMoney(targetAmount) // avoid rounding drift on the last row
      : clampMoney(startingSavings + perWeek * week);

    schedule.push({ week, weekEnding, expectedCumulative });
  }
  return schedule;
}

export function statusFor(actual, expected, tolerance = 0.5) {
  if (actual == null) return "pending";
  const diff = actual - expected;
  if (Math.abs(diff) < tolerance) return "on-track";
  return diff > 0 ? "ahead" : "behind";
}

/**
 * Merges the fixed schedule with the user's logged check-ins (actual
 * cumulative savings as of each week ending). Any check-in for a week
 * number beyond the schedule (e.g. the deadline was pulled earlier after
 * entries already existed) is appended with the target amount as its
 * expected value, since by then the plan says the goal should be met.
 */
export function mergeScheduleWithEntries(schedule, entries, targetAmount) {
  const entryByWeek = new Map(entries.map((e) => [e.week, e]));
  const maxWeek = Math.max(schedule.length, ...entries.map((e) => e.week), 0);

  const rows = [];
  for (let week = 1; week <= maxWeek; week++) {
    const scheduled = schedule.find((s) => s.week === week);
    const entry = entryByWeek.get(week);
    const expectedCumulative = scheduled ? scheduled.expectedCumulative : clampMoney(targetAmount);
    const actual = entry ? clampMoney(entry.actual) : null;
    const weekEnding = scheduled ? scheduled.weekEnding : entry ? new Date(entry.weekEnding) : null;

    rows.push({
      week,
      weekEnding,
      expectedCumulative,
      actual,
      difference: actual == null ? null : clampMoney(actual - expectedCumulative),
      status: statusFor(actual, expectedCumulative),
    });
  }
  return rows;
}

/** The user's most recently logged total, or the plan's starting savings if nothing's logged yet. */
export function latestSavings(entries, startingSavings) {
  if (!entries.length) return clampMoney(startingSavings);
  const latest = [...entries].sort((a, b) => b.week - a.week)[0];
  return clampMoney(latest.actual);
}

/**
 * Average per-week change observed across logged entries, used to project
 * where savings will land by the deadline if that real-world pace holds.
 * Falls back to the user's stated weekly goal when there isn't enough data
 * yet (fewer than 1 entry) to observe a real pace.
 */
export function observedWeeklyRate(entries, startingSavings, fallbackWeeklyGoal) {
  if (!entries.length) return fallbackWeeklyGoal;
  const sorted = [...entries].sort((a, b) => a.week - b.week);
  const last = sorted[sorted.length - 1];
  const totalSaved = last.actual - startingSavings;
  return clampMoney(totalSaved / last.week);
}

export function projectedFinal({ currentTotal, weeklyRate, today, deadline }) {
  const weeksLeft = weeksRemainingBetween(today, deadline);
  return clampMoney(currentTotal + weeklyRate * weeksLeft);
}

export function percentComplete(currentTotal, targetAmount) {
  if (targetAmount <= 0) return 0;
  return Math.max(0, Math.min(100, (currentTotal / targetAmount) * 100));
}

/**
 * The single overall "am I on pace" verdict for the dashboard: compares
 * what the schedule says should be saved as of today against what's
 * actually been saved (the latest logged total).
 */
export function overallStatus({ schedule, currentTotal, today, targetAmount }) {
  if (currentTotal >= targetAmount) return "ahead"; // goal already reached reads as "ahead"
  if (!schedule.length) return "behind"; // deadline passed without hitting the goal
  const start = schedule[0];
  const pastRows = schedule.filter((row) => toMidnight(row.weekEnding) <= toMidnight(today));
  const benchmarkRow = pastRows.length ? pastRows[pastRows.length - 1] : start;
  return statusFor(currentTotal, benchmarkRow.expectedCumulative);
}

export function formatCurrency(n) {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: safe % 1 === 0 ? 0 : 2,
  });
}

export function formatDate(dateLike) {
  if (!dateLike) return "—";
  return toMidnight(dateLike).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Maps an arbitrary logged date to the same week-numbering scheme
 * `buildSchedule` uses (week 1 = the first 7 days after the plan's start
 * date, etc.), so a deposit logged for any date lands in the right row of
 * the weekly check-in table. Dates on or before the start date are folded
 * into week 1 rather than producing a week 0 or a negative week.
 */
export function weekIndexForDate(startDate, date) {
  const days = daysBetween(startDate, date);
  if (days <= 0) return 1;
  return Math.ceil(days / 7);
}

/**
 * The running cumulative total immediately before a given week — i.e. the
 * most recent logged entry that comes earlier than `week`, or the plan's
 * starting savings if nothing earlier has been logged yet. Used so that
 * logging a deposit adds on top of whatever was already saved, rather than
 * overwriting it.
 */
export function cumulativeBeforeWeek(entries, week, startingSavings) {
  const prior = entries
    .filter((e) => e.week < week)
    .sort((a, b) => b.week - a.week)[0];
  return clampMoney(prior ? prior.actual : startingSavings);
}

/**
 * The history log needs the exact time something was logged, not just the
 * calendar date, so these format from the raw timestamp directly instead
 * of going through `toMidnight` (which intentionally discards time-of-day
 * for the week-scheduling math elsewhere in this file).
 */
export function formatFullDate(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "September 1, 2026 at 1:45 PM" */
export function formatFullDateTime(timestamp) {
  if (!timestamp) return "—";
  return `${formatFullDate(timestamp)} at ${formatTime(timestamp)}`;
}

/** e.g. "+$50.00" — history entries are always positive deposits, and
 * always show cents (unlike `formatCurrency`, which drops them for whole
 * dollar amounts elsewhere in the app), since a per-transaction log reads
 * more like a receipt.
 */
export function formatSignedCurrency(n) {
  const amount = Math.abs(Number(n) || 0);
  const formatted = amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `+${formatted}`;
}

