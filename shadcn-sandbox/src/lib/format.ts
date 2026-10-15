/** 日期与数字工具。全部基于本地日期分量，避免 new Date("YYYY-MM-DD") 的 UTC 偏移坑。 */

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

export function parseISO(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return new Date(NaN)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function isoOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function todayISO(): string {
  return isoOf(new Date())
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

export function diffDays(a: string, b: string): number {
  const ms = parseISO(a).getTime() - parseISO(b).getTime()
  return Math.round(ms / 86400000)
}

export function daysFromToday(iso: string): number {
  return diffDays(iso, todayISO())
}

export function fmtFull(iso: string): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`
}

export function fmtMd(iso: string): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`
}

export function rel(iso: string): string {
  if (!iso) return "—"
  const n = daysFromToday(iso)
  if (n === 0) return "今天"
  if (n === 1) return "明天"
  if (n === 2) return "后天"
  if (n === -1) return "昨天"
  if (n < 0) return `逾期 ${Math.abs(n)} 天`
  return `${n} 天后`
}

/** 用于已经发生的事（投递日期、日报日期），不能说「逾期」。 */
export function ago(iso: string): string {
  if (!iso) return "—"
  const n = daysFromToday(iso)
  if (n === 0) return "今天"
  if (n === -1) return "昨天"
  if (n === -2) return "前天"
  if (n > 0) return `${n} 天后`
  return `${Math.abs(n)} 天前`
}

/** 周一为一周起点。 */
export function startOfWeek(base: Date = new Date()): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = d.getDay() // 0=Sun
  const shift = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + shift)
  return d
}

export function endOfWeek(base: Date = new Date()): Date {
  const s = startOfWeek(base)
  s.setDate(s.getDate() + 6)
  return s
}

export function weekRange(base: Date = new Date()): { start: string; end: string } {
  return { start: isoOf(startOfWeek(base)), end: isoOf(endOfWeek(base)) }
}

export function weekLabel(start: string, end: string): string {
  const a = parseISO(start)
  const b = parseISO(end)
  const sameMonth = a.getMonth() === b.getMonth()
  return sameMonth
    ? `${a.getMonth() + 1}月${a.getDate()}日 – ${b.getDate()}日`
    : `${a.getMonth() + 1}月${a.getDate()}日 – ${b.getMonth() + 1}月${b.getDate()}日`
}

/** 周一为一周起点，返回该周内每一天的 ISO 日期。 */
export function daysOfWeek(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function pct(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function truncate(s: string, n: number): string {
  const t = (s ?? "").trim()
  return t.length <= n ? t : t.slice(0, n - 1) + "…"
}
