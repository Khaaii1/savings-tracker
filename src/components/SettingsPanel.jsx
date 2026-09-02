import { useState } from "react";

export default function SettingsPanel({ plan, onSave, onReset, onClose }) {
  const [form, setForm] = useState({
    currentSavings: String(plan.currentSavings),
    weeklySavingsGoal: String(plan.weeklySavingsGoal),
    targetAmount: String(plan.targetAmount),
    deadline: plan.deadline,
  });
  const [confirmingReset, setConfirmingReset] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      currentSavings: Number(form.currentSavings) || 0,
      weeklySavingsGoal: Number(form.weeklySavingsGoal) || 0,
      targetAmount: Number(form.targetAmount) || 0,
      deadline: form.deadline,
    });
    onClose();
  }

  return (
    <div className="panel section">
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="currentSavings">Current savings</label>
            <input
              id="currentSavings"
              type="number"
              step="0.01"
              min="0"
              value={form.currentSavings}
              onChange={(e) => update("currentSavings", e.target.value)}
            />
            <span className="hint">Overrides your latest logged check-in.</span>
          </div>
          <div className="field">
            <label htmlFor="targetAmount">Target savings</label>
            <input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0"
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
              value={form.weeklySavingsGoal}
              onChange={(e) => update("weeklySavingsGoal", e.target.value)}
            />
            <span className="hint">What you plan to set aside each week.</span>
          </div>
          <div className="field">
            <label htmlFor="deadline">Deadline</label>
            <input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Cancel
            </button>
          </div>

          {confirmingReset ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="hint">Erase everything?</span>
              <button type="button" className="btn btn-danger" onClick={onReset}>
                Yes, reset
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmingReset(false)}>
                No
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-quiet btn-danger" onClick={() => setConfirmingReset(true)}>
              Reset entire plan
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
