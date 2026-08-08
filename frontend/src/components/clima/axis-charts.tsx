import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KpiEixoResponse } from "@/lib/clima-api";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--foreground)",
  fontSize: 13,
};

export function AxisBarChart({ kpis }: { kpis: KpiEixoResponse[] }) {
  const data = kpis.map((k) => ({
    eixo: k.nomeExibicao,
    Atual: Number(k.scoreAtual.toFixed(1)),
    Projetado: Number(k.scoreProjetado.toFixed(1)),
    cor: k.corSugestaoHex,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="eixo"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)", opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="Atual" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} maxBarSize={38} />
          <Bar dataKey="Projetado" radius={[6, 6, 0, 0]} maxBarSize={38}>
            {data.map((d) => (
              <Cell key={d.eixo} fill={d.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AxisRadarChart({ kpis }: { kpis: KpiEixoResponse[] }) {
  const data = kpis.map((k) => ({
    eixo: k.nomeExibicao,
    Atual: Number(k.scoreAtual.toFixed(1)),
    Projetado: Number(k.scoreProjetado.toFixed(1)),
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="eixo"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
          <Radar
            name="Atual"
            dataKey="Atual"
            stroke="var(--muted-foreground)"
            fill="var(--muted-foreground)"
            fillOpacity={0.15}
          />
          <Radar
            name="Projetado"
            dataKey="Projetado"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.35}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
