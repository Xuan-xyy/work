import { isSubmitted } from "./analytics"
import { daysFromToday, todayISO } from "./format"
import type { AutoMetric, DB, GoalItem, Highlight, InternshipLog, Skill } from "./types"

/* --------------------------- 技能证据 --------------------------- */

export type SkillEvidence = {
  logCount: number
  lastUsed: string
  examples: string[]
}

/** 技能不是自评出来的，是从日报里长出来的：统计它在多少条日报里出现过。 */
export function skillEvidence(name: string, logs: InternshipLog[]): SkillEvidence {
  const key = name.trim().toLowerCase()
  if (!key) return { logCount: 0, lastUsed: "", examples: [] }
  const hits = logs
    .filter((l) => l.skills.some((s) => s.trim().toLowerCase() === key))
    .sort((a, b) => b.date.localeCompare(a.date))
  return {
    logCount: hits.length,
    lastUsed: hits[0]?.date ?? "",
    examples: hits.slice(0, 3).map((l) => (l.project ? `${l.project}：${l.did}` : l.did)),
  }
}

/** 目标等级的现实校验：证据太少却自评很高，多半是高估了。 */
export function levelAdvice(skill: Skill, logs: InternshipLog[]): string | null {
  const ev = skillEvidence(skill.name, logs)
  if (skill.level >= 4 && ev.logCount < 2) {
    return `自评 ${skill.level} 分，但日报里只出现过 ${ev.logCount} 次。面试官追问细节时容易露怯，建议先补证据。`
  }
  if (skill.target - skill.level >= 3) {
    return `距目标还差 ${skill.target - skill.level} 级，跨度偏大。拆成两个阶段会更容易推进。`
  }
  if (ev.lastUsed && -daysFromToday(ev.lastUsed) > 60) {
    return `最近一次用到是 ${Math.abs(daysFromToday(ev.lastUsed))} 天前，面试前建议快速过一遍。`
  }
  return null
}

/* --------------------------- 目标自动进度 --------------------------- */

export function autoMetricValue(metric: AutoMetric, db: DB): number {
  switch (metric) {
    case "applications":
      return db.applications.length
    case "submitted":
      return db.applications.filter(isSubmitted).length
    case "interviews":
      return db.applications.filter((a) => a.status === "interview").length
    case "offers":
      return db.applications.filter((a) => a.status === "offer").length
    case "logs":
      return db.internship.length
    case "highlights":
      return db.highlights.length
    case "questions":
      return db.questions.length
    default:
      return 0
  }
}

export type GoalProgress = {
  pct: number
  value: number
  target: number
  auto: boolean
  overdue: boolean
}

export function goalProgress(goal: GoalItem, db: DB): GoalProgress {
  if (goal.autoMetric) {
    const value = autoMetricValue(goal.autoMetric, db)
    const target = goal.autoTarget || 1
    return {
      pct: Math.min(100, Math.round((value / target) * 100)),
      value,
      target,
      auto: true,
      overdue: Boolean(goal.dueAt) && daysFromToday(goal.dueAt) < 0 && value < target,
    }
  }
  return {
    pct: Math.min(100, Math.max(0, goal.progress)),
    value: goal.progress,
    target: 100,
    auto: false,
    overdue: Boolean(goal.dueAt) && daysFromToday(goal.dueAt) < 0 && !goal.done,
  }
}

export function groupGoals(goals: GoalItem[]): Record<string, GoalItem[]> {
  return {
    "3m": goals.filter((g) => g.horizon === "3m"),
    "1y": goals.filter((g) => g.horizon === "1y"),
    "3y": goals.filter((g) => g.horizon === "3y"),
  }
}

/* --------------------------- 汇总 --------------------------- */

export type CareerSummary = {
  skillCount: number
  avgLevel: number
  avgTarget: number
  gap: number
  evidenceBacked: number
  goalsDone: number
  goalsTotal: number
  highlightCount: number
  logCount: number
}

export function careerSummary(db: DB): CareerSummary {
  const skills = db.skills
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const levels = skills.map((s) => s.level)
  const targets = skills.map((s) => s.target)
  return {
    skillCount: skills.length,
    avgLevel: Number(avg(levels).toFixed(1)),
    avgTarget: Number(avg(targets).toFixed(1)),
    gap: Number((avg(targets) - avg(levels)).toFixed(1)),
    evidenceBacked: skills.filter((s) => skillEvidence(s.name, db.internship).logCount > 0).length,
    goalsDone: db.goals.filter((g) => g.done).length,
    goalsTotal: db.goals.length,
    highlightCount: db.highlights.length,
    logCount: db.internship.length,
  }
}

/** 季度复盘：把这一季的实习与秋招数据摊开看。 */
export function quarterSummary(db: DB): { lines: string[] } {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  const startMonth = (q - 1) * 3
  const start = `${now.getFullYear()}-${String(startMonth + 1).padStart(2, "0")}-01`
  const inQuarter = (iso: string) => Boolean(iso) && iso >= start && iso <= todayISO()

  const logs = db.internship.filter((l) => inQuarter(l.date))
  const highlights = db.highlights.filter((h) => inQuarter(h.date))
  const apps = db.applications.filter((a) => inQuarter(a.appliedAt))
  const offers = db.applications.filter((a) =>
    a.timeline.some((t) => t.type === "offer" && inQuarter(t.at)),
  )

  const lines = [
    `第 ${q} 季度（${start} 起）`,
    `· 实习日报 ${logs.length} 条，沉淀亮点 ${highlights.length} 条`,
    `· 新增投递 ${apps.length} 家，收获 Offer ${offers.length} 个`,
    `· 技能覆盖 ${db.skills.filter((s) => skillEvidence(s.name, logs).logCount > 0).length} 项`,
  ]
  if (logs.length === 0) lines.push("· 本季度没有实习日报记录，如果这段在实习，素材正在流失")
  if (highlights.length === 0 && logs.length > 0) {
    lines.push("· 有日报但没有提炼亮点，素材还没变成简历能用的句子")
  }
  return { lines }
}

export type { Highlight }
