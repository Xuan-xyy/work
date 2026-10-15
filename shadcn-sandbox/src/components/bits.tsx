import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PRIORITIES, STATUS, TONE_CLASS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Priority, Status } from "@/lib/types"

const CHIP =
  "inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium whitespace-nowrap"

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  const s = STATUS[status]
  return <span className={cn(CHIP, TONE_CLASS[s.tone], className)}>{s.label}</span>
}

export function PrioChip({ priority, className }: { priority: Priority; className?: string }) {
  const p = PRIORITIES.find((x) => x.id === priority) ?? PRIORITIES[1]
  return <span className={cn(CHIP, TONE_CLASS[p.tone], className)}>{p.label}</span>
}

export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        CHIP,
        "bg-white/55 font-normal text-muted-foreground dark:bg-white/8",
      )}
    >
      {children}
    </span>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-1.5">{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}

/**
 * KPI 不再是一张带框的小卡片：去掉卡片外壳，只留标签 + 衬线数字。
 * 一排五张一模一样的小卡是最典型的「AI 生成仪表盘」特征。
 */
export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: "default" | "good" | "warn"
}) {
  return (
    <div className="glass flex flex-col justify-between rounded-2xl px-5 py-4">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-display mt-2 text-[30px] leading-none font-normal tabular-nums tracking-tight",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-white/25 px-6 py-12 text-center dark:bg-white/3">
      <p className="font-display text-[15px] tracking-[0.01em]">{title}</p>
      {description && (
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="eyebrow block text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-relaxed text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] leading-none font-normal tracking-[0.02em]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
