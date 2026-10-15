import { OFFER_DIMENSIONS } from "./constants"
import type { Application, OfferDimensionId } from "./types"

export type OfferRow = {
  app: Application
  scores: Partial<Record<OfferDimensionId, number>>
  /** 加权总分，0–100。未打分的维度不计入分母。 */
  total: number
  /** 已打分维度数 / 总维度数 */
  completeness: number
  rank: number
}

export function scoreOffers(
  apps: Application[],
  scores: Record<string, Partial<Record<OfferDimensionId, number>>>,
  weights: Record<OfferDimensionId, number>,
): OfferRow[] {
  const rows = apps.map((app) => {
    const s = scores[app.id] ?? {}
    let got = 0
    let max = 0
    let filled = 0
    for (const d of OFFER_DIMENSIONS) {
      const v = s[d.id]
      if (typeof v === "number" && v > 0) {
        got += v * weights[d.id]
        max += 5 * weights[d.id]
        filled++
      }
    }
    return {
      app,
      scores: s,
      total: max > 0 ? Math.round((got / max) * 100) : 0,
      completeness: Math.round((filled / OFFER_DIMENSIONS.length) * 100),
      rank: 0,
    }
  })
  rows.sort((a, b) => b.total - a.total)
  rows.forEach((r, i) => {
    r.rank = i + 1
  })
  return rows
}

export function offerCandidates(apps: Application[]): Application[] {
  return apps.filter((a) => a.status === "offer")
}

/** 找出前两名之间差异最大的维度，用于给出「决定性因素」提示。 */
export function decisiveFactor(rows: OfferRow[]): string | null {
  const scored = rows.filter((r) => r.total > 0)
  if (scored.length < 2) return null
  const [a, b] = scored
  let best: { label: string; gap: number; winner: string } | null = null
  for (const d of OFFER_DIMENSIONS) {
    const va = a.scores[d.id] ?? 0
    const vb = b.scores[d.id] ?? 0
    const gap = Math.abs(va - vb)
    if (!best || gap > best.gap) {
      best = { label: d.label, gap, winner: va > vb ? a.app.company : b.app.company }
    }
  }
  if (!best || best.gap === 0) {
    return `前两名在「${a.app.company}」和「${b.app.company}」六个维度上完全打平，说明你的权重设置还需要再收敛。`
  }
  return `决定性差异在「${best.label}」：${best.winner} 领先 ${best.gap} 分。如果这个维度对你其实不重要，回去调它的权重。`
}

/** 生成可粘贴给家人/导师/自己看的决策备忘。 */
export function decisionMemo(rows: OfferRow[], weights: Record<OfferDimensionId, number>): string {
  const scored = rows.filter((r) => r.total > 0)
  if (!scored.length) return "还没有给任何 Offer 打分。"
  const lines: string[] = ["【Offer 决策对比】", ""]
  const weightText = OFFER_DIMENSIONS.map((d) => `${d.label}×${weights[d.id]}`).join("、")
  lines.push(`权重设置：${weightText}`, "")
  for (const r of scored) {
    lines.push(`${r.rank}. ${r.app.company} · ${r.app.role}　加权总分 ${r.total}（已评 ${r.completeness}%）`)
    if (r.app.salary) lines.push(`   薪资：${r.app.salary}`)
    lines.push(
      `   明细：${OFFER_DIMENSIONS.map((d) => `${d.label} ${r.scores[d.id] ?? "-"}`).join(" / ")}`,
    )
    lines.push("")
  }
  if (scored.length >= 2) {
    lines.push(`首选：${scored[0].app.company}（领先 ${scored[0].total - scored[1].total} 分）`)
  }
  const f = decisiveFactor(rows)
  if (f) lines.push("", f)
  return lines.join("\n")
}
