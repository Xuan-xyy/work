import type { Highlight, InternshipLog } from "./types"

export type LogScore = {
  score: number
  reasons: Array<{ ok: boolean; text: string }>
}

/**
 * 日报质量评分：判断这条日报能不能直接变成简历亮点。
 * 核心是「有没有可量化结果」——没有数字的日报，写进简历也没人信。
 */
export function scoreLog(log: InternshipLog): LogScore {
  const reasons: LogScore["reasons"] = []
  let score = 0

  const hasNumber = /\d/.test(log.metric)
  if (hasNumber) {
    score += 40
    reasons.push({ ok: true, text: "有可量化结果（简历里最值钱的部分）" })
  } else if (log.metric.trim()) {
    score += 18
    reasons.push({ ok: false, text: "写了成果但缺数字，补上百分比/耗时/数量会强很多" })
  } else {
    reasons.push({ ok: false, text: "没写结果，简历上这条只能算「做过」" })
  }

  if (log.problem.trim().length >= 8) {
    score += 15
    reasons.push({ ok: true, text: "写清了问题，面试官能听懂难点在哪" })
  } else {
    reasons.push({ ok: false, text: "建议补一句「当时卡在哪」，这就是 STAR 里的 T" })
  }

  if (log.solution.trim().length >= 15) {
    score += 20
    reasons.push({ ok: true, text: "有具体做法，能撑起 STAR 的 A" })
  } else {
    reasons.push({ ok: false, text: "做法太简略，写清「怎么解决的」" })
  }

  if (log.did.trim().length >= 25) {
    score += 15
    reasons.push({ ok: true, text: "事情描述足够具体" })
  } else {
    reasons.push({ ok: false, text: "「今天做了什么」可以再具体一点" })
  }

  if (log.skills.length >= 2) {
    score += 10
    reasons.push({ ok: true, text: `覆盖 ${log.skills.length} 项技能，便于按岗位检索` })
  } else if (log.skills.length === 1) {
    score += 4
    reasons.push({ ok: false, text: "只标了 1 项技能，多标几项以后好检索" })
  } else {
    reasons.push({ ok: false, text: "没标技能，后续想按技能找素材会很难" })
  }

  return { score: Math.min(100, score), reasons }
}

export type StarDraft = {
  title: string
  situation: string
  task: string
  action: string
  result: string
  score: number
  reasons: LogScore["reasons"]
}

function firstSentence(s: string, max = 60): string {
  const t = s.trim()
  if (!t) return ""
  const cut = t.split(/[。；;\n]/)[0]
  const head = cut.length > max ? cut.slice(0, max) + "…" : cut
  return head
}

/** 由一条日报生成 STAR 草稿，全部字段都可编辑后再入库。 */
export function draftFromLog(log: InternshipLog): StarDraft {
  const { score, reasons } = scoreLog(log)
  const title = [log.project, firstSentence(log.did, 30)].filter(Boolean).join(" · ") || "未命名亮点"
  return {
    title,
    situation: log.project ? `${log.project}（${log.date}）` : log.date,
    task: log.problem.trim() || firstSentence(log.did, 70),
    action: log.solution.trim() || log.did.trim(),
    result: log.metric.trim() || "待补充：补一个可量化结果（耗时/占比/数量/准确率）",
    score,
    reasons,
  }
}

/** 简历里可以直贴的一句话（动词开头 + 结果）。 */
export function resumeBullet(h: Highlight): string {
  const action = h.action.trim().replace(/[。.]$/, "")
  const result = h.result.trim().replace(/[。.]$/, "")
  if (action && result) return `${action}，${result}。`
  return `${action || result}。`
}

/**
 * 给一条已成型的 STAR 素材打分（与日报评分同量纲 0–100）。
 * 必须按素材本身算——素材被改过之后，日报的分数就不再代表它了。
 */
export function scoreHighlight(
  h: Pick<Highlight, "situation" | "task" | "action" | "result">,
): number {
  const action = h.action.trim()
  let s = 0
  if (/\d/.test(h.result)) s += 40
  if (h.task.trim().length >= 8) s += 15
  if (action.length >= 25) s += 20
  if (action.length >= 40) s += 15
  if (h.situation.trim().length >= 6) s += 10
  return Math.min(100, s)
}

/** 按技能筛选素材：面试前按 JD 关键词捞亮点。 */
export function filterHighlights(
  highlights: Highlight[],
  logs: InternshipLog[],
  keyword: string,
): Highlight[] {
  const k = keyword.trim().toLowerCase()
  if (!k) return highlights
  const skillById = new Map(logs.map((l) => [l.id, l.skills.join(" ").toLowerCase()]))
  return highlights.filter((h) => {
    const hay = [h.title, h.situation, h.task, h.action, h.result, skillById.get(h.logId) ?? ""]
      .join(" ")
      .toLowerCase()
    return hay.includes(k)
  })
}

export function topSkills(logs: InternshipLog[], limit = 8): Array<{ skill: string; count: number }> {
  const map = new Map<string, number>()
  for (const l of logs) for (const s of l.skills) map.set(s, (map.get(s) ?? 0) + 1)
  return [...map.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
