import { useState } from "react";
import StatCard from "./StatCard.jsx";
import StatusPill from "./StatusPill.jsx";
import ProgressBar from "./ProgressBar.jsx";
import SavingsChart from "./SavingsChart.jsx";
import WeeklyLedger from "./WeeklyLedger.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import LogSavingsForm from "./LogSavingsForm.jsx";
import SavingsHistory from "./SavingsHistory.jsx";
import { formatCurrency, formatDate } from "../lib/calculations.js";

function HeroStatement({ plan, currentTotal, isGoalReached, deadlinePassed, status, requiredWeekly, isUnderPacedGoal, paceDelta }) {
  if (isGoalReached) {
    return (
      <p className="hero-statement">
        You've reached your <span className="figure figure-emerald">{formatCurrency(plan.targetAmount)}</span> goal
        — {formatCurrency(currentTotal)} saved{deadlinePassed ? "." : ` with time to spare before ${formatDate(plan.deadline)}.`}
      </p>
    );
  }

  if (deadlinePassed) {
    return (
      <p className="hero-statement">
        The deadline of {formatDate(plan.deadline)} has passed, <span className="figure figure-rust">{formatCurrency(plan.targetAmount - currentTotal)}</span> short
        of your {formatCurrency(plan.targetAmount)} goal.
      </p>
    );
  }

  if (status === "ahead") {
    return (
      <p className="hero-statement">
        You're <span className="figure figure-emerald">{formatCurrency(Math.abs(paceDelta))} ahead</span> of pace toward{" "}
        {formatCurrency(plan.targetAmount)} by {formatDate(plan.deadline)}.
      </p>
    );
  }

  if (status === "behind") {
    return (
      <p className="hero-statement">
        You're <span className="figure figure-rust">{formatCurrency(Math.abs(paceDelta))} behind</span> pace toward{" "}
        {formatCurrency(plan.targetAmount)} by {formatDate(plan.deadline)}.
      </p>
    );
  }

  return (
    <p className="hero-statement">
      You're on track for your <span className="figure figure-emerald">{formatCurrency(plan.targetAmount)}</span> goal by{" "}
      {formatDate(plan.deadline)}.
    </p>
  );
}

export default function Dashboard({ tracker }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const {
    plan,
    rows,
    schedule,
    currentTotal,
    remaining,
    weeksLeft,
    deadlinePassed,
    requiredWeekly,
    projected,
    percent,
    status,
    paceDelta,
    isGoalReached,
    isUnderPacedGoal,
    history,
    updatePlanFields,
    upsertEntry,
    logDeposit,
    deleteEntry,
    resetPlan,
  } = tracker;

  return (
    <>
      <section className="hero">
        <HeroStatement
          plan={plan}
          currentTotal={currentTotal}
          isGoalReached={isGoalReached}
          deadlinePassed={deadlinePassed}
          status={status}
          requiredWeekly={requiredWeekly}
          isUnderPacedGoal={isUnderPacedGoal}
          paceDelta={paceDelta}
        />
        <ProgressBar current={currentTotal} target={plan.targetAmount} percent={percent} />

        <div style={{ marginTop: 18 }}>
          {showLogForm ? (
            <LogSavingsForm onLog={logDeposit} onClose={() => setShowLogForm(false)} />
          ) : (
            <button className="btn btn-primary" onClick={() => setShowLogForm(true)}>
              + Log savings
            </button>
          )}
        </div>
      </section>

      {!isGoalReached && !deadlinePassed && isUnderPacedGoal ? (
        <p className="section-note" style={{ marginTop: -20, marginBottom: 28, color: "var(--rust)" }}>
          Your weekly goal of {formatCurrency(plan.weeklySavingsGoal)} is below the {formatCurrency(requiredWeekly)}/week
          you actually need to hit your deadline.
        </p>
      ) : null}

      <div className="section-heading">
        <h2>Dashboard</h2>
        <StatusPill status={isGoalReached ? "ahead" : deadlinePassed ? "behind" : status} />
      </div>

      <div className="stat-grid">
        <StatCard label="Current savings" value={formatCurrency(currentTotal)} emphasis />
        <StatCard label="Target savings" value={formatCurrency(plan.targetAmount)} />
        <StatCard label="Amount remaining" value={formatCurrency(remaining)} />
        <StatCard label="Percent complete" value={`${percent.toFixed(0)}%`} />
        <StatCard label="Weekly savings goal" value={formatCurrency(plan.weeklySavingsGoal)} />
        <StatCard
          label="Required weekly pace"
          value={Number.isFinite(requiredWeekly) ? formatCurrency(requiredWeekly) : "—"}
          sub={deadlinePassed ? "Deadline passed" : "to hit your deadline"}
        />
        <StatCard label="Weeks remaining" value={deadlinePassed ? "0" : String(weeksLeft)} sub={formatDate(plan.deadline)} />
        <StatCard
          label={paceDelta >= 0 ? "Ahead by" : "Behind by"}
          value={formatCurrency(Math.abs(paceDelta))}
          sub="vs. today's benchmark"
        />
        <StatCard label="Projected final total" value={formatCurrency(projected)} sub="at your current pace" />
      </div>

      <div className="section">
        <div className="section-heading">
          <h2>Savings over time</h2>
        </div>
        <div className="panel">
          <SavingsChart rows={rows} startDate={plan.startDate} startingSavings={plan.currentSavings} />
        </div>
      </div>

      <div className="section">
        <div className="section-heading">
          <h2>Weekly check-ins</h2>
          <span className="section-note">Log your actual total as of each week's end.</span>
        </div>
        <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
          <div style={{ padding: "4px 8px" }}>
            <WeeklyLedger rows={rows} onSave={upsertEntry} onDelete={deleteEntry} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-heading">
          <h2>Savings history</h2>
          <span className="section-note">Every deposit you've logged, newest first.</span>
        </div>
        <div className="panel history-panel">
          <SavingsHistory history={history} />
        </div>
      </div>

      <div className="section">
        {showSettings ? (
          <SettingsPanel plan={plan} onSave={updatePlanFields} onReset={resetPlan} onClose={() => setShowSettings(false)} />
        ) : (
          <button className="btn" onClick={() => setShowSettings(true)}>
            Edit goal &amp; deadline
          </button>
        )}
      </div>
    </>
  );
}
