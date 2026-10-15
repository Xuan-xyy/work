import { useMemo } from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Zap } from "lucide-react"

import { BarsV, Donut, FunnelBars, ProgressRing } from "@/components/charts"
import { Empty, Kpi, PageHeader, SectionCard, StatusChip } from "@/components/bits"
import { Button } from "@/components/ui/button"
import {
  channels,
  followUps,
  funnel,
  insights,
  sprintDay,
  summary,
  trend,
  upcoming,
  weekCount,
  weekRhythm,
} from "@/lib/analytics"
import { NAV, STATUS } from "@/lib/constants"
import { fmtMd, rel } from "@/lib/format"
import { navigate } from "@/lib/router"
import { useDB } from "@/lib/store"
import { cn } from "@/lib/utils"

export const STATUS_COLOR: Record<string, string> = {
  wishlist: "var(--stage-wishlist)",
  applied: "var(--stage-applied)",
  written: "var(--stage-written)",
  interview: "var(--stage-interview)",
  offer: "var(--stage-offer)",
  rejected: "var(--stage-rejected)",
  withdrawn: "var(--stage-withdrawn)",
}

const TONE_STYLE = {
  warn: { cls: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40", Icon: AlertTriangle },
  good: { cls: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40", Icon: CheckCircle2 },
  info: { cls: "border-border bg-muted", Icon: Info },
} as const

export function Dashboard() {
  const db = useDB()
  const apps = db.applications

  const s = useMemo(() => summary(apps), [apps])
  const rows = useMemo(() => funnel(apps), [apps])
  const todo = useMemo(() => followUps(apps), [apps])
  const soon = useMemo(() => upcoming(apps, 7), [apps])
  const chans = useMemo(() => channels(apps), [apps])
  const trendData = useMemo(() => trend(apps, 30), [apps])
  const rhythm = useMemo(() => weekRhythm(apps), [apps])
  const tips = useMemo(() => insights(apps), [apps])
  const sprint = useMemo(() => sprintDay(apps), [apps])

  if (!apps.length) {
    return (
      <div>
        <PageHeader title="Dashboard" description="还没有任何投递记录" />
        <Empty
          title="从第一条投递开始"
          description="可以手动新增，也可以把 Excel 里的投递表直接粘贴导入。想先看效果就载入演示数据。"
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => navigate("/applications")}>
                去求职管理
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const byStatus = (Object.keys(STATUS) as Array<keyof typeof STATUS>)
    .map((k) => ({ label: STATUS[k].label, value: apps.filter((a) => a.status === k).length, color: STATUS_COLOR[k] }))
    .filter((x) => x.value > 0)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`秋招冲刺第 ${sprint} 天 · 共记录 ${s.total} 家，${s.active} 家仍在流程中`}
      />

      <div className="mb-5 space-y-2">
        {tips.map((t, i) => {
          const { cls, Icon } = TONE_STYLE[t.tone]
          return (
            <div key={i} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", cls)}>
              <Icon className="mt-0.5 size-3.5 shrink-0" />
              <span>{t.text}</span>
            </div>
          )
        })}
      </div>

      {/* 只留 4 个主指标：响应率已经在漏斗卡页脚里，重复摆一排只会更像模板仪表盘 */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="已投递" value={s.submitted} hint={`共记录 ${s.total} 家 · 本周 +${s.thisWeek}`} />
        <Kpi label="流程中" value={s.active} hint="未终结的记录" />
        <Kpi label="面试中" value={s.interviews} hint={`面试率 ${s.interviewRate}%`} />
        <Kpi
          label="Offer"
          value={s.offers}
          tone={s.offers > 0 ? "good" : "default"}
          hint={`转化 ${s.offerRate}%`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="今日聚焦"
          description={todo.length ? `${todo.length} 条需要跟进` : "今天没有逾期项"}
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="xs" onClick={() => navigate("/applications?view=table&filter=followup")}>
              全部
              <ArrowRight className="size-3" />
            </Button>
          }
        >
          {todo.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              没有逾期或今日到期的事项。可以去给进行中的记录设「下一步时间」，让系统帮你盯。
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {todo.map((a) => {
                const overdue = a.nextAt < new Date().toISOString().slice(0, 10)
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <Zap className={cn("size-3.5 shrink-0", overdue ? "text-rose-500" : "text-amber-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.company}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {a.role || "未填岗位"} · {a.channel || "未标渠道"}
                      </p>
                    </div>
                    <StatusChip status={a.status} />
                    <span
                      className={cn(
                        "w-20 shrink-0 text-right text-[11px] tabular-nums",
                        overdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
                      )}
                    >
                      {rel(a.nextAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="本周节奏" description={`目标 15 家 · 已完成 ${weekCount(apps)} 家`}>
          <ProgressRing value={weekCount(apps)} goal={15} caption="周一是新的开始，别等到周五才想起来投" />
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[11px] text-muted-foreground">每日分布</p>
            <div className="flex items-end gap-1.5">
              {rhythm.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn("w-full rounded", d.count > 0 ? "bg-primary/60" : "bg-muted")}
                    style={{ height: Math.max(4, d.count * 12) }}
                    title={`${d.date}：${d.count} 家`}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="投递漏斗" description="被拒也计入到达过的深度">
          <FunnelBars rows={rows} />
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
            {[
              { label: "简历响应", value: `${s.responseRate}%` },
              { label: "面试转化", value: `${s.interviewRate}%` },
              { label: "Offer 转化", value: `${s.offerRate}%` },
            ].map((x) => (
              <div key={x.label}>
                <p className="text-[11px] text-muted-foreground">{x.label}</p>
                <p className="text-sm font-semibold tabular-nums">{x.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="状态分布" description="当前所处阶段">
          <Donut
            slices={byStatus}
            center={{ value: String(s.total), label: "总记录" }}
          />
        </SectionCard>

        <SectionCard title="近 30 天投递趋势" description="看节奏有没有掉下来" className="lg:col-span-2">
          <BarsV data={trendData} height={110} />
        </SectionCard>

        <SectionCard title="渠道效果" description="哪个渠道真的给你面试" className="lg:col-span-2">
          {chans.length === 0 ? (
            <p className="text-xs text-muted-foreground">还没有渠道数据。</p>
          ) : (
            <ul className="space-y-2">
              {chans.slice(0, 6).map((c) => (
                <li key={c.channel} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-xs">{c.channel}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary/70"
                      style={{ width: `${(c.total / chans[0].total) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    投 {c.total} · 面 {c.interviews} · {c.rate}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="未来 7 天" description={`${soon.length} 项安排`}>
          {soon.length === 0 ? (
            <p className="text-xs text-muted-foreground">未来一周没有已安排的笔试或面试。</p>
          ) : (
            <ul className="divide-y divide-border">
              {soon.map((a) => (
                <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {fmtMd(a.nextAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.company}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{rel(a.nextAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {NAV[1].items.slice(1).map((m) => (
          <button
            key={m.path}
            type="button"
            onClick={() => navigate(m.path)}
            className="rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/40"
          >
            <p className="text-sm font-medium">{m.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {m.path === "/interview" && "面经题库 + 复盘，把每次面试变成下一次的准备"}
              {m.path === "/stories" && `${db.highlights.length} 条素材已沉淀`}
              {m.path === "/internship" && `${db.internship.length} 条日报，写下去就是简历`}
              {m.path === "/career" && "技能进度条与长期目标"}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
