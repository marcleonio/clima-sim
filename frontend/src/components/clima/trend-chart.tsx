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
import type { SeriesTemporais } from "./types";

export function TrendChart({ series }: { series: SeriesTemporais }) {
  const data = series.labelsAnos.map((ano, i) => {
    const row: Record<string, string | number> = { ano };
    for (const linha of series.linhasGrafico) {
      row[linha.nomeLinha] = linha.valoresAnoAAno[i] ?? 0;
    }
    return row;
  });

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="ano"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[
              (d: number) => Math.max(0, Math.floor(d - 6)),
              (d: number) => Math.min(100, Math.ceil(d + 6)),
            ]}
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
          {series.linhasGrafico.map((linha) => (
            <Line
              key={linha.nomeLinha}
              type="monotone"
              dataKey={linha.nomeLinha}
              stroke={linha.corLinhaHex}
              strokeWidth={linha.nomeLinha === "Índice Geral" ? 3.5 : 2}
              dot={{ r: 3, strokeWidth: 0, fill: linha.corLinhaHex }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
