import { ExternalLink, Pencil, Trash2 } from "lucide-react"

import { PrioChip, StatusChip, TagChip } from "@/components/bits"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EVENT_LABELS, STATUS, STATUS_ORDER } from "@/lib/constants"
import { ago, fmtMd, fmtFull, rel } from "@/lib/format"
import { actions } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Application } from "@/lib/types"

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm">{value || "—"}</p>
    </div>
  )
}

export function DetailSheet({
  app,
  open,
  onOpenChange,
  onEdit,
}: {
  app: Application | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onEdit: (a: Application) => void
}) {
  if (!app) return null
  const timeline = [...app.timeline].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {app.company}
            <StatusChip status={app.status} />
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {app.role || "未填岗位"} · {app.city || "城市待定"}
            <PrioChip priority={app.priority} />
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-2">
            <Meta label="投递渠道" value={app.channel} />
            <Meta label="薪资范围" value={app.salary} />
            <Meta label="投递日期" value={app.appliedAt ? `${fmtMd(app.appliedAt)}（${ago(app.appliedAt)}）` : "—"} />
            <Meta
              label="下一步"
              value={app.nextAt ? `${fmtMd(app.nextAt)}（${rel(app.nextAt)}）` : "未安排"}
            />
          </div>

          {app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.tags.map((t) => (
                <TagChip key={t}>{t}</TagChip>
              ))}
            </div>
          )}

          {app.jdLink && (
            <a
              href={app.jdLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              打开 JD 链接
            </a>
          )}

          <div>
            <p className="mb-2 text-xs font-medium">快速推进</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_ORDER.filter((s) => s !== app.status).map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="xs"
                  onClick={() => actions.advanceApplication(app.id, s, "手动推进")}
                >
                  推进到「{STATUS[s].label}」
                </Button>
              ))}
            </div>
          </div>

          {app.notes && (
            <div>
              <p className="mb-1.5 text-xs font-medium">备注</p>
              <p className="rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap text-muted-foreground">
                {app.notes}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium">时间线</p>
            {timeline.length === 0 && <p className="text-xs text-muted-foreground">暂无记录</p>}
            <ol className="relative space-y-3 border-l border-border pl-4">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[21px] top-1.5 size-2 rounded-full ring-2 ring-background",
                      e.type === "offer"
                        ? "bg-emerald-500"
                        : e.type === "rejected"
                          ? "bg-rose-500"
                          : "bg-primary",
                    )}
                  />
                  <p className="text-xs font-medium">{EVENT_LABELS[e.type] ?? e.type}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtFull(e.at)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <SheetFooter className="border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="mr-auto text-destructive"
            onClick={() => {
              actions.removeApplication(app.id)
              onOpenChange(false)
            }}
          >
            <Trash2 className="size-3.5" />
            删除
          </Button>
          <Button size="sm" onClick={() => onEdit(app)}>
            <Pencil className="size-3.5" />
            编辑
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
