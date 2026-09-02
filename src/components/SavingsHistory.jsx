import { formatSignedCurrency, formatFullDateTime } from "../lib/calculations.js";

export default function SavingsHistory({ history }) {
  if (!history.length) {
    return (
      <p className="empty-note">
        Nothing logged yet — deposits you log will show up here permanently, newest first.
      </p>
    );
  }

  return (
    <ul className="history-list">
      {history.map((record) => (
        <li key={record.id} className="history-row">
          <span className="history-amount tabular">{formatSignedCurrency(record.amount)}</span>
          <span className="history-timestamp">{formatFullDateTime(record.timestamp)}</span>
        </li>
      ))}
    </ul>
  );
}
