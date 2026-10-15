import { useMemo, useState } from "react"
import { Check, Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react"

import { Empty, Kpi, PageHeader, SectionCard } from "@/components/bits"
import { GoalSheet, SkillSheet } from "@/components/career/sheets"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { HORIZONS, SKILL_CATEGORIES } from "@/lib/constants"
import { careerSummary, goalProgress, levelAdvice, quarterSummary, skillEvidence } from "@/lib/career"
import { fmtMd } from "@/lib/format"
import { AUTO_METRICS } from "@/lib/constants"
import { actions, useDB } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { GoalItem, Skill } from "@/lib/types"

function metricLabel(v: string): string {
  return AUTO_METRICS.find((m) => m.v === v)?.label ?? v
}

function SkillRow({ skill, onEdit }: { skill: Skill; onEdit: () => void }) {
  const db = useDB()
  const ev = skillEvidence(skill.name, db.internship)
  const advice = levelAdvice(skill, db.internship)
  const gap = skill.target - skill.level

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm">{skill.name}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {ev.logCount > 0 ? `${ev.logCount} 条日报` : "无日报证据"}
        </span>
        <span className="shrink-0 text-xs tabular-nums">
          <span className="font-medium">{skill.level}</span>
          <span className="text-muted-foreground"> / {skill.target}</span>
        </span>
        <Button variant="ghost" size="icon-xs" aria-label="编辑" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="删除"
          onClick={() => actions.removeSkill(skill.id)}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>

      <div className="relative mt-2 h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            gap <= 0 ? "bg-emerald-500" : gap === 1 ? "bg-primary" : "bg-amber-500",
          )}
          style={{ width: `${(skill.level / 5) * 100}%` }}
        />
        <div
          className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/50"
          style={{ left: `calc(${(skill.target / 5) * 100}% - 1px)` }}
          title={`目标 ${skill.target}`}
        />
      </div>

      {advice && <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">{advice}</p>}
    </li>
  )
}

function GoalRow({ goal, onEdit }: { goal: GoalItem; onEdit: () => void }) {
  const db = useDB()
  const p = goalProgress(goal, db)

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={goal.done}
          onCheckedChange={() => actions.toggleGoalDone(goal.id)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", goal.done && "text-muted-foreground line-through")}>
            {goal.title}
          </p>
          {goal.detail && <p className="mt-0.5 text-xs text-muted-foreground">{goal.detail}</p>}
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  goal.done ? "bg-emerald-500" : p.overdue ? "bg-rose-500" : "bg-primary",
                )}
                style={{ width: `${goal.done ? 100 : p.pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {p.auto ? `${p.value} / ${p.target}` : `${p.pct}%`}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {p.auto && (
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                <TrendingUp className="size-2.5" />
                自动统计：{metricLabel(goal.autoMetric)}
              </span>
            )}
            {goal.dueAt && (
              <span
                className={cn(
                  "text-[11px]",
                  p.overdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                )}
              >
                {p.overdue ? "已逾期 · " : "截止 "}
                {fmtMd(goal.dueAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon-xs" aria-label="编辑" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="删除"
            onClick={() => actions.removeGoal(goal.id)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </li>
  )
}

export function Career() {
  const db = useDB()
  const [skillOpen, setSkillOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null)

  const sum = useMemo(() => careerSummary(db), [db])
  const quarter = useMemo(() => quarterSummary(db), [db])

  const byCategory = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const s of db.skills) {
      const arr = map.get(s.category) ?? []
      arr.push(s)
      map.set(s.category, arr)
    }
    return SKILL_CATEGORIES.filter((c) => map.has(c)).map((c) => ({
      category: c,
      skills: map.get(c)!.sort((a, b) => b.target - b.level - (a.target - a.level)),
    }))
  }, [db.skills])

  const openNewSkill = () => {
    setEditingSkill(null)
    setSkillOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="职业成长"
        description="技能不是自评出来的，是从日报里长出来的——这里把两条线对起来看。"
        action={
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingGoal(null)
                setGoalOpen(true)
              }}
            >
              <Target className="size-3.5" />
              新增目标
            </Button>
            <Button size="sm" onClick={openNewSkill}>
              <Plus className="size-3.5" />
              新增技能
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="技能项"
          value={sum.skillCount}
          hint={`${sum.evidenceBacked} 项有日报证据支撑`}
        />
        <Kpi
          label="平均自评"
          value={sum.avgLevel}
          hint={`目标平均 ${sum.avgTarget}`}
        />
        <Kpi
          label="能力缺口"
          value={sum.gap}
          tone={sum.gap >= 2 ? "warn" : sum.gap <= 1 ? "good" : "default"}
          hint="目标与现状的平均差"
        />
        <Kpi
          label="目标完成"
          value={`${sum.goalsDone} / ${sum.goalsTotal}`}
          hint={`素材 ${sum.highlightCount} 条 · 日报 ${sum.logCount} 条`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title="技能进度"
            description="竖线是目标等级，横条是当前自评。差 2 级以上的会标出来。"
          >
            {db.skills.length === 0 ? (
              <Empty
                title="还没有技能记录"
                description="先把实习里真实用过的技术和方法加进来。自评要诚实——面试官会顺着往下问。"
                action={
                  <Button size="sm" onClick={openNewSkill}>
                    新增第一项
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {byCategory.map((g) => (
                  <div key={g.category}>
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">{g.category}</p>
                    <ul className="divide-y divide-border">
                      {g.skills.map((s) => (
                        <SkillRow
                          key={s.id}
                          skill={s}
                          onEdit={() => {
                            setEditingSkill(s)
                            setSkillOpen(true)
                          }}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="长期目标"
            description="挂了数据指标的会自动算进度，骗不了自己"
            action={
              <span className="text-xs text-muted-foreground">
                {sum.goalsDone} / {sum.goalsTotal} 已完成
              </span>
            }
          >
            {db.goals.length === 0 ? (
              <Empty
                title="还没有目标"
                description="先写一个 3 个月内的具体目标，比如「拿到 3 个可比较的 Offer」。"
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingGoal(null)
                      setGoalOpen(true)
                    }}
                  >
                    新增目标
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {HORIZONS.map((h) => {
                  const items = db.goals.filter((g) => g.horizon === h.v)
                  if (!items.length) return null
                  return (
                    <div key={h.v}>
                      <p className="mb-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        {h.label}
                        <span className="tabular-nums">{items.length} 个</span>
                      </p>
                      <ul className="space-y-2">
                        {items.map((g) => (
                          <GoalRow
                            key={g.id}
                            goal={g}
                            onEdit={() => {
                              setEditingGoal(g)
                              setGoalOpen(true)
                            }}
                          />
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="季度复盘" description="这一季你到底推进了什么">
            <ul className="space-y-1.5">
              {quarter.lines.map((l, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  {l}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="证据链" description="每条技能的支撑来自哪里">
            <ul className="space-y-2">
              {db.skills.slice(0, 12).map((s) => {
                const ev = skillEvidence(s.name, db.internship)
                const w = db.skills.length
                  ? Math.min(100, (ev.logCount / Math.max(1, ...db.skills.map((x) => skillEvidence(x.name, db.internship).logCount))) * 100)
                  : 0
                return (
                  <li key={s.id} className="flex items-center gap-2.5">
                    <span className="w-20 shrink-0 truncate text-xs">{s.name}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                      <div className="h-full rounded bg-emerald-500/70" style={{ width: `${w}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {ev.logCount} 条
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              横条越短，说明这项技能你只是「会」，但项目里没什么能拿出来讲的经历。
              面试前优先补这些——它们最容易被追问到露馅。
            </p>
          </SectionCard>

          <SectionCard title="三步走" description="如果不知道从哪开始">
            <ol className="space-y-2.5">
              {[
                "先补证据薄弱的技能：要么在实习里找机会上手，要么老实调低自评。",
                "把差距 2 级以上的技能拆成「3 个月补到 3 分」这种可验证的小目标。",
                "每个目标挂一个数据指标，让它自己算进度——自我感觉良好是最贵的错觉。",
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground">{t}</p>
                </li>
              ))}
            </ol>
          </SectionCard>

          {sum.evidenceBacked < sum.skillCount && (
            <SectionCard title="提醒">
              <p className="text-xs text-muted-foreground">
                有 {sum.skillCount - sum.evidenceBacked} 项技能在实习日报里从没出现过。
                写在简历上的东西，至少要有一条经历能对上——否则面试官一问就穿了。
              </p>
            </SectionCard>
          )}

          <SectionCard title="已完成">
            {db.goals.filter((g) => g.done).length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-3.5" />
                还没有完成的目标。第一个别定太大。
              </p>
            ) : (
              <ul className="space-y-1">
                {db.goals
                  .filter((g) => g.done)
                  .map((g) => (
                    <li key={g.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="line-through">{g.title}</span>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SkillSheet skill={editingSkill} open={skillOpen} onOpenChange={setSkillOpen} />
      <GoalSheet goal={editingGoal} open={goalOpen} onOpenChange={setGoalOpen} />
    </div>
  )
}
