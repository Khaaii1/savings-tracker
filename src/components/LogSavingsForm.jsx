import { useState } from "react";

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export default function LogSavingsForm({ onLog, onClose }) {
  // The amount field always holds a positive number; `kind` decides the sign
  // that gets sent to the tracker, so users never have to type a minus.
  const [kind, setKind] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");

  const isWithdrawal = kind === "withdrawal";

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

    const result = onLog(isWithdrawal ? -value : value, date);
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
      <div className="segmented" role="group" aria-label="Transaction type">
        <button
          type="button"
          className={`segmented-option${!isWithdrawal ? " is-active" : ""}`}
          aria-pressed={!isWithdrawal}
          onClick={() => {
            setKind("deposit");
            if (error) setError("");
          }}
        >
          Deposit
        </button>
        <button
          type="button"
          className={`segmented-option${isWithdrawal ? " is-active is-withdrawal" : ""}`}
          aria-pressed={isWithdrawal}
          onClick={() => {
            setKind("withdrawal");
            if (error) setError("");
          }}
        >
          Withdrawal
        </button>
      </div>

      <div className="field-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
        <div className="field">
          <label htmlFor="depositAmount">{isWithdrawal ? "Amount withdrawn" : "Amount saved"}</label>
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
            {isWithdrawal ? "Log withdrawal" : "Log savings"}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
