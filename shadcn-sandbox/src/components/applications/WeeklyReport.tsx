import { useState } from "react"
import { CalendarRange, ChevronLeft, ChevronRight, ClipboardCopy, Download, Eye, FileText } from "lucide-react"

import { MiniBars } from "@/components/charts"
import { SectionCard, StatusChip } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { copyText, download } from "@/lib/csv"
import { STATUS } from "@/lib/constants"
import { addDays, fmtMd, weekLabel, weekRange } from "@/lib/format"
import { actions, useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import { buildWeeklyReport } from "@/lib/weekly"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]

export function WeeklyReport({ onGoApplications }: { onGoApplications: () => void }) {
  const db = useDB()
  const [offset, setOffset] = useState(0)
  const base = new Date()
  base.setDate(base.getDate() + offset * 7)
  const range = weekRange(base)
  const report = buildWeeklyReport(db, range.start)
  const [showRaw, setShowRaw] = useState(false)

  const step = (n: number) => setOffset((o) => o + n)

  return (
    <div className="space-y-4">
      <SectionCard
        title="投递周报"
        description="每周一自动汇总上周的投递、推进与下周待办，复制即可发给导师或写进实习周报"
        action={
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="上一周">
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant={offset === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setOffset(0)}
              className="min-w-28 justify-center"
            >
              <CalendarRange className="size-3.5" />
              {offset === 0 ? "本周" : weekLabel(range.start, range.end)}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => step(1)}
              disabled={offset >= 0}
              aria-label="下一周"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "本周新增投递", value: report.stats.newCount, suffix: "家" },
            { label: "阶段推进", value: report.stats.advanceCount, suffix: "次" },
            { label: "新增 Offer", value: report.stats.offerCount, suffix: "个" },
            { label: "下周面试", value: report.stats.interviewCount, suffix: "场" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {s.value}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{s.suffix}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium">每日投递节奏（{report.isCurrentWeek ? "本周" : report.label}）</p>
          <MiniBars
            values={report.dailyCounts.map((d) => d.count)}
            labels={WEEKDAYS}
            highlightIndex={report.isCurrentWeek ? (new Date().getDay() + 6) % 7 : undefined}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={async () => {
              const ok = await copyText(report.markdown)
              toast(ok ? "周报已复制到剪贴板" : "复制失败，可切换到原文手动复制", ok ? "ok" : "warn")
            }}
          >
            <ClipboardCopy className="size-3.5" />
            复制周报
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              download(
                `秋招周报-${report.start}.md`,
                report.markdown,
                "text/markdown;charset=utf-8",
              )
            }
          >
            <Download className="size-3.5" />
            导出 Markdown
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowRaw((v) => !v)}>
            <Eye className="size-3.5" />
            {showRaw ? "收起原文" : "查看原文"}
          </Button>
        </div>

        {showRaw && (
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-border bg-muted p-3 text-[11px] whitespace-pre-wrap text-muted-foreground">
            {report.markdown}
          </pre>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="本周新增投递" description={`${report.newApplications.length} 家`}>
          {report.newApplications.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              这一周没有新增投递。如果确实在忙别的，可以跳过；
              {report.isCurrentWeek && "如果只是忘了记，现在补上还来得及。"}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {report.newApplications.map((a) => (
                <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {fmtMd(a.appliedAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.company}</span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block sm:max-w-32">
                    {a.role}
                  </span>
                  <StatusChip status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="阶段推进" description={`${report.advances.length} 次`}>
          {report.advances.length === 0 ? (
            <p className="text-xs text-muted-foreground">这一周没有阶段变化。</p>
          ) : (
            <ul className="divide-y divide-border">
              {report.advances.map((v, i) => (
                <li key={`${v.app.id}-${i}`} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {fmtMd(v.at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{v.app.company}</span>
                  <span className="text-[11px] text-muted-foreground">→</span>
                  <StatusChip status={v.to} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="结果与下周安排" description="下周要盯的事">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                新增 Offer {report.offers.length}
              </span>
              <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                流程结束 {report.rejections.length}
              </span>
              <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                进行中 {report.stats.activeTotal}
              </span>
            </div>
            {report.interviewsNext.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                下周暂无笔试/面试安排。可以在求职管理里给进行中的记录设「下一步时间」。
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {report.interviewsNext.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {fmtMd(a.nextAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{a.company}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px]",
                        a.status === "written"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
                      )}
                    >
                      {a.status === "written" ? "笔试" : "面试"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>

        <SectionCard title="实习成长" description={`日报 ${report.stats.logCount} 条 · 亮点 ${report.stats.highlightCount} 条`}>
          {report.logs.length === 0 && report.highlights.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              这一周没有实习日报。日报是简历素材的唯一来源，断一周就少一周的素材。
            </p>
          ) : (
            <ul className="space-y-2">
              {report.logs.map((l) => (
                <li key={l.id} className="rounded-md border border-border p-2.5">
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <FileText className="size-3.5 text-muted-foreground" />
                    {l.project || "未填项目"}
                    <span className="ml-auto text-[11px] font-normal tabular-nums text-muted-foreground">
                      {fmtMd(l.date)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{l.did}</p>
                  {l.metric && (
                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">成果：{l.metric}</p>
                  )}
                </li>
              ))}
              {report.highlights.map((h) => (
                <li key={h.id} className="rounded-md bg-muted p-2.5 text-[11px]">
                  <span className="font-medium text-foreground">亮点</span> {h.title}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="使用方法" description="周报不是给自己看的">
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          <li>1. 每周日晚或周一早上打开这里，确认「本周新增」和「阶段推进」没有漏记。</li>
          <li>2. 点「复制周报」，直接粘进实习周报、导师汇报或自己的复盘文档。</li>
          <li>3. 关注「下周面试」——如果连续两周为空，说明该加大投递量了。</li>
          <li>4. 如果某周新增为 0 且没有面试，别自责，把这条周报留着，它会告诉你时间去哪了。</li>
        </ol>
        <Button variant="outline" size="sm" className="mt-3" onClick={onGoApplications}>
          去求职管理补记录
        </Button>
      </SectionCard>
    </div>
  )
}

export { addDays, STATUS }
