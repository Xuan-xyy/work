import { useState } from "react"
import { CalendarClock } from "lucide-react"

import { PrioChip } from "@/components/bits"
import { BOARD_COLUMNS, STATUS } from "@/lib/constants"
import { daysFromToday, rel } from "@/lib/format"
import { actions } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Application, Status } from "@/lib/types"

function Card({ app, onOpen }: { app: Application; onOpen: (a: Application) => void }) {
  const overdue = app.nextAt && daysFromToday(app.nextAt) < 0
  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      className="w-full rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-ring/60 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{app.company}</span>
        <PrioChip priority={app.priority} />
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{app.role || "未填岗位"}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        {app.city && <span className="truncate">{app.city}</span>}
        {app.salary && <span className="truncate">{app.salary}</span>}
      </div>
      {app.nextAt && (
        <p
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-[11px]",
            overdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="size-3" />
          {rel(app.nextAt)}
        </p>
      )}
    </button>
  )
}

export function Board({ apps, onOpen }: { apps: Application[]; onOpen: (a: Application) => void }) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<Status | null>(null)

  return (
    <div className="grid grid-cols-5 gap-3">
      {BOARD_COLUMNS.map((col) => {
        const items = apps.filter((a) => a.status === col)
        const isOver = overCol === col
        return (
          <section
            key={col}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
              setOverCol(col)
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId) {
                const app = apps.find((a) => a.id === dragId)
                if (app && app.status !== col) {
                  actions.advanceApplication(dragId, col, `看板拖拽：${STATUS[app.status].label} → ${STATUS[col].label}`)
                }
              }
              setDragId(null)
              setOverCol(null)
            }}
            className={cn(
              "flex min-h-[26rem] flex-col rounded-lg border bg-muted/40 transition-colors",
              isOver ? "border-primary/60 bg-primary/5" : "border-border",
            )}
          >
            <header className="flex items-center justify-between border-b border-border px-2.5 py-2">
              <span className="text-xs font-medium">{STATUS[col].label}</span>
              <span className="rounded bg-background px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {items.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(app.id)
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverCol(null)
                  }}
                  className={cn("cursor-grab active:cursor-grabbing", dragId === app.id && "opacity-40")}
                >
                  <Card app={app} onOpen={onOpen} />
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
                  {isOver ? "松手放到这里" : "拖卡片过来推进"}
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
