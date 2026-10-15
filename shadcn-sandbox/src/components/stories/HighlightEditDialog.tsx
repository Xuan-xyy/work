import { useEffect, useState } from "react"

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
import { resumeBullet, scoreHighlight } from "@/lib/highlights"
import { actions } from "@/lib/store"
import { toast } from "@/lib/toast"
import type { Highlight } from "@/lib/types"

export function HighlightEditDialog({
  highlight,
  open,
  onOpenChange,
}: {
  highlight: Highlight | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [form, setForm] = useState<Highlight | null>(null)

  useEffect(() => {
    if (open && highlight) setForm({ ...highlight })
  }, [open, highlight])

  if (!form) return null
  const bullet = resumeBullet(form)

  const save = () => {
    if (!form.title.trim()) {
      toast("标题不能为空", "warn")
      return
    }
    actions.updateHighlight(form.id, {
      title: form.title.trim(),
      situation: form.situation,
      task: form.task,
      action: form.action,
      result: form.result,
      // 改完重算质量分，别让分数停留在旧内容上
      score: scoreHighlight(form),
    })
    toast("素材已更新")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑素材</DialogTitle>
          <DialogDescription>
            改到「念出来面试官会想追问」为止。结果里带数字的素材，通过率明显更高。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
          <Field label="标题">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="S · 情境">
            <Textarea
              value={form.situation}
              onChange={(e) => setForm({ ...form, situation: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </Field>
          <Field label="T · 任务">
            <Textarea
              value={form.task}
              onChange={(e) => setForm({ ...form, task: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </Field>
          <Field label="A · 行动">
            <Textarea
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              rows={3}
              className="text-xs"
            />
          </Field>
          <Field label="R · 结果">
            <Textarea
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </Field>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">
              简历句预览 · 素材质量 <span className="font-medium text-foreground">{scoreHighlight(form)}</span> 分
            </p>
            <p className="mt-1 text-sm">{bullet}</p>
            <Button
              variant="outline"
              size="xs"
              className="mt-2"
              onClick={() =>
                void navigator.clipboard.writeText(bullet).then(
                  () => toast("已复制"),
                  () => toast("复制失败", "warn"),
                )
              }
            >
              复制这句
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
