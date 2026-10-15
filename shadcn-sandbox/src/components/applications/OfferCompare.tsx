import { ClipboardCopy, Info, Scale, SlidersHorizontal, Trophy } from "lucide-react"

import { Empty, SectionCard } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { copyText } from "@/lib/csv"
import { OFFER_DIMENSIONS } from "@/lib/constants"
import { decisiveFactor, decisionMemo, offerCandidates, scoreOffers } from "@/lib/offers"
import { actions, useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { OfferDimensionId } from "@/lib/types"

const SCORES = [1, 2, 3, 4, 5]

export function OfferCompare() {
  const db = useDB()
  const offers = offerCandidates(db.applications)
  const rows = scoreOffers(offers, db.offerScores, db.offerWeights)
  const decisive = decisiveFactor(rows)
  const winner = rows.find((r) => r.total > 0)

  if (!offers.length) {
    return (
      <SectionCard
        title="Offer 决策对比"
        description="把拿到手的 Offer 放到同一把尺子上量，而不是凭当天的情绪拍脑袋"
      >
        <Empty
          title="还没有 Offer 阶段的记录"
          description="把某个投递的阶段推进到「Offer」，它就会自动出现在这里。可以先在演示数据里看效果。"
        />
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Offer 决策对比"
        description="每格打 1–5 分；权重决定这个维度对你有多重要。总分 = 加权得分 / 加权满分 × 100。"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const ok = await copyText(decisionMemo(rows, db.offerWeights))
              toast(ok ? "决策备忘已复制到剪贴板" : "复制失败，请手动选择文本", ok ? "ok" : "warn")
            }}
          >
            <ClipboardCopy className="size-3.5" />
            复制决策备忘
          </Button>
        }
        contentClassName="pt-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="min-w-44 px-2 py-2 text-left text-[11px] font-medium text-muted-foreground">
                  Offer
                </th>
                {OFFER_DIMENSIONS.map((d) => (
                  <th key={d.id} className="min-w-24 px-2 py-2 text-center">
                    <div className="text-[11px] font-medium text-foreground" title={d.hint}>
                      {d.label}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <SlidersHorizontal className="size-2.5" />
                      权重
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={db.offerWeights[d.id]}
                        onChange={(e) =>
                          actions.setOfferWeight(
                            d.id as OfferDimensionId,
                            Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                          )
                        }
                        className="w-9 rounded border border-input bg-transparent px-1 py-0.5 text-center text-[10px] tabular-nums"
                      />
                    </div>
                  </th>
                ))}
                <th className="min-w-28 px-2 py-2 text-center text-[11px] font-medium text-muted-foreground">
                  加权总分
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.app.id} className="border-b border-border last:border-0">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {r.rank === 1 && r.total > 0 && <Trophy className="size-3.5 text-amber-500" />}
                      <span className="font-medium">{r.app.company}</span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.app.role || "未填岗位"}
                      {r.app.salary ? ` · ${r.app.salary}` : ""}
                    </p>
                  </td>
                  {OFFER_DIMENSIONS.map((d) => {
                    const v = r.scores[d.id] ?? 0
                    return (
                      <td key={d.id} className="px-1 py-2">
                        <div className="flex justify-center gap-0.5">
                          {SCORES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              title={`${d.label} ${s} 分`}
                              onClick={() => actions.setOfferScore(r.app.id, d.id as OfferDimensionId, s)}
                              className={cn(
                                "size-5 rounded text-[10px] tabular-nums transition-colors",
                                v === s
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-accent",
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right text-sm font-semibold tabular-nums">{r.total}</span>
                      <Progress value={r.total} className="h-1.5 w-16" />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">已评 {r.completeness}%</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="结论" description="排名随权重实时变化">
          {winner ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                当前首选：<span className="font-semibold">{winner.app.company}</span>
                <span className="text-muted-foreground">（{winner.total} 分）</span>
              </p>
              {rows.length > 1 && rows[1].total > 0 && (
                <p className="text-xs text-muted-foreground">
                  第二名 {rows[1].app.company}：{rows[1].total} 分，差距 {winner.total - rows[1].total} 分。
                  {winner.total - rows[1].total <= 5 && "差距很小，说明你内心其实还没分出高下。"}
                </p>
              )}
              {decisive && (
                <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {decisive}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">先给至少一个 Offer 打分，这里会给出结论。</p>
          )}
        </SectionCard>

        <SectionCard title="打分提醒" description="避免常见的决策陷阱">
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>· 权重先定，再打分。反过来的话，你会不自觉地把高权重给已经想去的那个。</li>
            <li>· 「稳定性」权重给太高，容易选到无聊但安全的选择；先想清楚你这一轮到底要什么。</li>
            <li>· 打分只写数字，不写理由。写完再回头看哪一项让你犹豫——那通常才是真问题。</li>
            <li>· 全部维度都打满分说明你没在认真比较。</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}
