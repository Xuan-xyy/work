import { useEffect, useState } from "react"

import { Field } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { INTERVIEW_FORMATS, ROUND_NAMES, ROUND_RESULTS } from "@/lib/constants"
import { todayISO } from "@/lib/format"
import { extractQuestionsFromRound } from "@/lib/interview"
import { actions, useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { InterviewRound } from "@/lib/types"

type Draft = Omit<InterviewRound, "id" | "createdAt">

const EMPTY: Draft = {
  company: "",
  role: "",
  round: "一面",
  date: todayISO(),
  format: "线上视频",
  duration: 45,
  questions: "",
  selfRating: 3,
  wentWell: "",
  wentWrong: "",
  nextTime: "",
  result: "待定",
}

export function RoundSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: InterviewRound | null
}) {
  const db = useDB()
  const [draft, setDraft] = useState<Draft>(EMPTY)

  useEffect(() => {
    if (!open) return
    setDraft(
      initial
        ? {
            company: initial.company,
            role: initial.role,
            round: initial.round,
            date: initial.date,
            format: initial.format,
            duration: initial.duration,
            questions: initial.questions,
            selfRating: initial.selfRating,
            wentWell: initial.wentWell,
            wentWrong: initial.wentWrong,
            nextTime: initial.nextTime,
            result: initial.result,
          }
        : EMPTY,
    )
  }, [open, initial])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    if (!draft.company.trim()) return
    if (initial) actions.updateRound(initial.id, draft)
    else actions.addRound(draft)
    onOpenChange(false)
  }

  const extracted = extractQuestionsFromRound({ ...draft, id: "", createdAt: "" }).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{initial ? "编辑复盘" : "记录一次面试"}</SheetTitle>
          <SheetDescription>
            趁热写。面试完 2 小时内记下的东西，比第二天补的有用十倍。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="公司 *">
              <Input
                value={draft.company}
                onChange={(e) => set("company", e.target.value)}
                list="round-companies"
              />
              <datalist id="round-companies">
                {[...new Set(db.applications.map((a) => a.company))].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="岗位">
              <Input value={draft.role} onChange={(e) => set("role", e.target.value)} />
            </Field>
            <Field label="轮次">
              <Select value={draft.round} onValueChange={(v) => set("round", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_NAMES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="形式">
              <Select value={draft.format} onValueChange={(v) => set("format", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="日期">
              <Input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="时长（分钟）">
              <Input
                type="number"
                value={draft.duration}
                onChange={(e) => set("duration", Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          <Field
            label="问了什么"
            hint={`一行一题，保存后可一键提取到题库（当前 ${extracted} 题）`}
          >
            <Textarea
              value={draft.questions}
              onChange={(e) => set("questions", e.target.value)}
              rows={5}
              className="text-xs"
              placeholder={"自我介绍\n订单导出为什么异步化\n手撕：合并 K 个有序链表"}
            />
          </Field>

          <Field label="自评">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("selfRating", n)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs transition-colors",
                    draft.selfRating === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="答得好的地方" hint="写下来，下次继续用">
            <Textarea
              value={draft.wentWell}
              onChange={(e) => set("wentWell", e.target.value)}
              rows={2}
              className="text-xs"
            />
          </Field>

          <Field label="答砸的地方" hint="具体到哪一问、卡在哪，别写「有点紧张」">
            <Textarea
              value={draft.wentWrong}
              onChange={(e) => set("wentWrong", e.target.value)}
              rows={2}
              className="text-xs"
            />
          </Field>

          <Field label="下次怎么做" hint="要是一个可执行动作，不是决心">
            <Textarea
              value={draft.nextTime}
              onChange={(e) => set("nextTime", e.target.value)}
              rows={2}
              className="text-xs"
            />
          </Field>

          <Field label="结果">
            <Select value={draft.result} onValueChange={(v) => set("result", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUND_RESULTS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <SheetFooter className="border-t border-border">
          <Button
            variant="outline"
            className="mr-auto"
            disabled={extracted === 0}
            onClick={() => {
              const texts = extractQuestionsFromRound({ ...draft, id: "", createdAt: "" })
              const n = actions.addQuestions(
                texts.map((t) => ({
                  question: t,
                  category: "项目深挖",
                  company: draft.company,
                  role: draft.role,
                  source: `复盘 ${draft.date}`,
                  mastery: 0 as const,
                })),
              )
              toast(`已从复盘提取 ${n} 题到题库`)
            }}
          >
            提取题目到题库
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!draft.company.trim()}>
            {initial ? "保存" : "记录"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
