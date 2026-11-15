"use client";
import * as React from "react";
import { format, parseISO } from "date-fns";

/** Single-series bar chart of real activity events per day (last 14 days). */
export function ActivityChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  const [hover, setHover] = React.useState<number | null>(null);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-muted-foreground text-xs">{total} {total === 1 ? "event" : "events"} in the last 14 days</p>
        <p className="text-xs tabular-nums" aria-live="polite">
          {hover !== null ? `${format(parseISO(days[hover].date), "EEE d MMM")}: ${days[hover].count}` : " "}
        </p>
      </div>
      <div className="relative flex h-32 items-end gap-[2px]" role="img" aria-label={`Activity per day, ${total} events over 14 days`}>
        <div className="border-border/60 pointer-events-none absolute inset-x-0 bottom-0 border-t" />
        {days.map((d, i) => (
          <div
            key={d.date}
            className="flex h-full flex-1 cursor-default items-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className={`w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-primary" : "bg-primary/60"}`}
              style={{ height: d.count ? `${Math.max(4, (d.count / max) * 100)}%` : "2px", opacity: d.count ? 1 : 0.35 }}
            />
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
        <span>{format(parseISO(days[0].date), "d MMM")}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>Activity per day</caption>
        <tbody>{days.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
