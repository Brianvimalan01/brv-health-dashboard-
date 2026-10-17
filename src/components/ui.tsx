export function Card(props: { label: string; value: string; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{props.label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${props.tone ?? ""}`}>{props.value}</div>
      {props.sub && <div className="mt-1 text-xs text-muted">{props.sub}</div>}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
