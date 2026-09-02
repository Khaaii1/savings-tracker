import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency, formatDate } from "../lib/calculations.js";

export default function SavingsChart({ rows, startDate, startingSavings }) {
  const data = [
    { label: "Start", weekEnding: startDate, expected: startingSavings, actual: startingSavings },
    ...rows.map((row) => ({
      label: `Wk ${row.week}`,
      weekEnding: row.weekEnding,
      expected: row.expectedCumulative,
      actual: row.actual,
    })),
  ];

  return (
    <div>
      <div className="chart-legend">
        <span>
          <span className="swatch" style={{ background: "var(--ink-faint)", borderTop: "2px dashed var(--ink-faint)" }} />
          Expected pace
        </span>
        <span>
          <span className="swatch" style={{ background: "var(--emerald)" }} />
          Actual savings
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
            axisLine={{ stroke: "var(--line-strong)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${Math.round(v / 100) / 10}k`}
            tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name === "expected" ? "Expected" : "Actual"]}
            labelFormatter={(_, payload) => (payload && payload[0] ? formatDate(payload[0].payload.weekEnding) : "")}
            contentStyle={{
              borderRadius: 6,
              border: "1px solid var(--line-strong)",
              fontSize: 12.5,
              fontFamily: "var(--font-body)",
            }}
          />
          <Line
            type="monotone"
            dataKey="expected"
            stroke="var(--ink-faint)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--emerald)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--emerald)" }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
