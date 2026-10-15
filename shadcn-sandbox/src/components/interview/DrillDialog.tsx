import { useEffect, useMemo, useState } from "react"
import { Check, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { drillFromLog, drillLayerLabel, drillsToDrafts, type DrillLayer } from "@/lib/interview"
import { actions, useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { InternshipLog } from "@/lib/types"

const LAYER_TONE: Record<DrillLayer, string> = {
  1: "border-slate-200 dark:border-slate-800",
  2: "border-amber-200 dark:border-amber-900",
  3: "border-rose-200 dark:border-rose-900",
}

const LAYER_BADGE: Record<DrillLayer, string> = {
  1: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  2: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  3: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
}

export function DrillDialog({
  log,
  open,
  onOpenChange,
}: {
  log: InternshipLog | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const db = useDB()
  const drills = useMemo(() => (log ? drillFromLog(log) : []), [log])
  const [picked, setPicked] = useState<number[]>([])

  useEffect(() => {
    if (open) setPicked(drills.map((_, i) => i))
  }, [open, drills])

  if (!log) return null

  const existing = new Set(
    db.questions
      .filter((q) => q.source === `日报 ${log.date}`)
      .map((q) => q.question),
  )

  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))

  const importPicked = () => {
    const chosen = drills.filter((_, i) => picked.includes(i))
    if (!chosen.length) {
      toast("至少选一题", "warn")
      return
    }
    const n = actions.addQuestions(drillsToDrafts(log, chosen))
    toast(`已入库 ${n} 道追问`)
    onOpenChange(false)
  }

  const layers: DrillLayer[] = [1, 2, 3]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            由这条日报生成的项目深挖追问
          </DialogTitle>
          <DialogDescription>
            规则化生成：把你的「卡点 / 做法 / 结果 / 技能」注入三层追问模板，所以问的是这条经历本身。
            面试官通常会从第一层问到第三层。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[56vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg bg-muted px-3 py-2 text-xs">
            <p className="font-medium">{log.project || "未命名项目"}</p>
            <p className="mt-0.5 text-muted-foreground">{log.did}</p>
            {log.metric && (
              <p className="mt-1 text-emerald-600 dark:text-emerald-400">成果：{log.metric}</p>
            )}
          </div>

          {layers.map((layer) => {
            const items = drills
              .map((d, i) => ({ d, i }))
              .filter((x) => x.d.layer === layer)
            if (!items.length) return null
            return (
              <section key={layer}>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium">
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px]", LAYER_BADGE[layer])}>
                    第 {layer} 层
                  </span>
                  {drillLayerLabel(layer)}
                </p>
                <ul className="space-y-2">
                  {items.map(({ d, i }) => {
                    const done = existing.has(d.question)
                    return (
                      <li
                        key={i}
                        className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5", LAYER_TONE[layer])}
                      >
                        <Checkbox
                          checked={picked.includes(i)}
                          onCheckedChange={() => toggle(i)}
                          className="mt-0.5"
                          disabled={done}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{d.question}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">考什么：{d.hint}</p>
                        </div>
                        {done && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3" />
                            已入库
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">
            已选 {picked.length} / {drills.length} 题
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={importPicked}>入库选中的追问</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
