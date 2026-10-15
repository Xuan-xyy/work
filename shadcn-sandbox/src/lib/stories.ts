import { SKILL_PRESETS } from "./constants"
import { resumeBullet } from "./highlights"
import type { Highlight, InternshipLog, Profile } from "./types"

/* --------------------------- JD 关键词抽取 --------------------------- */

const STOPWORDS = new Set([
  "岗位", "职责", "要求", "任职", "我们", "你们", "以及", "具备", "熟悉", "掌握", "了解",
  "能够", "负责", "参与", "相关", "以上", "优先", "能力", "经验", "工作", "团队", "公司",
  "业务", "项目", "技术", "工程师", "开发", "招聘", "简历", "职位", "描述", "加分项",
  "and", "the", "for", "with", "you", "our", "are", "will", "have", "has", "that", "this",
  "from", "your", "work", "team", "job", "role", "must", "plus", "etc",
])

/** 已知技术词，命中时权重更高，避免被「沟通」「推进」这类软词淹没。 */
const TECH_HINTS = new Set(
  [
    ...SKILL_PRESETS,
    "分布式", "微服务", "高并发", "缓存", "消息队列", "数据库", "索引", "事务", "并发",
    "性能优化", "架构", "中间件", "容器", "云原生", "机器学习", "深度学习", "推荐", "搜索",
    "后端", "前端", "全栈", "测试", "运维", "安全", "监控", "重构", "算法", "数据结构",
    "react", "vue", "typescript", "javascript", "node", "java", "python", "golang", "go",
    "c++", "rust", "sql", "mysql", "redis", "kafka", "docker", "kubernetes", "k8s",
    "spring", "grpc", "http", "tcp", "linux", "git", "spark", "flink", "hadoop",
  ].map((s) => s.toLowerCase()),
)

/**
 * 中文技术/业务词表。
 * 中文没有空格，按标点切出来的是一整句而不是词——所以直接扫词表，信噪比最高。
 */
const CN_TECH = [
  "分布式", "微服务", "高并发", "高可用", "高性能", "性能优化", "缓存", "索引", "事务",
  "并发", "多线程", "线程池", "消息队列", "中间件", "数据库", "分库分表", "读写分离",
  "数据结构", "算法", "架构", "设计模式", "容器化", "云原生", "监控", "日志", "链路追踪",
  "压测", "重构", "自动化", "持续集成", "单元测试", "代码评审", "需求评审", "技术方案",
  "线上问题", "故障排查", "复盘", "埋点", "数据分析", "数据仓库", "数据看板", "机器学习",
  "推荐系统", "搜索引擎", "网络编程", "操作系统", "内存模型", "垃圾回收", "序列化",
  "负载均衡", "限流", "熔断", "降级", "幂等", "服务治理", "团队协作", "沟通能力", "跨部门",
  "代码质量", "工程化", "接口", "排查", "优化", "索引优化",
]

export type Keyword = { text: string; tech: boolean }

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * 从 JD 文本里抽关键词，按信噪比排序：
 * ① 词表里的技术词（直接在原文里扫）② 英文/技术 token ③ 2–6 字的中文短语。
 */
export function extractKeywords(jd: string, limit = 60): Keyword[] {
  const out: Keyword[] = []
  const seen = new Set<string>()
  const push = (text: string, tech: boolean) => {
    const key = text.toLowerCase()
    if (!text || seen.has(key)) return
    seen.add(key)
    out.push({ text, tech })
  }

  // ① 技术词表扫描
  for (const term of CN_TECH) if (jd.includes(term)) push(term, true)
  for (const term of TECH_HINTS) {
    if (term.length < 2) continue
    // 英文词要求词边界，避免 go 命中 google
    const re = /^[a-z0-9+#.]+$/i.test(term)
      ? new RegExp(`(^|[^A-Za-z0-9])${escapeRe(term)}([^A-Za-z0-9]|$)`, "i")
      : null
    if (re ? re.test(jd) : jd.includes(term)) push(term, true)
  }

  // ② 英文 token
  for (const m of jd.matchAll(/[A-Za-z][A-Za-z0-9+#._-]{1,20}/g)) {
    const t = m[0].replace(/[._-]+$/, "")
    if (t.length < 2 || STOPWORDS.has(t.toLowerCase())) continue
    push(t, TECH_HINTS.has(t.toLowerCase()))
  }

  // ③ 中文短语：切完之后剥掉列表序号和动词前缀，只留 2–6 字的实词短语
  const PREFIX = /^(了解|熟悉|掌握|具备|能够|负责|参与|使用|基于|针对|围绕|要求|优先|至少|具有|拥有|从事)+/
  for (const raw of jd.split(/[，。；：、,.;:!?！？\n\r\t（）()【】\[\]"'“”‘’/|]+/)) {
    let s = raw.replace(/^[\s\-•*\d.、)）]+/, "").replace(/[.。；;]+$/, "").trim()
    s = s.replace(PREFIX, "")
    if (s.length < 2 || s.length > 6) continue
    if (STOPWORDS.has(s) || /^\d+$/.test(s)) continue
    push(s, false)
  }

  // 技术词排前面——它们才决定匹配度
  return out.sort((a, b) => Number(b.tech) - Number(a.tech)).slice(0, limit)
}

/* ---------------------------- 匹配打分 ---------------------------- */

export type HighlightMatch = {
  highlight: Highlight
  score: number
  matched: string[]
}

function haystack(h: Highlight, skills: string): string {
  return [h.title, h.situation, h.task, h.action, h.result, skills].join(" ").toLowerCase()
}

/**
 * 用 JD 关键词给每条亮点打分。
 * 技术词命中权重 3，普通词 1；命中位置越靠前（标题/行动）额外加权。
 */
export function matchHighlights(
  highlights: Highlight[],
  logs: InternshipLog[],
  keywords: Keyword[],
): HighlightMatch[] {
  const skillById = new Map(logs.map((l) => [l.id, l.skills.join(" ")]))
  const rows = highlights.map((h) => {
    const skills = skillById.get(h.logId) ?? ""
    const hay = haystack(h, skills)
    const titleHay = h.title.toLowerCase()
    const matched: string[] = []
    let score = 0
    for (const k of keywords) {
      const t = k.text.toLowerCase()
      if (!hay.includes(t)) continue
      matched.push(k.text)
      score += k.tech ? 3 : 1
      if (titleHay.includes(t)) score += 1
    }
    return { highlight: h, score, matched }
  })
  return rows.sort((a, b) => b.score - a.score)
}

export function missingKeywords(keywords: Keyword[], matches: HighlightMatch[]): string[] {
  const covered = new Set<string>()
  for (const m of matches) for (const k of m.matched) covered.add(k.toLowerCase())
  return keywords.filter((k) => !covered.has(k.text.toLowerCase())).map((k) => k.text)
}

export function matchCoverage(keywords: Keyword[], matches: HighlightMatch[]): number {
  const techKeywords = keywords.filter((k) => k.tech)
  if (!techKeywords.length) return 0
  const covered = new Set<string>()
  for (const m of matches) for (const k of m.matched) covered.add(k.toLowerCase())
  const hit = techKeywords.filter((k) => covered.has(k.text.toLowerCase())).length
  return Math.round((hit / techKeywords.length) * 100)
}

/* --------------------------- 简历段落生成 --------------------------- */

export function buildResumeSection(
  highlights: Highlight[],
  profile: Profile,
  title = "项目经历",
): string {
  if (!highlights.length) return "还没有选择素材。"
  const L: string[] = []
  L.push(`# ${profile.name || "User"} · ${title}`)
  if (profile.target) L.push(`目标岗位：${profile.target}`)
  L.push("")

  // 按 project（存在 situation 里的项目名 + 日期）归组
  const groups = new Map<string, Highlight[]>()
  for (const h of highlights) {
    const project = h.situation.replace(/（.*?）\s*$/, "").trim() || "其他经历"
    const arr = groups.get(project) ?? []
    arr.push(h)
    groups.set(project, arr)
  }

  for (const [project, items] of groups) {
    L.push(`## ${project}`)
    // 时间跨度
    const dates = items.map((i) => i.date).filter(Boolean).sort()
    if (dates.length) L.push(`*${dates[0]} ~ ${dates[dates.length - 1]}*`)
    L.push("")
    for (const h of items) {
      L.push(`- ${resumeBullet(h)}`)
      if (h.action && !resumeBullet(h).includes(h.action.slice(0, 8))) {
        L.push(`  - 技术要点：${h.action}`)
      }
    }
    L.push("")
  }
  return L.join("\n")
}

/** 素材库健康度：多少条可以直接写进简历、多少条还缺数字。 */
export function libraryHealth(highlights: Highlight[]): {
  total: number
  withNumber: number
  used: number
  weak: Highlight[]
} {
  const withNumber = highlights.filter((h) => /\d/.test(h.result)).length
  return {
    total: highlights.length,
    withNumber,
    used: highlights.filter((h) => h.used).length,
    weak: highlights.filter((h) => !/\d/.test(h.result)),
  }
}
