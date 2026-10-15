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
import { MASTERY_LEVELS, QUESTION_CATEGORIES } from "@/lib/constants"
import { nextReviewDate } from "@/lib/interview"
import { actions } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { InterviewQuestion, MasteryLevel } from "@/lib/types"

type Draft = {
  question: string
  category: string
  company: string
  role: string
  difficulty: number
  mastery: MasteryLevel
  answer: string
  better: string
  tags: string
}

const EMPTY: Draft = {
  question: "",
  category: QUESTION_CATEGORIES[0],
  company: "",
  role: "",
  difficulty: 3,
  mastery: 0,
  answer: "",
  better: "",
  tags: "",
}

export function QuestionSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: InterviewQuestion | null
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY)

  useEffect(() => {
    if (!open) return
    setDraft(
      initial
        ? {
            question: initial.question,
            category: initial.category,
            company: initial.company,
            role: initial.role,
            difficulty: initial.difficulty,
            mastery: initial.mastery,
            answer: initial.answer,
            better: initial.better,
            tags: initial.tags.join(" "),
          }
        : EMPTY,
    )
  }, [open, initial])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = () => {
    if (!draft.question.trim()) return
    const payload = {
      question: draft.question.trim(),
      category: draft.category,
      company: draft.company.trim(),
      role: draft.role.trim(),
      difficulty: draft.difficulty,
      mastery: draft.mastery,
      answer: draft.answer.trim(),
      better: draft.better.trim(),
      tags: draft.tags.split(/[\s,，]+/).filter(Boolean),
    }
    if (initial) actions.updateQuestion(initial.id, payload)
    else actions.addQuestion(payload)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{initial ? "编辑题目" : "新增题目"}</SheetTitle>
          <SheetDescription>
            「我现在的答法」和「更好的答法」分开写——差距就是你要复习的东西。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <Field label="题目 *">
            <Textarea
              value={draft.question}
              onChange={(e) => set("question", e.target.value)}
              rows={2}
              placeholder="把面试官的原话记下来，别转述"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="分类">
              <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="难度">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("difficulty", n)}
                    className={cn(
                      "size-8 rounded-md border text-xs tabular-nums transition-colors",
                      draft.difficulty === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="公司">
              <Input
                value={draft.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="留空表示通用题"
              />
            </Field>
            <Field label="岗位">
              <Input value={draft.role} onChange={(e) => set("role", e.target.value)} />
            </Field>
          </div>

          <Field label="我现在的答法" hint="真实还原你当时怎么答的，哪怕是错的">
            <Textarea
              value={draft.answer}
              onChange={(e) => set("answer", e.target.value)}
              rows={3}
              className="text-xs"
            />
          </Field>

          <Field label="更好的答法 / 参考要点" hint="面试官想听到的结构和取舍">
            <Textarea
              value={draft.better}
              onChange={(e) => set("better", e.target.value)}
              rows={4}
              className="text-xs"
            />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-medium">掌握度</p>
            <div className="flex gap-1.5">
              {MASTERY_LEVELS.map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => set("mastery", m.v)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                    draft.mastery === m.v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              保存后下次复习时间自动排到 {nextReviewDate(draft.mastery)}（越熟间隔越长）
            </p>
          </div>

          <Field label="标签">
            <Input
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Java 并发"
            />
          </Field>
        </div>

        <SheetFooter className="border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!draft.question.trim()}>
            {initial ? "保存" : "添加"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
