export default function StatCard({ label, value, sub, emphasis }) {
  return (
    <div className={`stat-card${emphasis ? " emphasis" : ""}`}>
      <div className="label">{label}</div>
      <div className="value tabular">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}
