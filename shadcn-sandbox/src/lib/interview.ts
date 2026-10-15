import { addDays, todayISO } from "./format"
import type { InternshipLog, InterviewQuestion, InterviewRound, MasteryLevel } from "./types"

/** 掌握度越高，复习间隔越长（简化版间隔重复）。 */
const REVIEW_INTERVAL: Record<MasteryLevel, number> = { 0: 1, 1: 3, 2: 7, 3: 21 }

export function nextReviewDate(mastery: MasteryLevel, from = todayISO()): string {
  return addDays(from, REVIEW_INTERVAL[mastery])
}

export type MasteryStats = {
  total: number
  byLevel: Record<MasteryLevel, number>
  /** 掌握度 >= 2 的占比 */
  readyPct: number
  dueCount: number
  /** 加权准备度：0–100，掌握度 0/1/2/3 各计 0/40/75/100 */
  readiness: number
}

const READINESS_WEIGHT: Record<MasteryLevel, number> = { 0: 0, 1: 40, 2: 75, 3: 100 }

export function masteryStats(questions: InterviewQuestion[], today = todayISO()): MasteryStats {
  const byLevel: Record<MasteryLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (const q of questions) byLevel[q.mastery] = (byLevel[q.mastery] ?? 0) + 1
  const ready = byLevel[2] + byLevel[3]
  const readiness = questions.length
    ? Math.round(questions.reduce((s, q) => s + READINESS_WEIGHT[q.mastery], 0) / questions.length)
    : 0
  return {
    total: questions.length,
    byLevel,
    readyPct: questions.length ? Math.round((ready / questions.length) * 100) : 0,
    dueCount: questions.filter((q) => !q.reviewAt || q.reviewAt <= today).length,
    readiness,
  }
}

/** 到期需要复习的题目，逾期越久越靠前。 */
export function dueQuestions(questions: InterviewQuestion[], today = todayISO()): InterviewQuestion[] {
  return questions
    .filter((q) => !q.reviewAt || q.reviewAt <= today)
    .sort((a, b) => (a.reviewAt || "").localeCompare(b.reviewAt || ""))
}

export function questionsByCategory(questions: InterviewQuestion[]): Array<{ name: string; count: number }> {
  const map = new Map<string, number>()
  for (const q of questions) map.set(q.category || "未分类", (map.get(q.category || "未分类") ?? 0) + 1)
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

export function questionsByCompany(questions: InterviewQuestion[], limit = 8): Array<{ name: string; count: number }> {
  const map = new Map<string, number>()
  for (const q of questions) {
    const k = q.company.trim() || "通用"
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/* ------------------------- 复盘 → 题库 ------------------------- */

/** 把复盘里「问了什么」的文本切成独立题目，过滤掉太短的噪音行。 */
export function extractQuestionsFromRound(round: InterviewRound): string[] {
  return round.questions
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-•*\d.、)）]+/, "").trim())
    .filter((l) => l.length >= 4)
}

/** 找出题库里已经存在的同题，避免重复导入。 */
export function findDuplicate(questions: InterviewQuestion[], text: string): InterviewQuestion | undefined {
  const norm = (s: string) => s.replace(/[\s，。？?！!、.]/g, "").toLowerCase()
  const t = norm(text)
  return questions.find((q) => norm(q.question) === t)
}

/* --------------------- 日报 → 三层项目深挖追问 --------------------- */

export type DrillLayer = 1 | 2 | 3

export type DrillQuestion = {
  layer: DrillLayer
  question: string
  hint: string
}

const LAYER_LABEL: Record<DrillLayer, string> = {
  1: "事实层 · 你到底做了什么",
  2: "决策层 · 为什么这么做",
  3: "深挖层 · 撑不撑得住追问",
}

export function drillLayerLabel(layer: DrillLayer): string {
  return LAYER_LABEL[layer]
}

/** 截断到自然断点，避免把长句硬切。 */
function clip(s: string, max = 40): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ")
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const at = Math.max(cut.lastIndexOf("，"), cut.lastIndexOf("。"), cut.lastIndexOf("、"), cut.lastIndexOf(" "))
  return (at > max * 0.5 ? cut.slice(0, at) : cut) + "…"
}

/**
 * 日报的 skills 是自由标签，里面混着「项目推进」「跨部门沟通」这类软技能。
 * 把它们塞进「讲讲 X 最关键的特性」会生成一句废话，所以只对技术标签出这道题。
 */
const SOFT_SKILLS = new Set([
  "项目推进",
  "跨部门沟通",
  "文档沉淀",
  "需求分析",
  "沟通",
  "协作",
  "复盘",
  "会议",
  "排期",
])

export function techSkills(skills: string[]): string[] {
  return skills.map((s) => s.trim()).filter((s) => s && !SOFT_SKILLS.has(s))
}

/**
 * 由一条实习日报生成三层追问链。
 * 规则化生成：把日报里真实写下的「卡点 / 做法 / 结果 / 技能」注入模板，
 * 所以问出来的是针对这条经历的，而不是通用面试题。
 */
export function drillFromLog(log: InternshipLog): DrillQuestion[] {
  const project = log.project.trim() || "这个项目"
  const out: DrillQuestion[] = []

  // ---- 第一层：事实 ----
  out.push({
    layer: 1,
    question: `${project}里你具体负责哪一部分？团队几个人，你交付了什么？`,
    hint: "面试官先确认你是不是真的做过。答不出边界，后面全是减分项。",
  })
  if (log.did.trim()) {
    out.push({
      layer: 1,
      question: `你说你${clip(log.did, 36)}——这件事从接到需求到上线，中间经历了哪几步？`,
      hint: "用 3–5 步讲完，别跳步骤，也别背流程。",
    })
  }

  // ---- 第二层：决策 ----
  if (log.problem.trim()) {
    out.push({
      layer: 2,
      question: `你提到「${clip(log.problem, 34)}」——当时是怎么定位到根因的？看了哪些指标或日志？`,
      hint: "考的是排查方法论，不是答案本身。说清「先怀疑什么、怎么排除」。",
    })
  }
  if (log.solution.trim()) {
    out.push({
      layer: 2,
      question: `为什么选「${clip(log.solution, 34)}」这个方案？还有哪些备选，各自的代价是什么？`,
      hint: "必考。至少要说出一个被否掉的方案和否掉的理由。",
    })
  }
  const tech = techSkills(log.skills)
  if (tech.length) {
    out.push({
      layer: 2,
      question: `这里用到了 ${tech.slice(0, 3).join(" / ")}，讲讲在这个场景下最关键的那个特性是什么？`,
      hint: "把技术和具体场景绑起来讲，别背八股原文。",
    })
  }

  // ---- 第三层：深挖 ----
  if (log.metric.trim()) {
    out.push({
      layer: 3,
      question: `「${clip(log.metric, 30)}」这个数字是怎么测出来的？看的是均值还是 P99？样本多大？`,
      hint: "数字经不起追问，比没有数字更糟。先想清楚口径。",
    })
  }
  out.push({
    layer: 3,
    question: `如果${project}的规模再涨 10 倍，你的方案哪里会先扛不住？你会怎么改？`,
    hint: "考容量意识。答「加机器」等于没答，要说清瓶颈点在哪一层。",
  })
  out.push({
    layer: 3,
    question: `这个方案上线后出过问题吗？如果现在让你重做一遍，你会改哪一处？`,
    hint: "这题在考反思能力。说一个真实的不足，比说「没问题」安全得多。",
  })

  return out
}

/** 把日报批量转成可入库的题目草稿。 */
export function drillsToDrafts(log: InternshipLog, drills: DrillQuestion[]): Array<Partial<InterviewQuestion>> {
  return drills.map((d) => ({
    question: d.question,
    category: "项目深挖",
    company: "",
    role: "",
    difficulty: d.layer === 1 ? 2 : d.layer === 2 ? 3 : 4,
    answer: "",
    better: d.hint,
    tags: [log.project, ...log.skills].filter(Boolean),
    source: `日报 ${log.date}`,
    mastery: 0 as MasteryLevel,
  }))
}
