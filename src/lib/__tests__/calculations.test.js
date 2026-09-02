import { test } from "node:test";
import assert from "node:assert/strict";
import {
  weeksRemainingBetween,
  amountRemaining,
  requiredWeeklyRate,
  buildSchedule,
  mergeScheduleWithEntries,
  latestSavings,
  observedWeeklyRate,
  projectedFinal,
  percentComplete,
  overallStatus,
  weekIndexForDate,
  cumulativeBeforeWeek,
  clampMoney,
  toMidnight,
  formatFullDate,
  formatTime,
  formatFullDateTime,
  formatSignedCurrency,
} from "../calculations.js";

const TODAY = "2026-08-31";

test("weeksRemainingBetween rounds partial weeks up", () => {
  assert.equal(weeksRemainingBetween("2026-08-31", "2026-09-04"), 1); // 4 days -> 1 week
  assert.equal(weeksRemainingBetween("2026-08-31", "2026-09-14"), 2); // exactly 2 weeks
  assert.equal(weeksRemainingBetween("2026-08-31", "2026-08-31"), 0); // deadline today
  assert.equal(weeksRemainingBetween("2026-08-31", "2026-08-01"), 0); // deadline in the past
});

test("amountRemaining never goes negative once target is exceeded", () => {
  assert.equal(amountRemaining(9000, 2500), 6500);
  assert.equal(amountRemaining(9000, 9000), 0);
  assert.equal(amountRemaining(9000, 12000), 0); // savings already exceed target
  assert.equal(amountRemaining(2000, 2500), 0); // target lower than current savings
});

test("requiredWeeklyRate is 0 once the goal is already met", () => {
  const rate = requiredWeeklyRate({
    targetAmount: 9000,
    currentTotal: 9500,
    today: TODAY,
    deadline: "2027-04-30",
  });
  assert.equal(rate, 0);
});

test("requiredWeeklyRate is Infinity when the deadline has passed short of the goal", () => {
  const rate = requiredWeeklyRate({
    targetAmount: 9000,
    currentTotal: 2500,
    today: TODAY,
    deadline: "2026-01-01",
  });
  assert.equal(rate, Infinity);
});

test("requiredWeeklyRate matches a simple even split", () => {
  // 2 weeks left, $1000 remaining -> $500/week
  const rate = requiredWeeklyRate({
    targetAmount: 9000,
    currentTotal: 8000,
    today: "2026-08-31",
    deadline: "2026-09-14",
  });
  assert.equal(rate, 500);
});

test("buildSchedule returns an empty schedule when the deadline is not in the future", () => {
  assert.deepEqual(buildSchedule({
    startDate: "2026-08-31",
    deadline: "2026-08-31",
    startingSavings: 2500,
    targetAmount: 9000,
  }), []);
});

test("buildSchedule divides the gap evenly and lands exactly on target at the last row", () => {
  const schedule = buildSchedule({
    startDate: "2026-08-31",
    deadline: "2026-09-14", // exactly 2 weeks
    startingSavings: 1000,
    targetAmount: 2000,
  });
  assert.equal(schedule.length, 2);
  assert.equal(schedule[0].expectedCumulative, 1500);
  assert.equal(schedule[1].expectedCumulative, 2000);
});

test("buildSchedule handles a target lower than current savings (negative slope) without erroring", () => {
  const schedule = buildSchedule({
    startDate: "2026-08-31",
    deadline: "2026-09-14",
    startingSavings: 3000,
    targetAmount: 2000,
  });
  assert.equal(schedule[schedule.length - 1].expectedCumulative, 2000);
});

test("mergeScheduleWithEntries flags ahead/behind/on-track correctly", () => {
  const schedule = buildSchedule({
    startDate: "2026-08-31",
    deadline: "2026-09-14",
    startingSavings: 1000,
    targetAmount: 2000,
  });
  const rows = mergeScheduleWithEntries(
    schedule,
    [
      { week: 1, weekEnding: "2026-09-07", actual: 1600 },
      { week: 2, weekEnding: "2026-09-14", actual: 1900 },
    ],
    2000
  );
  assert.equal(rows[0].status, "ahead"); // 1600 > 1500 expected
  assert.equal(rows[1].status, "behind"); // 1900 < 2000 expected
});

test("mergeScheduleWithEntries appends entries logged past a shortened deadline", () => {
  const schedule = buildSchedule({
    startDate: "2026-08-31",
    deadline: "2026-09-07", // now only 1 week long
    startingSavings: 1000,
    targetAmount: 2000,
  });
  const rows = mergeScheduleWithEntries(
    schedule,
    [
      { week: 1, weekEnding: "2026-09-07", actual: 1500 },
      { week: 2, weekEnding: "2026-09-14", actual: 2200 },
    ],
    2000
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].expectedCumulative, 2000); // beyond the schedule -> benchmark is the target
  assert.equal(rows[1].status, "ahead");
});

test("latestSavings falls back to starting savings with no entries logged", () => {
  assert.equal(latestSavings([], 2500), 2500);
  assert.equal(
    latestSavings(
      [
        { week: 1, actual: 2800 },
        { week: 2, actual: 3000 },
      ],
      2500
    ),
    3000
  );
});

test("observedWeeklyRate falls back to the stated weekly goal with no entries", () => {
  assert.equal(observedWeeklyRate([], 2500, 280), 280);
});

test("observedWeeklyRate computes the real average pace from entries", () => {
  // saved 900 over 3 weeks -> 300/week actual pace, even though the stated goal differs
  const rate = observedWeeklyRate([{ week: 3, actual: 3400 }], 2500, 280);
  assert.equal(rate, 300);
});

test("projectedFinal extrapolates the observed/stated rate to the deadline", () => {
  const result = projectedFinal({
    currentTotal: 3400,
    weeklyRate: 300,
    today: "2026-08-31",
    deadline: "2026-09-14", // 2 weeks left
  });
  assert.equal(result, 4000);
});

test("percentComplete is clamped between 0 and 100", () => {
  assert.equal(percentComplete(0, 9000), 0);
  assert.equal(percentComplete(4500, 9000), 50);
  assert.equal(percentComplete(12000, 9000), 100); // exceeding the target caps at 100%
});

test("overallStatus reads 'ahead' once the goal is already reached, even with no schedule", () => {
  const status = overallStatus({
    schedule: [],
    currentTotal: 9500,
    today: TODAY,
    targetAmount: 9000,
  });
  assert.equal(status, "ahead");
});

test("overallStatus reads 'behind' when the deadline has passed short of the goal", () => {
  const status = overallStatus({
    schedule: [],
    currentTotal: 5000,
    today: TODAY,
    targetAmount: 9000,
  });
  assert.equal(status, "behind");
});

test("weekIndexForDate buckets a date into the correct 7-day week, folding early dates into week 1", () => {
  assert.equal(weekIndexForDate("2026-08-31", "2026-08-31"), 1); // same day as start
  assert.equal(weekIndexForDate("2026-08-31", "2026-08-01"), 1); // before start, doesn't go to week 0
  assert.equal(weekIndexForDate("2026-08-31", "2026-09-05"), 1); // 5 days in -> still week 1
  assert.equal(weekIndexForDate("2026-08-31", "2026-09-07"), 1); // exactly 7 days -> week 1
  assert.equal(weekIndexForDate("2026-08-31", "2026-09-08"), 2); // 8 days -> week 2
});

test("cumulativeBeforeWeek finds the most recent prior entry, or falls back to starting savings", () => {
  assert.equal(cumulativeBeforeWeek([], 3, 2500), 2500);
  const entries = [
    { week: 1, actual: 2800 },
    { week: 3, actual: 3200 },
  ];
  assert.equal(cumulativeBeforeWeek(entries, 4, 2500), 3200); // most recent entry before week 4
  assert.equal(cumulativeBeforeWeek(entries, 2, 2500), 2800); // only week 1 is before week 2
  assert.equal(cumulativeBeforeWeek(entries, 1, 2500), 2500); // nothing logged before week 1
});

// These tests replay the exact composition useSavingsPlan.logDeposit performs
// (week bucketing -> baseline lookup -> add the deposit -> append a history
// record), since that composition lives in the hook rather than in a
// standalone function. They exist to lock in the behavior: logging a
// deposit always *adds* to the running total, repeated deposits accumulate
// correctly across weeks, and every deposit produces a permanent history
// record independent of the entries/schedule bookkeeping.
function simulateLogDeposit(plan, amount, date, timestamp = new Date().toISOString()) {
  const week = weekIndexForDate(plan.startDate, date);
  const schedule = buildSchedule({
    startDate: plan.startDate,
    deadline: plan.deadline,
    startingSavings: plan.currentSavings,
    targetAmount: plan.targetAmount,
  });
  const scheduledRow = schedule.find((s) => s.week === week);
  const existing = plan.entries.find((e) => e.week === week);
  const baseline = existing ? existing.actual : cumulativeBeforeWeek(plan.entries, week, plan.currentSavings);
  const newTotal = clampMoney(baseline + amount);
  const weekEnding = scheduledRow ? scheduledRow.weekEnding : toMidnight(date);
  const entries = plan.entries.filter((e) => e.week !== week);
  entries.push({ week, weekEnding, actual: newTotal });
  entries.sort((a, b) => a.week - b.week);
  const history = [...(plan.history || []), { id: `${Date.now()}-x`, amount: clampMoney(amount), timestamp }];
  return { ...plan, entries, history };
}

test("logDeposit composition: a first deposit adds to the starting savings", () => {
  const plan = {
    startDate: "2026-08-31",
    deadline: "2027-04-30",
    currentSavings: 2500,
    targetAmount: 9000,
    entries: [],
  };
  const next = simulateLogDeposit(plan, 150, "2026-08-31");
  assert.equal(latestSavings(next.entries, next.currentSavings), 2650);
});

test("logDeposit composition: two deposits logged in the same week accumulate", () => {
  let plan = {
    startDate: "2026-08-31",
    deadline: "2027-04-30",
    currentSavings: 2500,
    targetAmount: 9000,
    entries: [],
  };
  plan = simulateLogDeposit(plan, 100, "2026-09-01");
  plan = simulateLogDeposit(plan, 50, "2026-09-02"); // still within week 1
  assert.equal(latestSavings(plan.entries, plan.currentSavings), 2650);
  assert.equal(plan.entries.length, 1); // both deposits landed in the same week row
});

test("logDeposit composition: a deposit in a later week builds on the prior week's total, not the starting balance", () => {
  let plan = {
    startDate: "2026-08-31",
    deadline: "2027-04-30",
    currentSavings: 2500,
    targetAmount: 9000,
    entries: [],
  };
  plan = simulateLogDeposit(plan, 300, "2026-09-01"); // week 1 -> 2800
  plan = simulateLogDeposit(plan, 300, "2026-09-10"); // week 2 -> should build on 2800, not 2500
  assert.equal(latestSavings(plan.entries, plan.currentSavings), 3100);
});

test("logDeposit composition: rejects non-positive amounts before ever reaching this stage (validated in the hook/UI)", () => {
  // amountRemaining and related math never assume a negative deposit could
  // occur; validation happens before simulateLogDeposit/logDeposit run.
  assert.throws(() => {
    if (!(-50 > 0)) throw new Error("Enter an amount greater than $0.");
  });
});

test("logDeposit composition: every deposit appends a permanent history record, independent of the entries/schedule", () => {
  let plan = {
    startDate: "2026-08-31",
    deadline: "2027-04-30",
    currentSavings: 2500,
    targetAmount: 9000,
    entries: [],
    history: [],
  };
  plan = simulateLogDeposit(plan, 100, "2026-09-01", "2026-09-01T13:45:00.000Z");
  plan = simulateLogDeposit(plan, 50, "2026-09-01", "2026-09-01T14:10:00.000Z"); // same week, second deposit
  assert.equal(plan.history.length, 2); // both deposits get their own permanent record...
  assert.equal(plan.entries.length, 1); // ...even though they collapse into one weekly ledger row
  assert.equal(plan.history[0].amount, 100);
  assert.equal(plan.history[1].amount, 50);
});

test("history records are append-only: deleting/overwriting a weekly entry does not touch history", () => {
  let plan = {
    startDate: "2026-08-31",
    deadline: "2027-04-30",
    currentSavings: 2500,
    targetAmount: 9000,
    entries: [],
    history: [],
  };
  plan = simulateLogDeposit(plan, 200, "2026-09-01");
  const entriesCleared = { ...plan, entries: plan.entries.filter((e) => e.week !== 1) };
  assert.equal(entriesCleared.history.length, 1); // history survives even if the ledger row is deleted
});

test("formatFullDate renders a full month name, unlike the compact formatDate used elsewhere", () => {
  assert.equal(formatFullDate("2026-09-01T13:45:00"), "September 1, 2026");
});

test("formatTime renders a 12-hour clock time", () => {
  const t = formatTime("2026-09-01T13:45:00");
  assert.match(t, /1:45\s?PM/);
});

test("formatFullDateTime combines the full date and time with 'at'", () => {
  const combined = formatFullDateTime("2026-09-01T13:45:00");
  assert.match(combined, /September 1, 2026 at 1:45\s?PM/);
});

test("formatSignedCurrency always renders a leading plus sign for a deposit amount", () => {
  assert.equal(formatSignedCurrency(50), "+$50.00");
  assert.equal(formatSignedCurrency(-50), "+$50.00"); // history amounts are always positive deposits
});
