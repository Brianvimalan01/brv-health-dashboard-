"use client";

import { useEffect, useRef, useState } from "react";
import * as f from "./format";

// Charts draw at the container's real pixel width so text stays 10-11px on
// every screen instead of scaling with the SVG.
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

export type BalanceBar = { date: string; balance: number | null; eaten: number | null; burned: number | null; provisional?: boolean };

const H = 180;
const PAD_TOP = 18;
const PAD_BOTTOM = 18;

// Daily balance as bars around zero: up is a surplus, down a deficit. Days
// without both numbers get a dashed placeholder, never a zero bar.
export function BalanceBars({ bars }: { bars: BalanceBar[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth(600);
  const step = W / bars.length;
  const maxAbs = Math.max(300, ...bars.map((b) => Math.abs(b.balance ?? 0)));
  const plot = H - PAD_TOP - PAD_BOTTOM;
  const zero = PAD_TOP + plot / 2;
  const scale = plot / 2 / maxAbs;
  const barW = Math.min(22, step * 0.6);
  const active = hover != null ? bars[hover] : null;

  return (
    <div ref={ref}>
      <p className="h-5 text-xs tabular-nums text-muted" aria-live="polite">
        {active
          ? `${f.shortDate(active.date)} · ${active.balance == null ? "incomplete data" : `${f.signedKcal(active.balance)} kcal (ate ${f.kcal(active.eaten)}, burned ${f.kcal(active.burned)})`}${active.provisional ? " · provisional" : ""}`
          : "Tap or hover a bar for the day's numbers"}
      </p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label="Daily calorie balance">
        <line x1={0} x2={W} y1={zero} y2={zero} stroke="var(--border)" />
        <text x={2} y={PAD_TOP - 4} fontSize={10} fill="var(--muted)">surplus</text>
        {bars.map((b, i) => {
          const cx = step * i + step / 2;
          const h = b.balance == null ? 0 : Math.max(2, Math.abs(b.balance) * scale);
          const up = (b.balance ?? 0) > 0;
          const y = up ? zero - h : zero;
          return (
            <g key={b.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={step * i} y={PAD_TOP} width={step} height={plot} fill="transparent" />
              {b.balance == null ? (
                <rect x={cx - barW / 2} y={zero - 8} width={barW} height={16} rx={4} fill="none" stroke="var(--border)" strokeDasharray="3 3" />
              ) : (
                <rect
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={up ? "var(--surplus-mark)" : "var(--deficit-mark)"}
                  opacity={b.provisional ? 0.45 : hover == null || hover === i ? 1 : 0.55}
                />
              )}
              <text x={cx} y={H - 6} fontSize={10} textAnchor="middle" fill={hover === i ? "var(--foreground)" : "var(--muted)"}>
                {bars.length <= 14 ? `${f.weekdayInitial(b.date)} ${b.date.slice(8)}` : b.date.slice(8)}
              </text>
            </g>
          );
        })}
        <text x={2} y={H - PAD_BOTTOM - 2} fontSize={10} fill="var(--muted)">deficit</text>
      </svg>
    </div>
  );
}

export type WeightPoint = { date: string; kg: number; notes: string | null };

// Weigh-ins as dots with the 7-day trend as a line. The y-axis spans only the
// weights shown, padded a little, so small changes stay visible.
export function WeightChart({
  points,
  trend,
  from,
  to,
}: {
  points: WeightPoint[];
  trend: { date: string; kg: number }[];
  from: string;
  to: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [ref, W] = useWidth(640);
  const HH = 220;
  const left = 40;
  const right = 12;
  const top = 12;
  const bottom = 24;
  const dayMs = 86_400_000;
  const t0 = Date.parse(`${from}T00:00:00Z`);
  const span = Math.max(1, (Date.parse(`${to}T00:00:00Z`) - t0) / dayMs);
  const all = [...points.map((p) => p.kg), ...trend.map((p) => p.kg)];
  const lo = Math.floor((Math.min(...all) - 0.3) * 2) / 2;
  const hi = Math.ceil((Math.max(...all) + 0.3) * 2) / 2;
  const x = (d: string) => left + ((Date.parse(`${d}T00:00:00Z`) - t0) / dayMs / span) * (W - left - right);
  const y = (kg: number) => top + ((hi - kg) / (hi - lo || 1)) * (HH - top - bottom);
  const ticks = [lo, (lo + hi) / 2, hi];
  const dates: string[] = [];
  for (let i = 0; i <= span; i++) dates.push(new Date(t0 + i * dayMs).toISOString().slice(0, 10));
  const labelEvery = Math.ceil(dates.length / Math.max(2, Math.floor(W / 70)));
  const hp = points.find((p) => p.date === hover);
  const ht = trend.find((p) => p.date === hover);
  const path = trend.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");

  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--raw)]" />Weigh-in</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded bg-weight" />7-day trend</span>
        <span className="ml-auto tabular-nums" aria-live="polite">
          {hover
            ? `${f.shortDate(hover)} · ${hp ? `${hp.kg.toFixed(1)} kg` : "no weigh-in"}${ht ? ` · trend ${ht.kg.toFixed(1)}` : ""}${hp?.notes ? ` · ${hp.notes}` : ""}`
            : ""}
        </span>
      </div>
      <svg width={W} height={HH} viewBox={`0 0 ${W} ${HH}`} className="mt-2 block" role="img" aria-label="Weight over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === lo ? undefined : "2 4"} />
            <text x={left - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">{t.toFixed(1)}</text>
          </g>
        ))}
        {dates.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d} x={x(d)} y={HH - 6} fontSize={10} textAnchor={i === 0 ? "start" : x(d) > W - 30 ? "end" : "middle"} fill="var(--muted)">{f.shortDate(d)}</text>
          ) : null,
        )}
        {hover && <line x1={x(hover)} x2={x(hover)} y1={top} y2={HH - bottom} stroke="var(--muted)" strokeOpacity={0.4} />}
        {trend.length > 1 && <path d={path} fill="none" stroke="var(--weight)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={hover === p.date ? 5.5 : 4} fill="var(--raw)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        {dates.map((d) => (
          <rect
            key={d}
            x={x(d) - (W - left - right) / span / 2}
            y={top}
            width={(W - left - right) / span}
            height={HH - top - bottom}
            fill="transparent"
            onMouseEnter={() => setHover(d)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(d)}
          />
        ))}
      </svg>
    </div>
  );
}
