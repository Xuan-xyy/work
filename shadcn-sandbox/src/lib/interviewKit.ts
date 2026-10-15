import { MASTERY_LEVELS } from "./constants"
import { fmtMd, todayISO } from "./format"
import { drillFromLog, drillLayerLabel, dueQuestions, masteryStats, type DrillLayer, type DrillQuestion } from "./interview"
import type { DB, InternshipLog } from "./types"

/* ------------------------------------------------------------------
   面试准备清单：把「项目深挖」的三层追问从 App 里拿出来，
   变成一份可以打印、可以拷进备忘录、可以带去面试现场的 Markdown。

   两件事值得说明：
   ① 按「项目」聚合，而不是按日报。同一个项目往往写了好几条日报，
      逐条展开会得到几张内容重复的卡片（追问模板是同一套），看着像 bug。
   ② 追问在同一项目内去重。三层追问里有几条是固定模板（「你负责哪一部分」
      「规模涨 10 倍」），多条日报必然撞车，只留一条。

   生成是纯函数（只读 DB），预览、复制、导出读的是同一次结果，
   不会出现「预览和导出不一致」。
   ------------------------------------------------------------------ */

const LAYERS: DrillLayer[] = [1, 2, 3]

export type KitProject = {
  project: string
  /** 该项目所有日报的日期，倒序 */
  dates: string[]
  skills: string[]
  did: string[]
  problem: string[]
  solution: string[]
  metric: string[]
  drills: DrillQuestion[]
}

function uniq(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))]
}

/** 归一化后比较，避免只差标点的同一道题被算成两道。 */
function normQuestion(s: string): string {
  return s.replace(/[\s，。？?！!、.：:「」【】（）()]/g, "").toLowerCase()
}

/** 按项目聚合日报，并把三层追问去重。 */
export function kitProjects(db: DB): KitProject[] {
  const logs = [...db.internship].sort((a, b) => b.date.localeCompare(a.date))
  const order: string[] = []
  const byProject = new Map<string, InternshipLog[]>()
  for (const log of logs) {
    const key = log.project.trim() || "未命名项目"
    if (!byProject.has(key)) {
      byProject.set(key, [])
      order.push(key)
    }
    byProject.get(key)!.push(log)
  }

  return order.map((project) => {
    const group = byProject.get(project)!
    const seen = new Set<string>()
    const drills: DrillQuestion[] = []
    for (const log of group) {
      for (const d of drillFromLog(log)) {
        const k = normQuestion(d.question)
        if (seen.has(k)) continue
        seen.add(k)
        drills.push(d)
      }
    }
    return {
      project,
      dates: group.map((l) => l.date).sort((a, b) => b.localeCompare(a)),
      skills: uniq(group.flatMap((l) => l.skills)),
      did: uniq(group.map((l) => l.did)),
      problem: uniq(group.map((l) => l.problem)),
      solution: uniq(group.map((l) => l.solution)),
      metric: uniq(group.map((l) => l.metric)),
      drills,
    }
  })
}

function bullets(label: string, items: string[], out: string[]): void {
  if (!items.length) return
  out.push(`**${label}**`)
  for (const it of items) out.push(`- ${it}`)
  out.push("")
}

export function buildInterviewKit(db: DB, opts: { today?: string } = {}): string {
  const today = opts.today ?? todayISO()
  const projects = kitProjects(db)
  const logs = db.internship
  const stats = masteryStats(db.questions, today)
  const due = dueQuestions(db.questions, today)

  /* 只保留「挂了」或「写了没答好」的复盘 —— 顺利的面经没有复习价值 */
  const pitfalls = db.rounds
    .filter((r) => r.result === "挂" || r.wentWrong.trim() !== "")
    .sort((a, b) => b.date.localeCompare(a.date))

  /* 反问环节单独拎出来：这部分最容易临场大脑空白 */
  const toAsk = db.questions.filter((q) => q.category === "反问环节")

  const out: string[] = []
  const target = db.profile.target.trim()
  const who = db.profile.name.trim() || "我"

  out.push(`# 面试准备清单${target ? ` · ${target}` : ""}`)
  out.push("")
  out.push(
    `> 生成于 ${fmtMd(today)} ｜ ${projects.length} 个项目（${logs.length} 条日报） · ${db.questions.length} 道题 · ${db.rounds.length} 次面试复盘`,
  )
  out.push("")
  out.push(
    `**准备度 ${stats.readiness}%**（按掌握度加权） · 待复习 **${due.length}** 题 · 经得住追问 **${stats.byLevel[3]}** 题 · 完全没准备 **${stats.byLevel[0]}** 题`,
  )
  out.push("")
  out.push("**怎么用**：面试前 30 分钟只读第一部分的三层追问；出门前扫一眼第二部分「踩过的坑」。")
  out.push("")
  out.push("---")
  out.push("")

  /* ------------------------- 一、三层追问 ------------------------- */
  out.push("## 一、项目深挖：三层追问")
  out.push("")
  if (projects.length === 0) {
    out.push("_还没有实习日报。去「实习成长」记一条带卡点和结果的日报，这里就会长出追问。_")
    out.push("")
  }

  projects.forEach((p, pi) => {
    out.push(`### ${pi + 1}. ${p.project}`)
    out.push("")
    const span =
      p.dates.length > 1
        ? `${fmtMd(p.dates[p.dates.length - 1])} → ${fmtMd(p.dates[0])} · ${p.dates.length} 条日报`
        : fmtMd(p.dates[0] ?? today)
    out.push(`\`${span}\`${p.skills.length ? ` · ${p.skills.join(" / ")}` : ""}`)
    out.push("")
    bullets("做了什么", p.did, out)
    bullets("卡在哪", p.problem, out)
    bullets("怎么解的", p.solution, out)
    bullets("结果", p.metric, out)

    for (const layer of LAYERS) {
      const group = p.drills.filter((d) => d.layer === layer)
      if (!group.length) continue
      out.push(`#### 第 ${layer} 层 · ${drillLayerLabel(layer)}`)
      out.push("")
      for (const d of group) {
        out.push(`- [ ] ${d.question}`)
        out.push(`  - 考什么：${d.hint}`)
        out.push("  - 我的答案：")
      }
      out.push("")
    }
  })
  out.push("---")
  out.push("")

  /* ------------------------- 二、踩过的坑 ------------------------- */
  out.push("## 二、复盘里踩过的坑（别再踩）")
  out.push("")
  if (pitfalls.length === 0) {
    out.push("_还没有记录不顺的复盘。挂掉的那场最值得写，别只记成功的。_")
    out.push("")
  }
  for (const r of pitfalls) {
    const where = [r.company, r.round].filter(Boolean).join(" · ")
    const tail = r.result ? ` · ${r.result}` : ""
    out.push(`- **${where || "未命名"}**（${fmtMd(r.date)}${tail}）`)
    if (r.wentWrong.trim()) out.push(`  - 没答好：${r.wentWrong.trim()}`)
    if (r.nextTime.trim()) out.push(`  - 下次改：${r.nextTime.trim()}`)
    if (r.wentWell.trim()) out.push(`  - 还算行：${r.wentWell.trim()}`)
  }
  out.push("")
  out.push("---")
  out.push("")

  /* ------------------------- 三、待复习题目 ------------------------- */
  out.push(`## 三、待复习题目（${due.length} 题）`)
  out.push("")
  if (due.length === 0) {
    out.push("_今天没有到期的题。掌握度越高，复习间隔越长，这是故意的。_")
    out.push("")
  } else {
    const byCat = new Map<string, typeof due>()
    for (const q of due) {
      const k = q.category || "未分类"
      byCat.set(k, [...(byCat.get(k) ?? []), q])
    }
    for (const [cat, list] of byCat) {
      out.push(`### ${cat}`)
      out.push("")
      for (const q of list) {
        const bits = [MASTERY_LEVELS[q.mastery]?.label ?? "没准备"]
        if (q.company.trim()) bits.push(q.company.trim())
        if (q.reviewAt) bits.push(`到期 ${fmtMd(q.reviewAt)}`)
        out.push(`- [ ] ${q.question}`)
        out.push(`  - 状态：${bits.join(" · ")}`)
        if (q.better.trim()) out.push(`  - 要点：${q.better.trim()}`)
      }
      out.push("")
    }
  }
  out.push("---")
  out.push("")

  /* ------------------------- 四、技能证据速查 ------------------------- */
  out.push("## 四、技能证据速查")
  out.push("")
  out.push("面试官问「你熟悉 X 吗」，直接报下面的项目，比说「了解」有用得多。")
  out.push("")
  const bySkill = new Map<string, string[]>()
  for (const log of logs) {
    const project = log.project.trim() || "未命名项目"
    for (const s of log.skills) {
      const name = s.trim()
      if (!name) continue
      bySkill.set(name, [...(bySkill.get(name) ?? []), project])
    }
  }
  if (bySkill.size === 0) {
    out.push("_日报里还没打技能标签。_")
    out.push("")
  } else {
    out.push("| 技能 | 出现次数 | 可以举的项目 |")
    out.push("| --- | --- | --- |")
    for (const [skill, projectsWithSkill] of [...bySkill.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      out.push(`| ${skill} | ${projectsWithSkill.length} | ${uniq(projectsWithSkill).join(" / ")} |`)
    }
    out.push("")
  }

  /* 技能自评缺口：属于「职业成长」的数据，但对面试同样有用 */
  const gaps = db.skills
    .filter((s) => s.target > s.level)
    .sort((a, b) => b.target - b.level - (a.target - a.level))
  if (gaps.length) {
    out.push(
      "**还差得比较多的技能**：" +
        gaps
          .slice(0, 5)
          .map((s) => `${s.name}（${s.level}→${s.target}）`)
          .join("、"),
    )
    out.push("")
  }

  /* ------------------------- 五、反问环节 ------------------------- */
  if (toAsk.length) {
    out.push("---")
    out.push("")
    out.push(`## 五、反问环节（${toAsk.length} 题备着）`)
    out.push("")
    for (const q of toAsk) out.push(`- [ ] ${q.question}`)
    out.push("")
  }

  out.push("---")
  out.push("")
  out.push(`_由「秋招 × 实习成长工作台」生成 · ${who} · ${today}_`)
  out.push("")

  return out.join("\n")
}

/** 文件名里不能有路径分隔符和冒号。 */
export function kitFileName(db: DB, today = todayISO()): string {
  const target = db.profile.target.trim().replace(/[\\/:*?"<>|\s]+/g, "-") || "通用"
  return `面试准备清单-${target}-${today}.md`
}
