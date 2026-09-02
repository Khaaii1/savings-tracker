import { useState } from "react";
import { formatCurrency, formatDate, clampMoney } from "../lib/calculations.js";
import StatusPill from "./StatusPill.jsx";

export default function WeeklyLedger({ rows, onSave, onDelete }) {
  const [editingWeek, setEditingWeek] = useState(null);
  const [draft, setDraft] = useState("");

  function startEdit(row) {
    setEditingWeek(row.week);
    setDraft(row.actual != null ? String(row.actual) : "");
  }

  function commit(row) {
    const value = clampMoney(parseFloat(draft));
    if (Number.isFinite(value) && row.weekEnding) {
      onSave(row.week, row.weekEnding, value);
    }
    setEditingWeek(null);
    setDraft("");
  }

  if (!rows.length) {
    return <p className="empty-note">Your weekly schedule will appear here once your deadline is more than a few days out.</p>;
  }

  return (
    <table className="ledger">
      <thead>
        <tr>
          <th>Week</th>
          <th>Week ending</th>
          <th>Expected</th>
          <th>Actual</th>
          <th>Difference</th>
          <th>Status</th>
          <th aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.week}>
            <td className="week-num">{row.week}</td>
            <td>{formatDate(row.weekEnding)}</td>
            <td className="tabular">{formatCurrency(row.expectedCumulative)}</td>
            <td className="tabular">
              {editingWeek === row.week ? (
                <input
                  autoFocus
                  type="number"
                  step="0.01"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(row);
                    if (e.key === "Escape") setEditingWeek(null);
                  }}
                  style={{
                    width: 100,
                    textAlign: "right",
                    padding: "4px 6px",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 3,
                  }}
                />
              ) : row.actual != null ? (
                formatCurrency(row.actual)
              ) : (
                <span style={{ color: "var(--ink-faint)" }}>—</span>
              )}
            </td>
            <td className={`tabular ${row.difference == null ? "" : row.difference >= 0 ? "diff-positive" : "diff-negative"}`}>
              {row.difference == null ? "—" : `${row.difference >= 0 ? "+" : "-"}${formatCurrency(Math.abs(row.difference))}`}
            </td>
            <td>
              <StatusPill status={row.status} size="sm" />
            </td>
            <td>
              <div className="row-actions">
                <button className="icon-btn" onClick={() => startEdit(row)} aria-label={`Log week ${row.week}`}>
                  {row.actual != null ? "Edit" : "Log"}
                </button>
                {row.actual != null ? (
                  <button className="icon-btn" onClick={() => onDelete(row.week)} aria-label={`Delete week ${row.week} entry`}>
                    Delete
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
