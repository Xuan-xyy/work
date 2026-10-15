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
import { AUTO_METRICS, HORIZONS, SKILL_CATEGORIES } from "@/lib/constants"
import { skillEvidence } from "@/lib/career"
import { todayISO } from "@/lib/format"
import { actions, useDB } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { AutoMetric, GoalHorizon, GoalItem, Skill } from "@/lib/types"

function LevelPicker({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (n: number) => void
  label: string
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 rounded-md border py-1.5 text-xs tabular-nums transition-colors",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:bg-accent",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </Field>
  )
}

/* ------------------------------ 技能 ------------------------------ */

export function SkillSheet({
  skill,
  open,
  onOpenChange,
}: {
  skill: Skill | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const db = useDB()
  const [form, setForm] = useState<Omit<Skill, "id" | "updatedAt">>({
    name: "",
    category: SKILL_CATEGORIES[0],
    level: 2,
    target: 4,
  })

  useEffect(() => {
    if (!open) return
    setForm(
      skill
        ? { name: skill.name, category: skill.category, level: skill.level, target: skill.target }
        : { name: "", category: SKILL_CATEGORIES[0], level: 2, target: 4 },
    )
  }, [open, skill])

  const evidence = skillEvidence(form.name, db.internship)

  const save = () => {
    if (!form.name.trim()) return
    if (skill) actions.updateSkill(skill.id, form)
    else actions.addSkill(form)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{skill ? "编辑技能" : "新增技能"}</SheetTitle>
          <SheetDescription>
            自评要诚实。面试官会顺着你写的技能往下问，自评 5 分就得扛得住 5 分的追问。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <Field label="技能名 *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Java / SQL / 跨部门沟通"
            />
          </Field>
          <Field label="分类">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKILL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <LevelPicker
            label="当前自评（1 了解 / 3 能独立用 / 5 能带人）"
            value={form.level}
            onChange={(n) => setForm({ ...form, level: n })}
          />
          <LevelPicker
            label="目标等级（目标岗位要求到哪一档）"
            value={form.target}
            onChange={(n) => setForm({ ...form, target: n })}
          />

          {form.name.trim() && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-[11px] font-medium">日报里的证据</p>
              {evidence.logCount === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  还没在任何实习日报里用过这项技能。自评和证据对不上，面试时容易露怯。
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    在 {evidence.logCount} 条日报里出现过，最近一次 {evidence.lastUsed}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {evidence.examples.map((e, i) => (
                      <li key={i} className="truncate text-[11px] text-muted-foreground">
                        · {e}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!form.name.trim()}>
            {skill ? "保存" : "添加"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------ 目标 ------------------------------ */

export function GoalSheet({
  goal,
  open,
  onOpenChange,
}: {
  goal: GoalItem | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [form, setForm] = useState<{
    title: string
    horizon: GoalHorizon
    detail: string
    progress: number
    dueAt: string
    autoMetric: AutoMetric
    autoTarget: number
  }>({
    title: "",
    horizon: "3m",
    detail: "",
    progress: 0,
    dueAt: "",
    autoMetric: "",
    autoTarget: 0,
  })

  useEffect(() => {
    if (!open) return
    setForm(
      goal
        ? {
            title: goal.title,
            horizon: goal.horizon,
            detail: goal.detail,
            progress: goal.progress,
            dueAt: goal.dueAt,
            autoMetric: goal.autoMetric,
            autoTarget: goal.autoTarget,
          }
        : {
            title: "",
            horizon: "3m",
            detail: "",
            progress: 0,
            dueAt: "",
            autoMetric: "",
            autoTarget: 0,
          },
    )
  }, [open, goal])

  const save = () => {
    if (!form.title.trim()) return
    if (goal) actions.updateGoal(goal.id, form)
    else actions.addGoal(form)
    onOpenChange(false)
  }

  const auto = Boolean(form.autoMetric)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{goal ? "编辑目标" : "新增目标"}</SheetTitle>
          <SheetDescription>
            能挂数据指标的目标就别手动拖进度条——让它自己算，你才知道是真的在推进还是自我感觉良好。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <Field label="目标 *">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="秋招拿到 3 个可比较的 Offer"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="时间跨度">
              <Select
                value={form.horizon}
                onValueChange={(v) => setForm({ ...form, horizon: v as GoalHorizon })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORIZONS.map((h) => (
                    <SelectItem key={h.v} value={h.v}>
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="截止日期">
              <Input
                type="date"
                value={form.dueAt}
                min={todayISO()}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </Field>
          </div>

          <Field label="备注" hint="写清「为什么是这个目标」，三个月后你才不会怀疑自己">
            <Textarea
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              rows={3}
              className="text-xs"
            />
          </Field>

          <Field label="进度来源">
            <Select
              value={form.autoMetric || "manual"}
              onValueChange={(v) =>
                setForm({ ...form, autoMetric: (v === "manual" ? "" : v) as AutoMetric })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手动调整</SelectItem>
                {AUTO_METRICS.filter((m) => m.v).map((m) => (
                  <SelectItem key={m.v} value={m.v}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {auto ? (
            <Field label="目标值" hint="比如「Offer 数」填 3，工作台会自动数你拿到几个">
              <Input
                type="number"
                min={1}
                value={form.autoTarget || ""}
                onChange={(e) => setForm({ ...form, autoTarget: Number(e.target.value) || 0 })}
              />
            </Field>
          ) : (
            <Field label={`当前进度 ${form.progress}%`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                className="w-full accent-[var(--primary)]"
              />
            </Field>
          )}
        </div>

        <SheetFooter className="border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={!form.title.trim()}>
            {goal ? "保存" : "添加"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
