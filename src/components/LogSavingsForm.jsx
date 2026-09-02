import { useState } from "react";

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export default function LogSavingsForm({ onLog, onClose }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    const value = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(value)) {
      setError("Enter a valid amount.");
      return;
    }
    if (value <= 0) {
      setError("Amount must be greater than $0.");
      return;
    }

    const result = onLog(value, date);
    if (!result.ok) {
      setError(result.error || "Couldn't log that entry.");
      return;
    }

    setAmount("");
    setError("");
    onClose();
  }

  return (
    <form className="panel section log-savings-form" onSubmit={handleSubmit}>
      <div className="field-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
        <div className="field">
          <label htmlFor="depositAmount">Amount saved</label>
          <input
            id="depositAmount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="150"
            autoFocus
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="depositDate">Date (optional)</label>
          <input id="depositDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {error ? (
        <p className="section-note" style={{ color: "var(--rust)", marginTop: -6, marginBottom: 14 }}>
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary">
            Log savings
          </button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
