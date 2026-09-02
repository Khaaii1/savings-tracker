import { useState } from "react";

function defaultDeadline() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export default function SetupScreen({ onSetup }) {
  const [form, setForm] = useState({
    currentSavings: "",
    weeklySavingsGoal: "",
    targetAmount: "",
    deadline: defaultDeadline(),
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSetup(form);
  }

  return (
    <div className="setup-shell">
      <h1 className="eyebrow-free-title">Set your savings goal</h1>
      <p className="lede">
        Enter what you've saved, what you're aiming for, and by when — the ledger will work out the pace you need
        and track every week against it.
      </p>
      <form onSubmit={handleSubmit} className="panel">
        <div className="field-grid">
          <div className="field">
            <label htmlFor="currentSavings">Current savings</label>
            <input
              id="currentSavings"
              type="number"
              step="0.01"
              min="0"
              placeholder="2500"
              required
              value={form.currentSavings}
              onChange={(e) => update("currentSavings", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="targetAmount">Target savings</label>
            <input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="9000"
              required
              value={form.targetAmount}
              onChange={(e) => update("targetAmount", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="weeklyGoal">Weekly savings goal</label>
            <input
              id="weeklyGoal"
              type="number"
              step="0.01"
              min="0"
              placeholder="280"
              required
              value={form.weeklySavingsGoal}
              onChange={(e) => update("weeklySavingsGoal", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="deadline">Deadline</label>
            <input
              id="deadline"
              type="date"
              required
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
          Start tracking
        </button>
      </form>
    </div>
  );
}
