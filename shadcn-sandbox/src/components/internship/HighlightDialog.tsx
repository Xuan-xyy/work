import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

import { Field } from "@/components/bits"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { draftFromLog, resumeBullet, scoreHighlight } from "@/lib/highlights"
import { actions } from "@/lib/store"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { Highlight, InternshipLog } from "@/lib/types"

export function HighlightDialog({
  log,
  open,
  onOpenChange,
}: {
  log: InternshipLog | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [form, setForm] = useState<Omit<Highlight, "id" | "createdAt" | "used" | "logId">>({
    date: "",
    title: "",
    situation: "",
    task: "",
    action: "",
    result: "",
    score: 0,
  })
  const [reasons, setReasons] = useState<Array<{ ok: boolean; text: string }>>([])

  useEffect(() => {
    if (!open || !log) return
    const d = draftFromLog(log)
    setForm({
      date: log.date,
      title: d.title,
      situation: d.situation,
      task: d.task,
      action: d.action,
      result: d.result,
      score: d.score,
    })
    setReasons(d.reasons)
  }, [open, log])

  if (!log) return null

  const bullet = resumeBullet({ ...form, id: "", logId: log.id, used: false, createdAt: "" })

  const save = () => {
    actions.addHighlight({ ...form, logId: log.id, used: false, score: scoreHighlight(form) })
    toast("已存入简历素材库")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            提炼成简历亮点
          </DialogTitle>
          <DialogDescription>
            已按 STAR 结构自动填好，直接改到能念出来为止。素材质量 {scoreHighlight(form)} 分。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
          <Field label="亮点标题" hint="以后靠它检索，写清「在哪个项目做了什么」">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="S · 情境" hint="项目背景与时间">
              <Textarea
                value={form.situation}
                onChange={(e) => setForm({ ...form, situation: e.target.value })}
                rows={2}
                className="text-xs"
              />
            </Field>
            <Field label="T · 任务" hint="你要解决的问题">
              <Textarea
                value={form.task}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
                rows={2}
                className="text-xs"
              />
            </Field>
          </div>

          <Field label="A · 行动" hint="你具体做了什么，用了什么技术">
            <Textarea
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              rows={3}
              className="text-xs"
            />
          </Field>

          <Field label="R · 结果" hint="数字最重要；没有数字的亮点很难被记住">
            <Textarea
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              rows={2}
              className={cn(
                "text-xs",
                /\d/.test(form.result) ? "" : "border-amber-300 dark:border-amber-800",
              )}
            />
          </Field>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">简历里可以直贴这一句：</p>
            <p className="mt-1 text-sm">{bullet}</p>
            <Button
              variant="outline"
              size="xs"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(bullet).then(
                  () => toast("已复制这一句"),
                  () => toast("复制失败，请手动选择", "warn"),
                )
              }}
            >
              复制这句
            </Button>
          </div>

          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className={r.ok ? "text-emerald-500" : "text-amber-500"}>{r.ok ? "✓" : "!"}</span>
                {r.text}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!form.title.trim()}>
            存入素材库
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
