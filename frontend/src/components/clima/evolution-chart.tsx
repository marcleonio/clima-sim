import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvolutionChartData } from "@/lib/clima-api";

// Mesma paleta usada no restante do app para os 3 eixos (ver demoSimular em clima-api.ts).
const CORES: Record<string, string> = {
  Financiamento: "#2f9e6e",
  Governança: "#3d8bbd",
  "Políticas Públicas": "#c98a2b",
};

export function EvolutionChart({ chart }: { chart: EvolutionChartData }) {
  const data = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { data: label };
    for (const ds of chart.datasets) {
      row[ds.label] = ds.data[i] ?? 0;
    }
    return row;
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="data"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              color: "var(--foreground)",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {chart.datasets.map((ds) => (
            <Line
              key={ds.label}
              type="monotone"
              dataKey={ds.label}
              stroke={CORES[ds.label] ?? "var(--primary)"}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: CORES[ds.label] ?? "var(--primary)" }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
