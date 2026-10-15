import { useEffect, useMemo, useState } from "react"

import { Field } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { todayISO } from "@/lib/format"
import { scoreLog } from "@/lib/highlights"
import { SKILL_PRESETS } from "@/lib/constants"
import { actions } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { InternshipLog } from "@/lib/types"

type Draft = {
  date: string
  project: string
  did: string
  problem: string
  solution: string
  metric: string
  skills: string[]
  mood: InternshipLog["mood"]
}

const EMPTY: Draft = {
  date: todayISO(),
  project: "",
  did: "",
  problem: "",
  solution: "",
  metric: "",
  skills: [],
  mood: 3,
}

const MOODS: Array<{ v: InternshipLog["mood"]; label: string }> = [
  { v: 1, label: "很累" },
  { v: 2, label: "一般" },
  { v: 3, label: "还行" },
  { v: 4, label: "顺利" },
  { v: 5, label: "很棒" },
]

export function LogSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: InternshipLog | null
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [custom, setCustom] = useState("")

  useEffect(() => {
    if (!open) return
    setDraft(
      initial
        ? {
            date: initial.date,
            project: initial.project,
            did: initial.did,
            problem: initial.problem,
            solution: initial.solution,
            metric: initial.metric,
            skills: initial.skills,
            mood: initial.mood,
          }
        : EMPTY,
    )
    setCustom("")
  }, [open, initial])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const preview = useMemo(
    () =>
      scoreLog({
        id: "preview",
        createdAt: "",
        ...draft,
      }),
    [draft],
  )

  const toggleSkill = (s: string) =>
    setDraft((d) => ({
      ...d,
      skills: d.skills.includes(s) ? d.skills.filter((x) => x !== s) : [...d.skills, s],
    }))

  const save = () => {
    if (!draft.did.trim() && !draft.project.trim()) return
    if (initial) actions.updateInternshipLog(initial.id, draft)
    else actions.addInternshipLog(draft)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{initial ? "编辑日报" : "写今天的日报"}</SheetTitle>
          <SheetDescription>
            结构化日报是简历素材的唯一来源。写的时候想着面试官会怎么追问，就不会写成流水账。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="日期">
              <Input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="心情">
              <div className="flex gap-1">
                {MOODS.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => set("mood", m.v)}
                    className={cn(
                      "flex-1 rounded-md border px-1 py-1.5 text-[11px] transition-colors",
                      draft.mood === m.v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="项目 / 模块" hint="简历上按项目归类，同一个项目的多条日报会自动串起来">
            <Input
              value={draft.project}
              onChange={(e) => set("project", e.target.value)}
              placeholder="如：商家后台 · 订单导出重构"
            />
          </Field>

          <Field label="今天做了什么">
            <Textarea
              value={draft.did}
              onChange={(e) => set("did", e.target.value)}
              rows={3}
              placeholder="具体到动作，别写「推进了项目」"
            />
          </Field>

          <Field label="遇到的问题 / 难点" hint="这就是 STAR 里的 T，面试官最爱追问这里">
            <Textarea
              value={draft.problem}
              onChange={(e) => set("problem", e.target.value)}
              rows={2}
              placeholder="如：导出 10 万行时接口超时"
            />
          </Field>

          <Field label="怎么解决的" hint="STAR 里的 A，写清技术选型和取舍">
            <Textarea
              value={draft.solution}
              onChange={(e) => set("solution", e.target.value)}
              rows={3}
              placeholder="如：改成异步入队 + 分片拉取，结果落 OSS"
            />
          </Field>

          <Field label="可量化结果" hint="带数字的成果是简历里最值钱的一句">
            <Input
              value={draft.metric}
              onChange={(e) => set("metric", e.target.value)}
              placeholder="如：导出耗时 90s → 12s，超时率 8% → 0.3%"
            />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-medium">涉及技能</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...SKILL_PRESETS, ...draft.skills])].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                    draft.skills.includes(s)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="自定义技能"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim()) {
                    e.preventDefault()
                    toggleSkill(custom.trim())
                    setCustom("")
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (custom.trim()) {
                    toggleSkill(custom.trim())
                    setCustom("")
                  }
                }}
              >
                添加
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">这条日报的素材质量</p>
              <span className="text-sm font-semibold tabular-nums">{preview.score}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  preview.score >= 75
                    ? "bg-emerald-500"
                    : preview.score >= 45
                      ? "bg-amber-500"
                      : "bg-rose-500",
                )}
                style={{ width: `${preview.score}%` }}
              />
            </div>
            <ul className="mt-2 space-y-1">
              {preview.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <span className={r.ok ? "text-emerald-500" : "text-amber-500"}>{r.ok ? "✓" : "!"}</span>
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <SheetFooter className="border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!draft.did.trim() && !draft.project.trim()}>
            {initial ? "保存" : "记下来"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
