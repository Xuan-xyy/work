import { useMemo, useState } from "react"
import { ClipboardCopy, Download, Eye, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { copyText, download } from "@/lib/csv"
import { fmtMd, todayISO } from "@/lib/format"
import { drillLayerLabel, dueQuestions, masteryStats, type DrillLayer } from "@/lib/interview"
import { buildInterviewKit, kitFileName, kitProjects } from "@/lib/interviewKit"
import { useDB } from "@/lib/store"
import { toast } from "@/lib/toast"

const LAYERS: DrillLayer[] = [1, 2, 3]

export function KitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const db = useDB()
  const [showRaw, setShowRaw] = useState(false)

  /* 生成器是纯函数，预览和导出读的是同一次结果 */
  const markdown = useMemo(() => buildInterviewKit(db), [db])
  const projects = useMemo(() => kitProjects(db), [db])
  const stats = useMemo(() => masteryStats(db.questions), [db.questions])
  const due = useMemo(() => dueQuestions(db.questions), [db.questions])
  const pitfalls = useMemo(
    () =>
      db.rounds
        .filter((r) => r.result === "挂" || r.wentWrong.trim() !== "")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.rounds],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* grid-rows 的第三行必须是 minmax(0,1fr)，否则滚动区会把页脚顶出对话框 */}
      <DialogContent className="max-h-[88vh] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal tracking-[0.02em]">
            面试准备清单
          </DialogTitle>
          <DialogDescription>
            把三层追问、踩过的坑、待复习题和技能证据合成一份 Markdown，带去面试现场。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-white/55 px-2.5 py-1 dark:bg-white/8">
            准备度 <span className="font-display tabular-nums">{stats.readiness}%</span>
          </span>
          <span className="rounded-full bg-white/55 px-2.5 py-1 dark:bg-white/8">
            待复习 <span className="font-display tabular-nums">{due.length}</span> 题
          </span>
          <span className="rounded-full bg-white/55 px-2.5 py-1 dark:bg-white/8">
            项目 <span className="font-display tabular-nums">{projects.length}</span> 个
          </span>
          <span className="rounded-full bg-white/55 px-2.5 py-1 dark:bg-white/8">
            踩过的坑 <span className="font-display tabular-nums">{pitfalls.length}</span> 条
          </span>
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          {showRaw ? (
            <pre className="rounded-2xl bg-white/45 p-4 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground dark:bg-white/5">
              {markdown}
            </pre>
          ) : (
            <div className="space-y-3">
              {projects.length === 0 && (
                <p className="rounded-2xl border border-dashed border-primary/25 px-4 py-8 text-center text-xs text-muted-foreground">
                  还没有实习日报。先去「实习成长」记一条带卡点和结果的日报，这份清单才会有项目追问。
                </p>
              )}

              {projects.map((p) => (
                <div key={p.project} className="rounded-2xl bg-white/45 p-4 dark:bg-white/5">
                  <p className="font-display text-[15px] tracking-[0.01em]">{p.project}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.dates.length > 1
                      ? `${fmtMd(p.dates[p.dates.length - 1])} → ${fmtMd(p.dates[0])} · ${p.dates.length} 条日报`
                      : fmtMd(p.dates[0] ?? "")}
                    {p.skills.length ? ` · ${p.skills.join(" / ")}` : ""}
                  </p>

                  {LAYERS.map((layer) => {
                    const group = p.drills.filter((d) => d.layer === layer)
                    if (!group.length) return null
                    return (
                      <div key={layer} className="mt-3.5">
                        <p className="eyebrow text-primary/80">
                          第 {layer} 层 · {drillLayerLabel(layer).split(" · ")[0]}
                        </p>
                        <p className="mb-1.5 text-[11px] text-muted-foreground">
                          {drillLayerLabel(layer).split(" · ")[1] ?? ""}
                        </p>
                        <ul className="space-y-2">
                          {group.map((d, i) => (
                            <li key={i} className="flex gap-2">
                              <Square
                                className="mt-[3px] size-3 shrink-0 text-primary/45"
                                strokeWidth={1.75}
                              />
                              <div className="min-w-0">
                                <p className="text-[13px] leading-snug">{d.question}</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                                  考什么：{d.hint}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ))}

              {pitfalls.length > 0 && (
                <div className="rounded-2xl bg-white/45 p-4 dark:bg-white/5">
                  <p className="font-display text-[15px]">复盘里踩过的坑</p>
                  <ul className="mt-2.5 space-y-2">
                    {pitfalls.map((r) => (
                      <li key={r.id} className="text-[13px] leading-snug">
                        <span className="font-medium">
                          {[r.company, r.round].filter(Boolean).join(" · ")}
                        </span>
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {fmtMd(r.date)}
                          {r.result ? ` · ${r.result}` : ""}
                        </span>
                        {r.wentWrong.trim() && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            没答好：{r.wentWrong}
                          </p>
                        )}
                        {r.nextTime.trim() && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            下次改：{r.nextTime}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setShowRaw((v) => !v)}>
            <Eye className="size-3.5" />
            {showRaw ? "看结构化预览" : "查看 Markdown 原文"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void copyText(markdown).then((ok) =>
                  toast(
                    ok ? "准备清单已复制，粘到备忘录就能带走" : "复制失败，可看原文手动复制",
                    ok ? "ok" : "warn",
                  ),
                )
              }
            >
              <ClipboardCopy className="size-3.5" />
              复制清单
            </Button>
            <Button
              size="sm"
              onClick={() =>
                download(kitFileName(db, todayISO()), markdown, "text/markdown;charset=utf-8")
              }
            >
              <Download className="size-3.5" />
              导出 Markdown
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
