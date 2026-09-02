import { formatCurrency } from "../lib/calculations.js";

export default function ProgressBar({ current, target, percent }) {
  const isOver = current >= target && target > 0;
  return (
    <div className="progress-rail">
      <span className="amount tabular">{formatCurrency(current)}</span>
      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress toward savings target">
        <div className={`progress-fill${isOver ? " is-over" : ""}`} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
      <span className="amount tabular">{formatCurrency(target)}</span>
    </div>
  );
}
