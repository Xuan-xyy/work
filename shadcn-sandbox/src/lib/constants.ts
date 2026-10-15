import type {
  EventType,
  OfferDimension,
  OfferDimensionId,
  Priority,
  Status,
} from "./types"

export const STATUS: Record<Status, { label: string; tone: string }> = {
  wishlist: { label: "想投", tone: "slate" },
  applied: { label: "已投递", tone: "blue" },
  written: { label: "笔试", tone: "amber" },
  interview: { label: "面试", tone: "violet" },
  offer: { label: "Offer", tone: "green" },
  rejected: { label: "已挂", tone: "red" },
  withdrawn: { label: "已放弃", tone: "zinc" },
}

export const STATUS_ORDER: Status[] = [
  "wishlist",
  "applied",
  "written",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]

/** 看板列：只放推进中的阶段，终点状态不进看板。 */
export const BOARD_COLUMNS: Status[] = [
  "wishlist",
  "applied",
  "written",
  "interview",
  "offer",
]

export const TERMINAL: Status[] = ["offer", "rejected", "withdrawn"]

export const PRIORITIES: Array<{ id: Priority; label: string; tone: string }> = [
  { id: "high", label: "重点", tone: "red" },
  { id: "mid", label: "常规", tone: "amber" },
  { id: "low", label: "保底", tone: "slate" },
]

export const CHANNELS = [
  "官网",
  "Boss直聘",
  "牛客",
  "内推",
  "实习转正",
  "校招宣讲",
  "脉脉",
  "其他",
]

export const CITIES = [
  "北京",
  "上海",
  "深圳",
  "杭州",
  "广州",
  "成都",
  "南京",
  "武汉",
  "远程",
  "其他",
]

export const EVENT_LABELS: Record<EventType, string> = {
  created: "创建记录",
  applied: "已投递",
  written: "进入笔试",
  interview: "进入面试",
  offer: "拿到 Offer",
  rejected: "流程结束",
  withdrawn: "主动放弃",
  note: "备注",
}

export const QUOTES = [
  "每一次准备，都会成为下一次机会的积累",
  "把不确定的事，拆成今天能做完的一步",
  "投递是被拒的艺术，坚持是复利",
  "慢一点没关系，别停",
]

export const OFFER_DIMENSIONS: OfferDimension[] = [
  { id: "salary", label: "薪资待遇", hint: "现金 + 股票 + 签字费，按年化算" },
  { id: "growth", label: "成长空间", hint: "业务前景、技术深度、带教质量" },
  { id: "team", label: "团队氛围", hint: "面试体感、加班强度、汇报关系" },
  { id: "city", label: "城市生活", hint: "落户、房租、通勤、离家远近" },
  { id: "stability", label: "稳定性", hint: "公司经营状况、业务线风险" },
  { id: "interest", label: "兴趣匹配", hint: "是否真的想做这件事" },
]

export const DEFAULT_OFFER_WEIGHTS: Record<OfferDimensionId, number> = {
  salary: 3,
  growth: 5,
  team: 4,
  city: 3,
  stability: 2,
  interest: 4,
}

export const SKILL_PRESETS = [
  "需求分析",
  "数据分析",
  "SQL",
  "Python",
  "Java",
  "Go",
  "React",
  "Vue",
  "Figma",
  "埋点",
  "A/B 实验",
  "项目推进",
  "跨部门沟通",
  "文档沉淀",
  "测试",
  "运维",
]

export const TONE_CLASS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export const NAV = [
  { group: "核心", items: [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/applications", label: "求职管理" },
  ]},
  { group: "成长模块", items: [
    { path: "/interview", label: "面试训练" },
    { path: "/stories", label: "简历素材" },
    { path: "/internship", label: "实习成长" },
    { path: "/career", label: "职业成长" },
  ]},
] as const

export const STORAGE_KEY = "qiuzhao.workbench.v1"

/* ---------------------------- 面试训练 ---------------------------- */

export const QUESTION_CATEGORIES = [
  "项目深挖",
  "八股基础",
  "算法手撕",
  "系统设计",
  "行为面",
  "反问环节",
  "其他",
]

export const MASTERY_LEVELS: Array<{ v: 0 | 1 | 2 | 3; label: string; short: string; tone: string }> = [
  { v: 0, label: "没准备", short: "未", tone: "red" },
  { v: 1, label: "看过面经", short: "看", tone: "amber" },
  { v: 2, label: "能说清楚", short: "说", tone: "blue" },
  { v: 3, label: "经得住追问", short: "稳", tone: "green" },
]

export const ROUND_NAMES = ["一面", "二面", "三面", "四面", "HR 面", "主管面", "交叉面", "笔试", "群面"]

export const INTERVIEW_FORMATS = ["线上视频", "电话", "线下", "笔试", "AI 面"]

export const ROUND_RESULTS = ["待定", "通过", "挂", "主动放弃"]

/* ---------------------------- 职业成长 ---------------------------- */

export const SKILL_CATEGORIES = ["编程语言", "工程能力", "数据能力", "业务理解", "协作沟通", "其他"]

export const HORIZONS: Array<{ v: "3m" | "1y" | "3y"; label: string }> = [
  { v: "3m", label: "3 个月" },
  { v: "1y", label: "1 年" },
  { v: "3y", label: "3 年" },
]

export const AUTO_METRICS: Array<{ v: string; label: string }> = [
  { v: "", label: "手动调整" },
  { v: "applications", label: "累计记录公司数" },
  { v: "submitted", label: "已投递公司数" },
  { v: "interviews", label: "面试中公司数" },
  { v: "offers", label: "Offer 数" },
  { v: "logs", label: "实习日报条数" },
  { v: "highlights", label: "简历亮点条数" },
  { v: "questions", label: "题库题目数" },
]
