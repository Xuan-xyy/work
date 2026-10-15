import { useSyncExternalStore } from "react"

import { DEFAULT_OFFER_WEIGHTS, STORAGE_KEY } from "./constants"
import { todayISO } from "./format"
import { nextReviewDate } from "./interview"
import {
  seedApplications,
  seedGoals,
  seedHighlights,
  seedInternship,
  seedQuestions,
  seedRounds,
  seedSkills,
} from "./seed"
import type {
  Application,
  DB,
  GoalItem,
  Highlight,
  InternshipLog,
  InterviewQuestion,
  InterviewRound,
  MasteryLevel,
  OfferDimensionId,
  Profile,
  Skill,
  ThemeMode,
} from "./types"

/** 演示用的目标 JD，让「JD 匹配」一打开就有东西可看。 */
const DEMO_JD = `岗位职责：
1. 负责核心业务系统的后端服务设计与开发，保障系统高可用；
2. 参与需求评审与技术方案设计，输出可维护的代码与文档；
3. 针对现有系统进行性能优化，提升接口响应速度；
4. 参与线上问题排查与复盘，沉淀最佳实践。

任职要求：
1. 熟悉 Java / Go 至少一门语言，理解 JVM 基本原理；
2. 熟悉 MySQL、Redis，了解索引优化与缓存设计；
3. 了解消息队列 Kafka / RocketMQ 的使用与常见问题；
4. 有高并发、分布式系统经验者优先；
5. 熟悉 Linux 常用命令，了解 Docker / Kubernetes；
6. 具备良好的沟通能力与团队协作意识，能主动推进事情落地。`

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** 容错归一化：旧版数据字段缺失/类型不符时补默认值，不让界面炸掉。 */
export function normalizeApp(raw: unknown): Application | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const company = String(r.company ?? "").trim()
  if (!company) return null
  const status = String(r.status ?? "wishlist")
  const known = ["wishlist", "applied", "written", "interview", "offer", "rejected", "withdrawn"]
  const timeline = Array.isArray(r.timeline)
    ? (r.timeline as Application["timeline"]).map((e) => ({
        id: String(e?.id ?? uid()),
        at: String(e?.at ?? ""),
        type: (e?.type ?? "note") as Application["timeline"][number]["type"],
        note: e?.note ? String(e.note) : undefined,
      }))
    : []
  return {
    id: String(r.id ?? uid()),
    company,
    role: String(r.role ?? ""),
    city: String(r.city ?? ""),
    channel: String(r.channel ?? ""),
    salary: String(r.salary ?? ""),
    status: (known.includes(status) ? status : "wishlist") as Application["status"],
    priority: (["high", "mid", "low"].includes(String(r.priority))
      ? String(r.priority)
      : "mid") as Application["priority"],
    appliedAt: String(r.appliedAt ?? ""),
    nextAt: String(r.nextAt ?? ""),
    jdLink: String(r.jdLink ?? ""),
    notes: String(r.notes ?? ""),
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : [],
    timeline,
    updatedAt: String(r.updatedAt ?? todayISO()),
  }
}

function emptyDB(): DB {
  return {
    version: 1,
    profile: { name: "User", target: "后端开发", school: "", gradYear: "" },
    applications: [],
    internship: [],
    highlights: [],
    offerScores: {},
    offerWeights: { ...DEFAULT_OFFER_WEIGHTS },
    theme: "light",
    seededDemo: false,
    targetJd: "",
    draftPicks: [],
    questions: [],
    rounds: [],
    skills: [],
    goals: [],
  }
}

export function demoDB(): DB {
  const base = emptyDB()
  const applications = seedApplications()
  const internship = seedInternship()
  // 演示数据里给两个 Offer 打好分，让「决策对比」一打开就有结论可看
  const offerScores: DB["offerScores"] = {}
  for (const a of applications.filter((x) => x.status === "offer")) {
    offerScores[a.id] =
      a.company === "字节跳动"
        ? { salary: 4, growth: 5, team: 4, city: 4, stability: 4, interest: 5 }
        : { salary: 5, growth: 4, team: 3, city: 3, stability: 5, interest: 3 }
  }
  const highlights = seedHighlights(internship)
  return {
    ...base,
    applications,
    internship,
    highlights,
    offerScores,
    questions: seedQuestions(),
    rounds: seedRounds(),
    skills: seedSkills(),
    goals: seedGoals(),
    seededDemo: true,
    targetJd: DEMO_JD,
    // 演示草稿：按「对后端岗的说服力」排序，取前三条
    draftPicks: highlights.slice(0, 3).map((h) => h.id),
  }
}

function load(): DB {
  const base = emptyDB()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // 首次打开：给一份演示数据，让用户先看清工作台长什么样（可一键清空）
    if (!raw) return demoDB()
    const parsed = JSON.parse(raw) as Partial<DB>
    const apps = Array.isArray(parsed.applications)
      ? (parsed.applications.map(normalizeApp).filter(Boolean) as Application[])
      : []
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      applications: apps,
      internship: Array.isArray(parsed.internship) ? parsed.internship : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      offerScores: parsed.offerScores ?? {},
      offerWeights: { ...DEFAULT_OFFER_WEIGHTS, ...(parsed.offerWeights ?? {}) },
      theme: (parsed.theme as ThemeMode) ?? "light",
      seededDemo: Boolean(parsed.seededDemo),
      targetJd: typeof parsed.targetJd === "string" ? parsed.targetJd : "",
      draftPicks: Array.isArray(parsed.draftPicks) ? parsed.draftPicks : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      version: 1,
    }
  } catch {
    return base
  }
}

let db: DB = load()
const listeners = new Set<() => void>()

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* 隐私模式或配额满：内存态仍可用 */
  }
}

function emit(): void {
  persist()
  listeners.forEach((l) => l())
}

function set(patch: Partial<DB>): void {
  db = { ...db, ...patch }
  emit()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): DB {
  return db
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// 与旧版零构建工作台共用同一 key：另一个标签页写入时同步刷新
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      db = load()
      listeners.forEach((l) => l())
    }
  })
}

export const actions = {
  /** 供非组件代码（导入向导等）同步读取当前快照。 */
  getApplications(): Application[] {
    return db.applications
  },
  replaceApplications(apps: Application[]) {
    set({ applications: apps })
  },
  addApplication(input: Partial<Application>) {
    const app = normalizeApp({ ...input, id: uid(), timeline: input.timeline ?? [] })
    if (!app) return null
    if (!app.timeline.length) {
      app.timeline = [{ id: uid(), at: app.appliedAt || todayISO(), type: "created" }]
    }
    set({ applications: [app, ...db.applications] })
    return app
  },
  updateApplication(id: string, patch: Partial<Application>) {
    set({
      applications: db.applications.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: todayISO() } : a,
      ),
    })
  },
  /** 推进阶段：写状态同时追加一条 timeline，保证漏斗能回溯到最远深度。 */
  advanceApplication(id: string, status: Application["status"], note?: string) {
    const app = db.applications.find((a) => a.id === id)
    if (!app) return
    const type =
      status === "offer"
        ? "offer"
        : status === "rejected"
          ? "rejected"
          : status === "withdrawn"
            ? "withdrawn"
            : status === "interview"
              ? "interview"
              : status === "written"
                ? "written"
                : "applied"
    set({
      applications: db.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              updatedAt: todayISO(),
              timeline: [...a.timeline, { id: uid(), at: todayISO(), type, note }],
            }
          : a,
      ),
    })
  },
  removeApplication(id: string) {
    set({ applications: db.applications.filter((a) => a.id !== id) })
  },
  addInternshipLog(input: Partial<InternshipLog>) {
    const log: InternshipLog = {
      id: uid(),
      date: input.date ?? todayISO(),
      project: input.project ?? "",
      did: input.did ?? "",
      problem: input.problem ?? "",
      solution: input.solution ?? "",
      metric: input.metric ?? "",
      skills: input.skills ?? [],
      mood: input.mood ?? 3,
      createdAt: todayISO(),
    }
    set({ internship: [log, ...db.internship] })
    return log
  },
  updateInternshipLog(id: string, patch: Partial<InternshipLog>) {
    set({ internship: db.internship.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  },
  removeInternshipLog(id: string) {
    set({
      internship: db.internship.filter((l) => l.id !== id),
      highlights: db.highlights.filter((h) => h.logId !== id),
    })
  },
  addHighlight(input: Partial<Highlight>) {
    const h: Highlight = {
      id: uid(),
      logId: input.logId ?? "",
      date: input.date ?? todayISO(),
      title: input.title ?? "",
      situation: input.situation ?? "",
      task: input.task ?? "",
      action: input.action ?? "",
      result: input.result ?? "",
      score: input.score ?? 0,
      used: false,
      createdAt: todayISO(),
    }
    set({ highlights: [h, ...db.highlights] })
    return h
  },
  updateHighlight(id: string, patch: Partial<Highlight>) {
    set({ highlights: db.highlights.map((h) => (h.id === id ? { ...h, ...patch } : h)) })
  },
  toggleHighlightUsed(id: string) {
    set({ highlights: db.highlights.map((h) => (h.id === id ? { ...h, used: !h.used } : h)) })
  },
  removeHighlight(id: string) {
    set({ highlights: db.highlights.filter((h) => h.id !== id) })
  },
  setOfferScore(appId: string, dim: OfferDimensionId, score: number) {
    const cur = db.offerScores[appId] ?? {}
    set({ offerScores: { ...db.offerScores, [appId]: { ...cur, [dim]: score } } })
  },
  setOfferWeight(dim: OfferDimensionId, weight: number) {
    set({ offerWeights: { ...db.offerWeights, [dim]: weight } })
  },

  setTargetJd(jd: string) {
    set({ targetJd: jd })
  },
  setDraftPicks(next: string[]) {
    set({ draftPicks: next })
  },

  /* ------------------------- 面试训练 ------------------------- */

  addQuestion(input: Partial<InterviewQuestion>) {
    const q: InterviewQuestion = {
      id: uid(),
      question: input.question ?? "",
      category: input.category ?? "其他",
      company: input.company ?? "",
      role: input.role ?? "",
      difficulty: input.difficulty ?? 3,
      answer: input.answer ?? "",
      better: input.better ?? "",
      tags: input.tags ?? [],
      source: input.source ?? "自录",
      mastery: (input.mastery ?? 0) as MasteryLevel,
      reviewAt: input.reviewAt ?? todayISO(),
      reviewCount: 0,
      createdAt: todayISO(),
      updatedAt: todayISO(),
    }
    set({ questions: [q, ...db.questions] })
    return q
  },
  /** 批量入库（复盘提取、日报深挖都走这里）。 */
  addQuestions(list: Array<Partial<InterviewQuestion>>): number {
    const created = list
      .filter((x) => (x.question ?? "").trim())
      .map((x) => ({
        id: uid(),
        question: x.question as string,
        category: x.category ?? "其他",
        company: x.company ?? "",
        role: x.role ?? "",
        difficulty: x.difficulty ?? 3,
        answer: x.answer ?? "",
        better: x.better ?? "",
        tags: x.tags ?? [],
        source: x.source ?? "自录",
        mastery: (x.mastery ?? 0) as MasteryLevel,
        reviewAt: todayISO(),
        reviewCount: 0,
        createdAt: todayISO(),
        updatedAt: todayISO(),
      }))
    set({ questions: [...created, ...db.questions] })
    return created.length
  },
  updateQuestion(id: string, patch: Partial<InterviewQuestion>) {
    set({
      questions: db.questions.map((q) =>
        q.id === id ? { ...q, ...patch, updatedAt: todayISO() } : q,
      ),
    })
  },
  removeQuestion(id: string) {
    set({ questions: db.questions.filter((q) => q.id !== id) })
  },
  /** 改掌握度时自动排下次复习：越熟间隔越长。 */
  setMastery(id: string, mastery: MasteryLevel) {
    set({
      questions: db.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              mastery,
              reviewAt: nextReviewDate(mastery),
              reviewCount: q.reviewCount + 1,
              updatedAt: todayISO(),
            }
          : q,
      ),
    })
  },
  addRound(input: Partial<InterviewRound>) {
    const r: InterviewRound = {
      id: uid(),
      company: input.company ?? "",
      role: input.role ?? "",
      round: input.round ?? "一面",
      date: input.date ?? todayISO(),
      format: input.format ?? "线上视频",
      duration: input.duration ?? 45,
      questions: input.questions ?? "",
      selfRating: input.selfRating ?? 3,
      wentWell: input.wentWell ?? "",
      wentWrong: input.wentWrong ?? "",
      nextTime: input.nextTime ?? "",
      result: input.result ?? "待定",
      createdAt: todayISO(),
    }
    set({ rounds: [r, ...db.rounds] })
    return r
  },
  updateRound(id: string, patch: Partial<InterviewRound>) {
    set({ rounds: db.rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  },
  removeRound(id: string) {
    set({ rounds: db.rounds.filter((r) => r.id !== id) })
  },

  /* ------------------------- 职业成长 ------------------------- */

  addSkill(input: Partial<Skill>) {
    const s: Skill = {
      id: uid(),
      name: input.name ?? "",
      category: input.category ?? "其他",
      level: input.level ?? 2,
      target: input.target ?? 4,
      updatedAt: todayISO(),
    }
    set({ skills: [...db.skills, s] })
    return s
  },
  updateSkill(id: string, patch: Partial<Skill>) {
    set({
      skills: db.skills.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: todayISO() } : s)),
    })
  },
  removeSkill(id: string) {
    set({ skills: db.skills.filter((s) => s.id !== id) })
  },
  addGoal(input: Partial<GoalItem>) {
    const g: GoalItem = {
      id: uid(),
      title: input.title ?? "",
      horizon: input.horizon ?? "3m",
      detail: input.detail ?? "",
      progress: input.progress ?? 0,
      done: input.done ?? false,
      dueAt: input.dueAt ?? "",
      autoMetric: input.autoMetric ?? "",
      autoTarget: input.autoTarget ?? 0,
      createdAt: todayISO(),
    }
    set({ goals: [...db.goals, g] })
    return g
  },
  updateGoal(id: string, patch: Partial<GoalItem>) {
    set({ goals: db.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })
  },
  removeGoal(id: string) {
    set({ goals: db.goals.filter((g) => g.id !== id) })
  },
  toggleGoalDone(id: string) {
    set({ goals: db.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) })
  },
  setProfile(patch: Partial<Profile>) {
    set({ profile: { ...db.profile, ...patch } })
  },
  setTheme(theme: ThemeMode) {
    set({ theme })
  },
  loadDemo() {
    set(demoDB())
  },
  /** 保留演示数据继续用（只是不再显示横幅）。 */
  dismissDemo() {
    set({ seededDemo: false })
  },
  clearAll() {
    set({ ...emptyDB(), theme: db.theme, profile: db.profile, seededDemo: false })
  },
  importJSON(text: string): { ok: boolean; message: string } {
    try {
      const parsed = JSON.parse(text) as Partial<DB>
      const apps = Array.isArray(parsed.applications)
        ? (parsed.applications.map(normalizeApp).filter(Boolean) as Application[])
        : []
      set({
        applications: apps,
        internship: Array.isArray(parsed.internship) ? parsed.internship : db.internship,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : db.highlights,
        questions: Array.isArray(parsed.questions) ? parsed.questions : db.questions,
        rounds: Array.isArray(parsed.rounds) ? parsed.rounds : db.rounds,
        skills: Array.isArray(parsed.skills) ? parsed.skills : db.skills,
        goals: Array.isArray(parsed.goals) ? parsed.goals : db.goals,
        profile: { ...db.profile, ...(parsed.profile ?? {}) },
      })
      return { ok: true, message: `已恢复 ${apps.length} 条投递记录` }
    } catch {
      return { ok: false, message: "文件不是合法的 JSON 备份" }
    }
  },
  exportJSON(): string {
    return JSON.stringify(db, null, 2)
  },
}
