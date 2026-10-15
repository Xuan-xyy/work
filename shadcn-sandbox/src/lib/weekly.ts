import { channels, maxStage, type ChannelRow } from "./analytics"
import { STATUS } from "./constants"
import { addDays, daysOfWeek, weekLabel, weekRange } from "./format"
import type { Application, DB, Highlight, InternshipLog, Status } from "./types"

export type StageAdvance = {
  app: Application
  at: string
  to: Status
  note?: string
}

export type WeeklyReport = {
  start: string
  end: string
  label: string
  isCurrentWeek: boolean
  newApplications: Application[]
  advances: StageAdvance[]
  offers: Application[]
  rejections: Application[]
  interviewsNext: Application[]
  followNextWeek: Application[]
  channels: ChannelRow[]
  logs: InternshipLog[]
  highlights: Highlight[]
  dailyCounts: Array<{ date: string; count: number }>
  stats: {
    newCount: number
    advanceCount: number
    offerCount: number
    rejectCount: number
    interviewCount: number
    logCount: number
    highlightCount: number
    activeTotal: number
  }
  markdown: string
}

const STAGE_TYPES: Status[] = ["written", "interview", "offer", "rejected", "withdrawn"]

export function buildWeeklyReport(db: DB, weekStartISO?: string): WeeklyReport {
  const range = weekStartISO
    ? { start: weekStartISO, end: addDays(weekStartISO, 6) }
    : weekRange()
  const { start, end } = range
  const inWeek = (iso: string) => Boolean(iso) && iso >= start && iso <= end
  const apps = db.applications

  const newApplications = apps
    .filter((a) => inWeek(a.appliedAt))
    .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))

  const advances: StageAdvance[] = []
  for (const app of apps) {
    for (const e of app.timeline) {
      if (inWeek(e.at) && STAGE_TYPES.includes(e.type as Status)) {
        advances.push({ app, at: e.at, to: e.type as Status, note: e.note })
      }
    }
  }
  advances.sort((a, b) => a.at.localeCompare(b.at))

  const offers = advances.filter((a) => a.to === "offer").map((a) => a.app)
  const rejections = advances.filter((a) => a.to === "rejected").map((a) => a.app)

  const nextStart = addDays(end, 1)
  const nextEnd = addDays(end, 7)
  const interviewsNext = apps
    .filter((a) => a.nextAt && a.nextAt >= start && a.nextAt <= nextEnd)
    .filter((a) => a.status === "interview" || a.status === "written")
    .sort((a, b) => a.nextAt.localeCompare(b.nextAt))

  const followNextWeek = apps
    .filter((a) => a.nextAt && a.nextAt >= nextStart && a.nextAt <= nextEnd)
    .sort((a, b) => a.nextAt.localeCompare(b.nextAt))

  const logs = db.internship
    .filter((l) => inWeek(l.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  const highlights = db.highlights.filter((h) => inWeek(h.date))

  const dailyCounts = daysOfWeek(start).map((date) => ({
    date,
    count: apps.filter((a) => a.appliedAt === date).length,
  }))

  const label = weekLabel(start, end)
  const todayISOStr = new Date().toISOString().slice(0, 10)
  const isCurrentWeek = todayISOStr >= start && todayISOStr <= end

  const stats = {
    newCount: newApplications.length,
    advanceCount: advances.length,
    offerCount: offers.length,
    rejectCount: rejections.length,
    interviewCount: interviewsNext.length,
    logCount: logs.length,
    highlightCount: highlights.length,
    activeTotal: apps.filter((a) => !["rejected", "withdrawn"].includes(a.status)).length,
  }

  return {
    start,
    end,
    label,
    isCurrentWeek,
    newApplications,
    advances,
    offers,
    rejections,
    interviewsNext,
    followNextWeek,
    channels: channels(newApplications),
    logs,
    highlights,
    dailyCounts,
    stats,
    markdown: toMarkdown({
      label,
      start,
      end,
      newApplications,
      advances,
      offers,
      rejections,
      interviewsNext,
      followNextWeek,
      logs,
      highlights,
      stats,
    }),
  }
}

function toMarkdown(r: {
  label: string
  start: string
  end: string
  newApplications: Application[]
  advances: StageAdvance[]
  offers: Application[]
  rejections: Application[]
  interviewsNext: Application[]
  followNextWeek: Application[]
  logs: InternshipLog[]
  highlights: Highlight[]
  stats: WeeklyReport["stats"]
}): string {
  const L: string[] = []
  L.push(`# 秋招投递周报 · ${r.label}`)
  L.push("")
  L.push(
    `统计区间：${r.start} ~ ${r.end}｜本周新增 ${r.stats.newCount} 家｜阶段推进 ${r.stats.advanceCount} 次｜Offer ${r.stats.offerCount} 个`,
  )
  L.push("")

  L.push("## 一、本周新增投递")
  if (!r.newApplications.length) L.push("- 无")
  else {
    for (const a of r.newApplications) {
      L.push(`- ${a.company} · ${a.role}${a.city ? `（${a.city}）` : ""}｜${a.channel || "未标注"}｜当前：${STATUS[a.status].label}`)
    }
  }
  L.push("")

  L.push("## 二、阶段推进")
  if (!r.advances.length) L.push("- 无")
  else {
    for (const v of r.advances) {
      L.push(`- ${v.at}　${v.app.company} → ${STATUS[v.to].label}${v.note ? `（${v.note}）` : ""}`)
    }
  }
  L.push("")

  L.push("## 三、结果")
  L.push(`- 新增 Offer：${r.offers.length ? r.offers.map((a) => a.company).join("、") : "无"}`)
  L.push(`- 流程结束：${r.rejections.length ? r.rejections.map((a) => a.company).join("、") : "无"}`)
  L.push("")

  L.push("## 四、下周待办")
  if (!r.interviewsNext.length && !r.followNextWeek.length) L.push("- 暂无安排")
  else {
    for (const a of r.interviewsNext) {
      L.push(`- ${a.nextAt}　${a.company} · ${a.role}｜${a.status === "written" ? "笔试" : "面试"}｜此前最深阶段：${STATUS[maxStage(a)].label}`)
    }
    for (const a of r.followNextWeek) {
      if (r.interviewsNext.some((i) => i.id === a.id)) continue
      L.push(`- ${a.nextAt}　跟进 ${a.company}（当前 ${STATUS[a.status].label}）`)
    }
  }
  L.push("")

  if (r.logs.length || r.highlights.length) {
    L.push("## 五、实习成长")
    for (const l of r.logs) {
      L.push(`- ${l.date}　${l.project}：${l.did}${l.metric ? `｜成果：${l.metric}` : ""}`)
    }
    if (r.highlights.length) {
      L.push("")
      L.push(`本周沉淀亮点 ${r.highlights.length} 条：`)
      for (const h of r.highlights) L.push(`- ${h.title}`)
    }
    L.push("")
  }

  return L.join("\n")
}
