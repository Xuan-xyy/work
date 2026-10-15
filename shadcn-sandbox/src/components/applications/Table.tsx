import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { PrioChip, StatusChip } from "@/components/bits"
import { daysFromToday, fmtMd } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Application } from "@/lib/types"

type SortKey = "company" | "role" | "city" | "channel" | "status" | "priority" | "appliedAt" | "nextAt"

const COLUMNS: Array<{ key: SortKey | "actions"; label: string; className?: string }> = [
  { key: "company", label: "公司", className: "w-[22%]" },
  { key: "role", label: "岗位", className: "w-[20%]" },
  { key: "city", label: "城市", className: "w-[7%]" },
  { key: "channel", label: "渠道", className: "w-[9%]" },
  { key: "status", label: "阶段", className: "w-[9%]" },
  { key: "priority", label: "优先级", className: "w-[8%]" },
  { key: "appliedAt", label: "投递", className: "w-[8%]" },
  { key: "nextAt", label: "下一步", className: "w-[11%]" },
  { key: "actions", label: "", className: "w-[6%]" },
]

const PRIO_RANK = { high: 0, mid: 1, low: 2 }
const STATUS_RANK = { wishlist: 0, applied: 1, written: 2, interview: 3, offer: 4, rejected: 5, withdrawn: 6 }

export function Table({
  apps,
  onOpen,
}: {
  apps: Application[]
  onOpen: (a: Application) => void
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "appliedAt",
    dir: "desc",
  })

  const rows = useMemo(() => {
    const list = [...apps]
    list.sort((a, b) => {
      let r = 0
      switch (sort.key) {
        case "priority":
          r = PRIO_RANK[a.priority] - PRIO_RANK[b.priority]
          break
        case "status":
          r = STATUS_RANK[a.status] - STATUS_RANK[b.status]
          break
        case "appliedAt":
        case "nextAt":
          r = (a[sort.key] || "9999").localeCompare(b[sort.key] || "9999")
          break
        default:
          r = String(a[sort.key]).localeCompare(String(b[sort.key]), "zh-CN")
      }
      return sort.dir === "asc" ? r : -r
    })
    return list
  }, [apps, sort])

  const toggle = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={cn("px-2.5 py-2 text-left text-[11px] font-medium text-muted-foreground", c.className)}
              >
                {c.key === "actions" ? null : (
                  <button
                    type="button"
                    onClick={() => toggle(c.key as SortKey)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {c.label}
                    {sort.key === c.key ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const overdue = a.nextAt && daysFromToday(a.nextAt) < 0
            return (
              <tr
                key={a.id}
                onClick={() => onOpen(a)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
              >
                <td className="truncate px-2.5 py-2 font-medium">{a.company}</td>
                <td className="truncate px-2.5 py-2 text-muted-foreground">{a.role || "—"}</td>
                <td className="truncate px-2.5 py-2 text-muted-foreground">{a.city || "—"}</td>
                <td className="truncate px-2.5 py-2 text-muted-foreground">{a.channel || "—"}</td>
                <td className="px-2.5 py-2">
                  <StatusChip status={a.status} />
                </td>
                <td className="px-2.5 py-2">
                  <PrioChip priority={a.priority} />
                </td>
                <td className="px-2.5 py-2 text-xs tabular-nums text-muted-foreground">
                  {a.appliedAt ? fmtMd(a.appliedAt) : "—"}
                </td>
                <td
                  className={cn(
                    "px-2.5 py-2 text-xs tabular-nums",
                    overdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                  )}
                >
                  {a.nextAt ? fmtMd(a.nextAt) : "—"}
                </td>
                <td className="px-2.5 py-2 text-right">
                  <span className="text-[11px] text-muted-foreground opacity-50">详情</span>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-xs text-muted-foreground">
                没有符合条件的记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
