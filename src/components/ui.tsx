import Link from "next/link";

export function Card(props: { label: string; value: string; sub?: React.ReactNode; tone?: string; unit?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-sm shadow-black/20">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{props.label}</div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${props.tone ?? ""}`}>
        {props.value}
        {props.unit && <span className="ml-1 text-sm font-normal text-muted">{props.unit}</span>}
      </div>
      {props.sub && <div className="mt-1 text-xs text-muted">{props.sub}</div>}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface/90 p-4 shadow-sm shadow-black/20 sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="mr-auto">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ButtonLink({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-zinc-950 hover:brightness-110"
          : "rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}

// A thin progress bar; value and max in the same unit.
export function Meter({ value, max, tone = "bg-accent" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
