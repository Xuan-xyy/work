import { STATUS, STATUS_ORDER } from "./constants"
import { addDays, daysFromToday, diffDays, pct, todayISO } from "./format"
import type { Application, Status } from "./types"

/** 漏斗深度：扫 timeline，取简历实际到达过的最远阶段（被拒也计入深度）。 */
const DEPTH: Status[] = ["wishlist", "applied", "written", "interview", "offer"]

export function maxStage(app: Application): Status {
  let idx = DEPTH.indexOf(app.status)
  if (idx < 0) idx = 0
  for (const e of app.timeline) {
    const t = e.type as Status
    const i = DEPTH.indexOf(t)
    if (i > idx) idx = i
  }
  return DEPTH[idx]
}

export function isActive(app: Application): boolean {
  return !["rejected", "withdrawn"].includes(app.status)
}

export type Summary = {
  total: number
  /** 真正投出去的（有投递日期或已推进过），不含仅「想投」的。 */
  submitted: number
  active: number
  interviews: number
  offers: number
  rejected: number
  responseRate: number
  interviewRate: number
  offerRate: number
  thisWeek: number
}

/** 是否已经投出去了：有投递日期，或阶段已推进过。 */
export function isSubmitted(app: Application): boolean {
  return Boolean(app.appliedAt) || DEPTH.indexOf(maxStage(app)) >= 1
}

export function summary(apps: Application[]): Summary {
  const total = apps.length
  const submitted = apps.filter(isSubmitted).length
  const offers = apps.filter((a) => a.status === "offer" || a.timeline.some((t) => t.type === "offer")).length
  const interviewed = apps.filter((a) => DEPTH.indexOf(maxStage(a)) >= 3).length
  const responded = apps.filter((a) => DEPTH.indexOf(maxStage(a)) >= 2).length
  return {
    total,
    submitted,
    active: apps.filter(isActive).length,
    interviews: apps.filter((a) => a.status === "interview").length,
    offers,
    rejected: apps.filter((a) => a.status === "rejected").length,
    responseRate: pct(responded, submitted),
    interviewRate: pct(interviewed, submitted),
    offerRate: pct(offers, submitted),
    thisWeek: weekCount(apps),
  }
}

export type FunnelRow = { status: Status; label: string; count: number; rate: number }

/** 漏斗从「已投递」起算：还没投出去的「想投」不构成漏斗的第一层。 */
const FUNNEL_STAGES: Status[] = ["applied", "written", "interview", "offer"]

export function funnel(apps: Application[]): FunnelRow[] {
  const submitted = apps.filter(isSubmitted)
  return FUNNEL_STAGES.map((status) => {
    const idx = DEPTH.indexOf(status)
    const count = submitted.filter((a) => DEPTH.indexOf(maxStage(a)) >= idx).length
    return { status, label: STATUS[status].label, count, rate: pct(count, submitted.length) }
  })
}

/** 需要跟进的：有 nextAt、未终结、且在 1 天内到期或已逾期。 */
export function followUps(apps: Application[]): Application[] {
  return apps
    .filter((a) => a.nextAt && isActive(a) && daysFromToday(a.nextAt) <= 1)
    .sort((a, b) => a.nextAt.localeCompare(b.nextAt))
}

export function upcoming(apps: Application[], days = 7): Application[] {
  return apps
    .filter((a) => a.nextAt && isActive(a))
    .filter((a) => {
      const d = daysFromToday(a.nextAt)
      return d >= 0 && d <= days
    })
    .sort((a, b) => a.nextAt.localeCompare(b.nextAt))
}

export type ChannelRow = { channel: string; total: number; interviews: number; offers: number; rate: number }

export function channels(apps: Application[]): ChannelRow[] {
  const map = new Map<string, ChannelRow>()
  for (const a of apps) {
    const key = a.channel || "未标注"
    const row = map.get(key) ?? { channel: key, total: 0, interviews: 0, offers: 0, rate: 0 }
    row.total++
    if (DEPTH.indexOf(maxStage(a)) >= 3) row.interviews++
    if (a.status === "offer") row.offers++
    map.set(key, row)
  }
  return [...map.values()]
    .map((r) => ({ ...r, rate: pct(r.interviews, r.total) }))
    .sort((a, b) => b.total - a.total)
}

/** 近 N 天每天的新增投递量。 */
export function trend(apps: Application[], days = 30): Array<{ date: string; count: number }> {
  const today = todayISO()
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) buckets.set(addDays(today, -i), 0)
  for (const a of apps) {
    if (a.appliedAt && buckets.has(a.appliedAt)) {
      buckets.set(a.appliedAt, (buckets.get(a.appliedAt) ?? 0) + 1)
    }
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }))
}

/** 本周（周一起）新增投递数。 */
export function weekCount(apps: Application[]): number {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = day === 0 ? 6 : day - 1
  const monday = addDays(todayISO(), -mondayOffset)
  return apps.filter((a) => a.appliedAt && a.appliedAt >= monday).length
}

/** 近 7 天每天的投递量，用于「本周节奏」环形图。 */
export function weekRhythm(apps: Application[]): Array<{ date: string; count: number }> {
  const today = todayISO()
  const day = new Date().getDay()
  const mondayOffset = day === 0 ? 6 : day - 1
  const monday = addDays(today, -mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    return { date, count: apps.filter((a) => a.appliedAt === date).length }
  })
}

/** 距最早一次投递的天数，用于「冲刺第 N 天」。 */
export function sprintDay(apps: Application[]): number {
  const dates = apps.map((a) => a.appliedAt).filter(Boolean).sort()
  if (!dates.length) return 0
  return Math.max(1, diffDays(todayISO(), dates[0]) + 1)
}

export type Insight = { tone: "warn" | "good" | "info"; text: string }

/** 纯本地规则洞察，不发网络请求。 */
export function insights(apps: Application[]): Insight[] {
  const out: Insight[] = []
  if (!apps.length) return [{ tone: "info", text: "还没有记录，先导入或添加第一条投递。" }]

  const s = summary(apps)
  const overdue = apps.filter((a) => a.nextAt && isActive(a) && daysFromToday(a.nextAt) < 0)

  if (overdue.length) {
    out.push({ tone: "warn", text: `${overdue.length} 条跟进已逾期，建议今天就处理（最先：${overdue[0].company}）。` })
  }
  if (s.thisWeek === 0) {
    out.push({ tone: "warn", text: "本周还没有新增投递，秋招节奏别断，今天至少投 3 家。" })
  } else if (s.thisWeek >= 5) {
    out.push({ tone: "good", text: `本周已投 ${s.thisWeek} 家，节奏保持得不错。` })
  }
  const stuck = apps.filter((a) => a.status === "interview" && a.appliedAt && diffDays(todayISO(), a.appliedAt) > 21)
  if (stuck.length) {
    out.push({ tone: "info", text: `${stuck.length} 条面试流程超过 3 周没动静，可以礼貌催一下 HR。` })
  }
  if (s.total >= 10 && s.interviewRate < 20) {
    out.push({ tone: "warn", text: `面试转化率仅 ${s.interviewRate}%，简历或投递渠道可能有问题，建议复盘关键词。` })
  }
  if (s.offers > 0) {
    out.push({ tone: "good", text: `已拿到 ${s.offers} 个 offer，记得去「Offer 决策对比」用加权评分做决定。` })
  }
  const noNext = apps.filter((a) => isActive(a) && !a.nextAt)
  if (noNext.length >= 3) {
    out.push({ tone: "info", text: `${noNext.length} 条进行中的记录没设下一步时间，容易漏跟进。` })
  }
  return out.slice(0, 4)
}

export const DEPTH_ORDER = DEPTH
export { STATUS_ORDER }
