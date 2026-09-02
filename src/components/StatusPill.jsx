const LABELS = {
  ahead: "Ahead",
  "on-track": "On track",
  behind: "Behind",
  pending: "Not logged",
};

export default function StatusPill({ status, size }) {
  const label = LABELS[status] || status;
  return (
    <span className={`status-pill ${status}`} style={size === "sm" ? { fontSize: 11.5 } : undefined}>
      {label}
    </span>
  );
}
