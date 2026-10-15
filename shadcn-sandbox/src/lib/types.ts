/** 领域模型：与旧版零构建工作台共用同一份数据结构，保证数据可迁移。 */

export type Status =
  | "wishlist"
  | "applied"
  | "written"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"

export type Priority = "high" | "mid" | "low"

export type TimelineEvent = {
  id: string
  at: string
  type: EventType
  note?: string
}

export type EventType =
  | "created"
  | "applied"
  | "written"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "note"

export type Application = {
  id: string
  company: string
  role: string
  city: string
  channel: string
  salary: string
  status: Status
  priority: Priority
  appliedAt: string
  nextAt: string
  jdLink: string
  notes: string
  tags: string[]
  timeline: TimelineEvent[]
  updatedAt: string
}

/** 实习日报：一块一条，可回溯、可提炼成简历亮点。 */
export type InternshipLog = {
  id: string
  date: string
  project: string
  did: string
  problem: string
  solution: string
  metric: string
  skills: string[]
  mood: 1 | 2 | 3 | 4 | 5
  createdAt: string
}

/** 由日报提炼出的简历亮点（STAR 结构）。 */
export type Highlight = {
  id: string
  logId: string
  date: string
  title: string
  situation: string
  task: string
  action: string
  result: string
  score: number
  used: boolean
  createdAt: string
}

export type Profile = {
  name: string
  target: string
  school: string
  gradYear: string
}

/** Offer 决策对比：每个维度 1–5 分，权重全局共享。 */
export type OfferDimensionId =
  | "salary"
  | "growth"
  | "team"
  | "city"
  | "stability"
  | "interest"

export type OfferDimension = {
  id: OfferDimensionId
  label: string
  hint: string
}

export type DB = {
  version: number
  profile: Profile
  applications: Application[]
  internship: InternshipLog[]
  highlights: Highlight[]
  offerScores: Record<string, Partial<Record<OfferDimensionId, number>>>
  offerWeights: Record<OfferDimensionId, number>
  theme: ThemeMode
  /** 首次运行自动载入的演示数据，尚未被用户接管。 */
  seededDemo: boolean
  /** 当前正在投的那份 JD，粘一次就一直留着，用来做素材匹配。 */
  targetJd: string
  /** 简历草稿里已选素材的 id，顺序即简历上的顺序。 */
  draftPicks: string[]
  questions: InterviewQuestion[]
  rounds: InterviewRound[]
  skills: Skill[]
  goals: GoalItem[]
}

export type ThemeMode = "light" | "dark" | "auto"

/* ---------------------------- 面试训练 ---------------------------- */

/** 0 没准备 / 1 看过面经 / 2 能说清楚 / 3 经得住追问 */
export type MasteryLevel = 0 | 1 | 2 | 3

export type InterviewQuestion = {
  id: string
  question: string
  category: string
  company: string
  role: string
  /** 1–5，越大越难 */
  difficulty: number
  /** 我现在的答法 */
  answer: string
  /** 更好的答法 / 参考要点 */
  better: string
  tags: string[]
  source: string
  mastery: MasteryLevel
  /** 下次复习日期，随掌握度自动推后 */
  reviewAt: string
  reviewCount: number
  createdAt: string
  updatedAt: string
}

export type InterviewRound = {
  id: string
  company: string
  role: string
  round: string
  date: string
  format: string
  duration: number
  /** 问了什么，一行一题 */
  questions: string
  /** 自评 1–5 */
  selfRating: number
  wentWell: string
  wentWrong: string
  nextTime: string
  result: string
  createdAt: string
}

/* ---------------------------- 职业成长 ---------------------------- */

export type Skill = {
  id: string
  name: string
  category: string
  /** 当前自评 1–5 */
  level: number
  /** 目标 1–5 */
  target: number
  updatedAt: string
}

export type GoalHorizon = "3m" | "1y" | "3y"

/** 目标可以挂一个数据指标，进度就自动算，不用手动拖。 */
export type AutoMetric =
  | ""
  | "applications"
  | "submitted"
  | "interviews"
  | "offers"
  | "logs"
  | "highlights"
  | "questions"

export type GoalItem = {
  id: string
  title: string
  horizon: GoalHorizon
  detail: string
  /** 手动进度 0–100，挂了 autoMetric 时忽略 */
  progress: number
  done: boolean
  dueAt: string
  autoMetric: AutoMetric
  /** autoMetric 的目标值 */
  autoTarget: number
  createdAt: string
}
