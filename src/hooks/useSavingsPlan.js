import { useCallback, useMemo, useState } from "react";
import { loadPlan, savePlan, clearPlan } from "../lib/storage.js";
import {
  buildSchedule,
  mergeScheduleWithEntries,
  latestSavings,
  observedWeeklyRate,
  projectedFinal,
  percentComplete,
  overallStatus,
  requiredWeeklyRate,
  weeksRemainingBetween,
  amountRemaining,
  toMidnight,
  weekIndexForDate,
  cumulativeBeforeWeek,
  clampMoney,
  formatCurrency,
} from "../lib/calculations.js";

function todayISO() {
  return toMidnight(new Date()).toISOString().slice(0, 10);
}

function defaultPlan() {
  return {
    isSetUp: false,
    startDate: todayISO(),
    currentSavings: 0,
    weeklySavingsGoal: 0,
    targetAmount: 0,
    deadline: todayISO(),
    entries: [], // { week, weekEnding, actual } — cumulative total per week, drives the dashboard/chart/ledger
    history: [], // { id, amount, timestamp } — a permanent, append-only log of every transaction (amount is negative for a withdrawal)
  };
}

export function useSavingsPlan() {
  const [plan, setPlan] = useState(() => loadPlan() || defaultPlan());

  const persist = useCallback((next) => {
    setPlan(next);
    savePlan(next);
  }, []);

  const setup = useCallback(
    (values) => {
      persist({
        isSetUp: true,
        startDate: todayISO(),
        currentSavings: Number(values.currentSavings) || 0,
        weeklySavingsGoal: Number(values.weeklySavingsGoal) || 0,
        targetAmount: Number(values.targetAmount) || 0,
        deadline: values.deadline,
        entries: [],
        history: [],
      });
    },
    [persist]
  );

  const updatePlanFields = useCallback(
    (patch) => {
      persist({ ...plan, ...patch });
    },
    [plan, persist]
  );

  const upsertEntry = useCallback(
    (week, weekEnding, actual) => {
      const entries = plan.entries.filter((e) => e.week !== week);
      entries.push({ week, weekEnding, actual: Number(actual) });
      entries.sort((a, b) => a.week - b.week);
      persist({ ...plan, entries });
    },
    [plan, persist]
  );

  /**
   * Logs a savings transaction as of a given date (defaults to today): a
   * positive `amount` is a deposit, a negative one is a withdrawal (money
   * pulled back out of savings). Either way the amount is applied on top of
   * whatever was already saved as of that date, rather than replacing the
   * running total — so "I saved $150" always increases current savings by
   * $150 and "I withdrew $150" always decreases it by $150, regardless of
   * which week it lands in.
   *
   * This does two things, written together in a single `persist` call so
   * neither one can read stale state:
   *   1. Updates `entries` (the cumulative-per-week list the dashboard,
   *      chart, and weekly ledger all derive from) — exactly like
   *      `upsertEntry` does.
   *   2. Appends a permanent record to `history`: the raw signed amount and
   *      the real timestamp this action happened, independent of whichever
   *      week/date the transaction was attributed to. History is
   *      append-only — editing or deleting a weekly check-in later never
   *      rewrites it.
   *
   * Returns { ok: true, week, newTotal } on success, or
   * { ok: false, error } if the amount is invalid or a withdrawal would
   * push the running total below $0.
   */
  const logTransaction = useCallback(
    (amountInput, dateInput) => {
      const amount = clampMoney(Number(amountInput));
      if (!Number.isFinite(Number(amountInput)) || amount === 0) {
        return { ok: false, error: "Enter an amount other than $0." };
      }

      const date = dateInput || todayISO();
      const week = weekIndexForDate(plan.startDate, date);
      const schedule = buildSchedule({
        startDate: plan.startDate,
        deadline: plan.deadline,
        startingSavings: plan.currentSavings,
        targetAmount: plan.targetAmount,
      });
      const scheduledRow = schedule.find((s) => s.week === week);
      const existing = plan.entries.find((e) => e.week === week);
      const baseline = existing
        ? existing.actual
        : cumulativeBeforeWeek(plan.entries, week, plan.currentSavings);
      const newTotal = clampMoney(baseline + amount);
      if (newTotal < 0) {
        return {
          ok: false,
          error: `You can't withdraw more than the ${formatCurrency(baseline)} saved as of that date.`,
        };
      }
      const weekEnding = scheduledRow ? scheduledRow.weekEnding : toMidnight(date);

      const entries = plan.entries.filter((e) => e.week !== week);
      entries.push({ week, weekEnding, actual: newTotal });
      entries.sort((a, b) => a.week - b.week);

      const historyRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount, // signed: negative for a withdrawal
        timestamp: new Date().toISOString(), // the real moment this was logged, not the chosen week date
      };
      const history = [...(plan.history || []), historyRecord];

      persist({ ...plan, entries, history });
      return { ok: true, week, newTotal };
    },
    [plan, persist]
  );

  const deleteEntry = useCallback(
    (week) => {
      persist({ ...plan, entries: plan.entries.filter((e) => e.week !== week) });
    },
    [plan, persist]
  );

  const resetPlan = useCallback(() => {
    clearPlan();
    setPlan(defaultPlan());
  }, []);

  const derived = useMemo(() => {
    const today = todayISO();
    const schedule = buildSchedule({
      startDate: plan.startDate,
      deadline: plan.deadline,
      startingSavings: plan.currentSavings,
      targetAmount: plan.targetAmount,
    });

    const rows = mergeScheduleWithEntries(schedule, plan.entries, plan.targetAmount);
    const currentTotal = latestSavings(plan.entries, plan.currentSavings);
    const remaining = amountRemaining(plan.targetAmount, currentTotal);
    const weeksLeft = weeksRemainingBetween(today, plan.deadline);
    const deadlinePassed = weeksLeft === 0 && daysUntil(plan.deadline, today) <= 0;
    const requiredWeekly = requiredWeeklyRate({
      targetAmount: plan.targetAmount,
      currentTotal,
      today,
      deadline: plan.deadline,
    });
    const rate = observedWeeklyRate(plan.entries, plan.currentSavings, plan.weeklySavingsGoal);
    const projected = projectedFinal({
      currentTotal,
      weeklyRate: rate,
      today,
      deadline: plan.deadline,
    });
    const percent = percentComplete(currentTotal, plan.targetAmount);
    const status = overallStatus({ schedule, currentTotal, today, targetAmount: plan.targetAmount });

    // How far ahead/behind the running total is vs. what today's benchmark expects.
    const pastRows = schedule.filter((row) => toMidnight(row.weekEnding) <= toMidnight(today));
    const benchmark = pastRows.length ? pastRows[pastRows.length - 1].expectedCumulative : plan.currentSavings;
    const paceDelta = currentTotal - benchmark;

    const isGoalReached = currentTotal >= plan.targetAmount && plan.targetAmount > 0;
    const isUnderPacedGoal = requiredWeekly > plan.weeklySavingsGoal && Number.isFinite(requiredWeekly);

    const history = [...(plan.history || [])].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return {
      today,
      schedule,
      rows,
      currentTotal,
      remaining,
      weeksLeft,
      deadlinePassed,
      requiredWeekly,
      observedRate: rate,
      projected,
      percent,
      status,
      paceDelta,
      isGoalReached,
      isUnderPacedGoal,
      history,
    };
  }, [plan]);

  return {
    plan,
    ...derived,
    setup,
    updatePlanFields,
    upsertEntry,
    logTransaction,
    deleteEntry,
    resetPlan,
  };
}

function daysUntil(deadline, today) {
  return Math.round((toMidnight(deadline) - toMidnight(today)) / (1000 * 60 * 60 * 24));
}
