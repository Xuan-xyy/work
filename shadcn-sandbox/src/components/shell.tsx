import { Fragment } from "react"
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  Moon,
  Settings,
  Sprout,
  Sun,
  TrendingUp,
} from "lucide-react"

import { NAV, QUOTES, STATUS } from "@/lib/constants"
import { fmtFull, todayISO } from "@/lib/format"
import { navigate } from "@/lib/router"
import { cn } from "@/lib/utils"
import type { ThemeMode } from "@/lib/types"

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/applications": Briefcase,
  "/interview": MessagesSquare,
  "/stories": FileText,
  "/internship": Sprout,
  "/career": TrendingUp,
}

/** 窄导航轨放不下长标签，只对最长的那个做缩写。 */
const SHORT_LABEL: Record<string, string> = {
  "/dashboard": "总览",
}

function RailButton({
  icon: Icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: typeof LayoutDashboard
  label: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="group flex w-full flex-col items-center gap-1.5 py-1"
    >
      <span
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full transition-all duration-300",
          active
            ? "bg-primary text-primary-foreground shadow-[0_12px_26px_-12px_var(--primary)]"
            : "bg-white/45 text-muted-foreground group-hover:bg-white/80 group-hover:text-foreground dark:bg-white/5 dark:group-hover:bg-white/10",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
        {typeof count === "number" && count > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-1 min-w-[17px] rounded-full px-1 text-[9px] leading-[15px] font-medium tabular-nums",
              active ? "bg-card text-primary" : "bg-primary text-primary-foreground",
            )}
          >
            {count}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[10px] tracking-[0.08em] transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  )
}

export function Sidebar({
  path,
  theme,
  onTheme,
  onSettings,
  name,
  target,
  counts,
}: {
  path: string
  theme: ThemeMode
  onTheme: () => void
  onSettings: () => void
  name: string
  target: string
  counts: Partial<Record<string, number>>
}) {
  return (
    /* self-center + 不拉伸：导航轨按内容收缩并垂直居中，
       避免在长页面上拉成一根几百像素空白的柱子 */
    <aside className="glass flex max-h-full w-[94px] shrink-0 flex-col items-center gap-1 self-center overflow-hidden rounded-[30px] px-2 py-5">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        title="秋招工作台"
        className="mb-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-white/55 text-primary shadow-[0_10px_26px_-16px_oklch(0.45_0.06_340_/_70%)] transition-transform duration-300 hover:scale-105 dark:bg-white/8"
      >
        <span className="font-display text-xl leading-none">秋</span>
      </button>

      <span className="mb-3 h-px w-9 shrink-0 bg-border" />

      <nav className="flex flex-col items-center gap-1 overflow-x-hidden">
        {NAV.map((group, gi) => (
          <Fragment key={group.group}>
            {gi > 0 && <span className="my-2.5 h-px w-7 shrink-0 bg-border" />}
            {group.items.map((item) => (
              <RailButton
                key={item.path}
                icon={ICONS[item.path] ?? LayoutDashboard}
                label={SHORT_LABEL[item.path] ?? item.label}
                active={path === item.path}
                count={counts[item.path]}
                onClick={() => navigate(item.path)}
              />
            ))}
          </Fragment>
        ))}
      </nav>

      <span className="my-3 h-px w-9 shrink-0 bg-border" />

      <div className="flex shrink-0 flex-col items-center gap-2">
        <button
          type="button"
          onClick={onTheme}
          title={theme === "dark" ? "切换到浅色" : "切换到深色"}
          className="flex size-9 items-center justify-center rounded-full bg-white/45 text-muted-foreground transition-colors hover:text-foreground dark:bg-white/5"
        >
          {theme === "dark" ? (
            <Moon className="size-4" strokeWidth={1.75} />
          ) : (
            <Sun className="size-4" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          onClick={onSettings}
          title="设置"
          className="flex size-9 items-center justify-center rounded-full bg-white/45 text-muted-foreground transition-colors hover:text-foreground dark:bg-white/5"
        >
          <Settings className="size-4" strokeWidth={1.75} />
        </button>
        <p className="mt-1 w-full truncate text-center text-[10px] tracking-[0.08em] text-muted-foreground">
          {name || "User"}
        </p>
        <p className="w-full truncate text-center text-[9px] text-muted-foreground/70">
          {target || "未填方向"}
        </p>
      </div>
    </aside>
  )
}

export function Topbar({
  name,
  quoteIndex,
  onQuote,
  sprintDays,
  offerCount,
}: {
  name: string
  quoteIndex: number
  onQuote: () => void
  sprintDays: number
  offerCount: number
}) {
  return (
    <header className="glass flex shrink-0 items-center justify-between gap-4 rounded-full py-2.5 pr-3 pl-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Sprout className="size-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="font-display truncate text-[15px] leading-tight tracking-[0.01em]">
            Hello, {name || "User"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            秋招冲刺第 {sprintDays} 天
            {offerCount > 0 ? ` · 已收获 ${offerCount} 个 Offer` : " · 今天也投一家"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-[11px] tracking-[0.06em] text-muted-foreground lg:block">
          {fmtFull(todayISO())}
        </span>
        <button
          type="button"
          onClick={onQuote}
          title="点击换一句"
          className="max-w-md rounded-full border border-border bg-white/40 px-4 py-1.5 text-left text-[11px] tracking-[0.06em] text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10"
        >
          {QUOTES[quoteIndex % QUOTES.length]}
        </button>
      </div>
    </header>
  )
}

/** 侧栏角标用：进行中的面试数、待沉淀的实习日报数等。 */
export function navCounts(input: {
  applications: number
  internship: number
  highlights: number
  offers: number
}): Record<string, number> {
  return {
    "/applications": input.applications,
    "/internship": input.internship,
    "/stories": input.highlights,
  }
}

export const STATUS_LIST = Object.keys(STATUS)
