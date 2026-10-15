/* 由 scripts/kit-preview.cjs 打包后在 Node 里执行；产物写到 dist-kit/。 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { buildInterviewKit, kitFileName, kitProjects } from "@/lib/interviewKit"
import { demoDB } from "@/lib/store"

const OUT = path.join(process.cwd(), "dist-kit")
mkdirSync(OUT, { recursive: true })

const db = demoDB()
const today = "2026-10-15"
const md = buildInterviewKit(db, { today })
const projects = kitProjects(db)

writeFileSync(path.join(OUT, kitFileName(db, today)), md, "utf8")
writeFileSync(
  path.join(OUT, "kit-report.txt"),
  [
    `项目数 ${projects.length}（来自 ${db.internship.length} 条日报 / ${db.questions.length} 道题 / ${db.rounds.length} 次复盘）`,
    ...projects.map((p) => `  - ${p.project}：${p.dates.length} 条日报 / ${p.drills.length} 道追问`),
    `文件名 ${kitFileName(db, today)}`,
    `长度 ${md.length} 字符 / ${md.split("\n").length} 行`,
  ].join("\n"),
  "utf8",
)

/* 控制台只输出 ASCII —— Windows 终端的编码会把中文输出弄乱，正文看文件更可靠 */
console.log(`kit written to dist-kit/ (${md.length} chars, ${projects.length} projects)`)
