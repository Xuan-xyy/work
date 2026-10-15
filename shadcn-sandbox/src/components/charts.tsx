import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------
   手写 SVG 图表：不引第三方图表库，保持包体小、颜色跟随主题令牌。
   ------------------------------------------------------------------ */

export function FunnelBars({
  rows,
  className,
}: {
  rows: Array<{ label: string; count: number; rate: number }>
  className?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className={cn("space-y-2.5", className)}>
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-muted-foreground">{r.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
            <div
              className="flex h-full items-center justify-end rounded-md bg-primary/85 pr-2 transition-[width] duration-500"
              style={{ width: `${Math.max(6, (r.count / max) * 100)}%` }}
            >
              <span className="text-[11px] font-medium text-primary-foreground tabular-nums">
                {r.count}
              </span>
            </div>
          </div>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {r.rate}%
          </span>
          <span className="sr-only">{`第 ${i + 1} 层`}</span>
        </div>
      ))}
    </div>
  )
}

export function Donut({
  slices,
  size = 132,
  thickness = 16,
  center,
}: {
  slices: Array<{ label: string; value: number; color: string }>
  size?: number
  thickness?: number
  center?: { value: string; label: string }
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const R = (size - thickness) / 2
  const C = 2 * Math.PI * R
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            fill="none"
            strokeWidth={thickness}
            className="stroke-muted"
          />
          {total > 0 &&
            slices.map((s) => {
              if (s.value <= 0) return null
              const len = (s.value / total) * C
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              )
              offset += len
              return el
            })}
        </g>
        {center && (
          <>
            <text
              x="50%"
              y="47%"
              textAnchor="middle"
              className="fill-foreground text-lg font-semibold"
              style={{ fontSize: 20 }}
            >
              {center.value}
            </text>
            <text
              x="50%"
              y="62%"
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11 }}
            >
              {center.label}
            </text>
          </>
        )}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="tabular-nums text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarsV({
  data,
  height = 120,
  labelEvery = 5,
}: {
  data: Array<{ date: string; count: number }>
  height?: number
  labelEvery?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const h = d.count === 0 ? 2 : Math.max(6, (d.count / max) * height)
          return (
            <div key={d.date} className="group relative flex-1" title={`${d.date}：${d.count} 家`}>
              <div
                className={cn(
                  "w-full rounded-sm transition-colors",
                  d.count === 0 ? "bg-muted" : "bg-primary/70 group-hover:bg-primary",
                )}
                style={{ height: h }}
              />
              {i % labelEvery === 0 && (
                <span className="absolute left-0 top-full mt-1 w-full truncate text-[10px] tabular-nums text-muted-foreground">
                  {d.date.slice(5)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-5 text-[11px] text-muted-foreground">
        峰值 {max} 家/天 · 共 {data.reduce((s, d) => s + d.count, 0)} 家
      </div>
    </div>
  )
}

export function ProgressRing({
  value,
  goal,
  size = 116,
  thickness = 10,
  caption,
}: {
  value: number
  goal: number
  size?: number
  thickness?: number
  caption?: string
}) {
  const R = (size - thickness) / 2
  const C = 2 * Math.PI * R
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" strokeWidth={thickness} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            fill="none"
            strokeWidth={thickness}
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-700"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
          />
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-foreground font-semibold"
          style={{ fontSize: 24 }}
        >
          {value}
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
          / {goal} 家
        </text>
      </svg>
      {caption && <p className="text-center text-xs text-muted-foreground">{caption}</p>}
    </div>
  )
}

export function MiniBars({
  values,
  labels,
  highlightIndex,
}: {
  values: number[]
  labels: string[]
  highlightIndex?: number
}) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex items-end gap-2">
      {values.map((v, i) => (
        <div key={labels[i] ?? i} className="flex flex-1 flex-col items-center gap-1.5">
          <div
            className={cn(
              "w-full rounded-md",
              i === highlightIndex ? "bg-primary" : v > 0 ? "bg-primary/45" : "bg-muted",
            )}
            style={{ height: Math.max(6, (v / max) * 78) }}
            title={`${labels[i]}：${v} 家`}
          />
          <span
            className={cn(
              "text-[11px]",
              i === highlightIndex ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  )
}
