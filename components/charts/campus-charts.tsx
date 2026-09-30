"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export type Bucket = { name: string; value: number };

/** Vertical bars for concern-status style buckets. */
export function StatusBarChart({ data }: { data: Bucket[] }) {
  return (
    <div className="mt-5 h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <Tooltip />
          <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars for per-event attendance. */
export function AttendanceBarChart({ data }: { data: Bucket[] }) {
  return (
    <div className="mt-5 w-full" style={{ height: Math.max(180, data.length * 44 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <Tooltip />
          <Bar dataKey="value" name="Registrations" fill={PALETTE[0]} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut for resolution-rate style shares. */
export function ResolutionDonut({ data }: { data: Bucket[] }) {
  const total = data.reduce((sum, bucket) => sum + bucket.value, 0);
  if (total === 0) {
    return <p className="mt-5 py-8 text-center text-sm text-muted-foreground">No data to chart yet.</p>;
  }
  return (
    <div className="mt-5 h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
