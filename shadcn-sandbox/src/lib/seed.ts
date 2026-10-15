import { addDays, todayISO } from "./format"
import { draftFromLog, scoreHighlight } from "./highlights"
import { nextReviewDate } from "./interview"
import type {
  Application,
  EventType,
  GoalItem,
  Highlight,
  InternshipLog,
  InterviewQuestion,
  InterviewRound,
  MasteryLevel,
  Priority,
  Skill,
  Status,
} from "./types"

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

type SeedRow = {
  company: string
  role: string
  city: string
  channel: string
  salary: string
  status: Status
  priority: Priority
  /** 相对今天的天数偏移，负数表示过去 */
  applied: number
  next?: number
  reach?: number
  tags?: string[]
  notes?: string
  /** 落在本周的演示数据（0=今天，1=昨天…），保证「本周节奏」不是空的。 */
  weekSlot?: number
  /** 本周内已经推进过一次（写入一条笔试事件）。 */
  advanced?: boolean
}

const ROWS: SeedRow[] = [
  { company: "字节跳动", role: "后端开发工程师", city: "北京", channel: "官网", salary: "30-45K·15薪", status: "offer", priority: "high", applied: -46, reach: 18, tags: ["Go", "基础架构"], notes: "三面已过，等 HR 谈薪。" },
  { company: "腾讯", role: "后台开发（IEG）", city: "深圳", channel: "内推", salary: "28-40K·16薪", status: "offer", priority: "high", applied: -44, reach: 21, tags: ["C++", "游戏"], notes: "Offer 已发，签字费可谈。" },
  { company: "阿里巴巴", role: "研发工程师（淘天）", city: "杭州", channel: "官网", salary: "27-40K·16薪", status: "interview", priority: "high", applied: -38, next: 2, reach: 12, tags: ["Java", "交易"] },
  { company: "美团", role: "后端开发（到店）", city: "北京", channel: "牛客", salary: "26-36K·15.5薪", status: "interview", priority: "high", applied: -35, next: 1, reach: 10, tags: ["Java"] },
  { company: "小红书", role: "服务端开发", city: "上海", channel: "Boss直聘", salary: "28-42K·15薪", status: "interview", priority: "mid", applied: -30, next: 4, reach: 8 },
  { company: "拼多多", role: "服务端研发", city: "上海", channel: "官网", salary: "35-55K·18薪", status: "written", priority: "mid", applied: -28, next: -1, tags: ["高强度"] },
  { company: "网易", role: "游戏服务端", city: "广州", channel: "校招宣讲", salary: "22-32K·15薪", status: "written", priority: "mid", applied: -25, next: 3 },
  { company: "百度", role: "C++ 研发（ACG）", city: "北京", channel: "官网", salary: "24-34K·15薪", status: "applied", priority: "mid", applied: -20 },
  { company: "快手", role: "后端开发（电商）", city: "北京", channel: "Boss直聘", salary: "28-40K·16薪", status: "applied", priority: "high", applied: -18, next: 1 },
  { company: "京东", role: "软件开发（零售）", city: "北京", channel: "内推", salary: "23-33K·15薪", status: "applied", priority: "mid", applied: -16 },
  { company: "滴滴", role: "后端研发", city: "北京", channel: "牛客", salary: "25-35K·15薪", status: "applied", priority: "low", applied: -14 },
  { company: "哔哩哔哩", role: "服务端工程师", city: "上海", channel: "官网", salary: "22-32K·15薪", status: "applied", priority: "mid", applied: -12, tags: ["二次元"] },
  { company: "小米", role: "软件研发（汽车）", city: "北京", channel: "校招宣讲", salary: "24-34K·14薪", status: "applied", priority: "mid", applied: -11 },
  { company: "华为", role: "软件开发工程师", city: "深圳", channel: "官网", salary: "25-38K·14薪", status: "written", priority: "high", applied: -24, next: 5, tags: ["机试"] },
  { company: "携程", role: "后端开发", city: "上海", channel: "Boss直聘", salary: "22-30K·15薪", status: "applied", priority: "low", applied: -9 },
  { company: "Shein", role: "供应链后端", city: "南京", channel: "官网", salary: "23-32K·14薪", status: "applied", priority: "low", applied: -8 },
  { company: "米哈游", role: "服务端开发", city: "上海", channel: "内推", salary: "26-40K·16薪", status: "rejected", priority: "mid", applied: -40, reach: 15, notes: "二面挂了，问了大量并发场景。" },
  { company: "蔚来", role: "软件工程师", city: "上海", channel: "官网", salary: "22-30K·14薪", status: "rejected", priority: "low", applied: -33, reach: 6 },
  { company: "OPPO", role: "后端开发", city: "深圳", channel: "校招宣讲", salary: "22-30K·14薪", status: "rejected", priority: "low", applied: -26, reach: 4, notes: "笔试没过。" },
  { company: "大疆", role: "软件工程师", city: "深圳", channel: "官网", salary: "25-35K·15薪", status: "wishlist", priority: "high", applied: 0, next: 3, tags: ["机器人"], notes: "10 月 20 日截止，抓紧改简历。" },
  { company: "理想汽车", role: "智能驾驶后端", city: "北京", channel: "内推", salary: "26-36K·14薪", status: "wishlist", priority: "mid", applied: 0, next: 6 },
  { company: "蚂蚁集团", role: "研发工程师", city: "杭州", channel: "官网", salary: "28-42K·16薪", status: "wishlist", priority: "high", applied: 0, tags: ["转正机会"] },
  { company: "商汤科技", role: "后端开发", city: "上海", channel: "Boss直聘", salary: "20-28K·14薪", status: "withdrawn", priority: "low", applied: -22, reach: 5, notes: "已接其他 offer，主动放弃。" },
  // ↓ 本周新增，让「本周节奏」「投递周报」一打开就有内容
  { company: "得物", role: "服务端开发", city: "上海", channel: "Boss直聘", salary: "26-38K·15薪", status: "applied", priority: "mid", applied: 0, weekSlot: 0 },
  { company: "京东物流", role: "后端开发", city: "北京", channel: "官网", salary: "22-30K·15薪", status: "applied", priority: "low", applied: 0, weekSlot: 1 },
  { company: "网易雷火", role: "游戏服务端", city: "杭州", channel: "内推", salary: "24-34K·15薪", status: "written", priority: "mid", applied: 0, weekSlot: 2, advanced: true, next: 3 },
  { company: "中国电信", role: "软件开发", city: "南京", channel: "校招宣讲", salary: "18-25K·14薪", status: "applied", priority: "low", applied: 0, weekSlot: 3 },
]

export function seedApplications(): Application[] {
  const today = todayISO()
  // 本周一距今天几天；用来把 weekSlot 数据钉在本周内
  const mondayOffset = (new Date().getDay() + 6) % 7
  return ROWS.map((r) => {
    const appliedAt =
      r.weekSlot !== undefined
        ? addDays(today, -(r.weekSlot % (mondayOffset + 1)))
        : r.applied === 0
          ? ""
          : addDays(today, r.applied)
    const timeline: Application["timeline"] = []
    if (appliedAt) {
      timeline.push({ id: uid(), at: appliedAt, type: "applied", note: `通过${r.channel}投递` })
    }
    if (r.advanced && appliedAt) {
      timeline.push({ id: uid(), at: today, type: "written", note: "收到笔试邀请" })
    }
    if (r.reach && appliedAt) {
      const stages: Status[] = ["written", "interview"]
      const reached = r.status === "offer" ? 3 : r.status === "rejected" ? (r.reach > 12 ? 2 : 1) : 0
      for (let i = 0; i < reached && i < stages.length; i++) {
        timeline.push({
          id: uid(),
          at: addDays(appliedAt, 4 + i * 6),
          type: stages[i] as EventType,
          note: stages[i] === "written" ? "收到笔试邀请" : "进入面试环节",
        })
      }
    }
    if (r.status === "offer" && appliedAt) {
      timeline.push({ id: uid(), at: addDays(appliedAt, r.reach ?? 20), type: "offer", note: "收到正式 offer" })
    }
    if (r.status === "rejected" && appliedAt) {
      timeline.push({ id: uid(), at: addDays(appliedAt, r.reach ?? 10), type: "rejected", note: "流程结束" })
    }

    return {
      id: uid(),
      company: r.company,
      role: r.role,
      city: r.city,
      channel: r.channel,
      salary: r.salary,
      status: r.status,
      priority: r.priority,
      appliedAt,
      nextAt: r.next ? addDays(today, r.next) : "",
      jdLink: "",
      notes: r.notes ?? "",
      tags: r.tags ?? [],
      timeline,
      updatedAt: appliedAt || today,
    }
  })
}

export function seedInternship(): InternshipLog[] {  const today = todayISO()
  const rows: Array<Partial<InternshipLog> & { date: string; did: string }> = [
    {
      date: addDays(today, -1),
      project: "商家后台 · 订单导出重构",
      did: "把订单导出从同步改成异步任务，重写了任务表和失败重试逻辑。",
      problem: "导出 10 万行时接口超时，前端直接 502。",
      solution: "改成异步入队 + 分片拉取，加了一个失败重试队列，把导出结果落到 OSS 再给下载链接。",
      metric: "导出耗时从 90s 降到 12s，超时率从 8% 降到 0.3%",
      skills: ["Java", "项目推进", "SQL"],
      mood: 4,
    },
    {
      date: addDays(today, -2),
      project: "商家后台 · 订单导出重构",
      did: "调研现有导出链路，画了时序图，和产品确认了导出字段范围。",
      problem: "字段口径和产品理解的清单不一致，来回改了两版。",
      solution: "拉了个会对齐字段，把口径写进接口文档，后续按文档走。",
      metric: "",
      skills: ["需求分析", "文档沉淀", "跨部门沟通"],
      mood: 3,
    },
    {
      date: addDays(today, -4),
      project: "数据看板 · 埋点补全",
      did: "补齐了结算页 12 个埋点，接入了公司统一埋点 SDK。",
      problem: "历史埋点有 3 个事件名重复定义，导致看板数据口径混乱。",
      solution: "梳理了事件字典，把重复的合并，加了一版校验规则。",
      metric: "看板数据准确率从 82% 提升到 97%",
      skills: ["埋点", "数据分析"],
      mood: 5,
    },
    {
      date: addDays(today, -6),
      project: "新人上手",
      did: "读完团队的服务架构文档，本地跑通了商家后台全链路。",
      problem: "本地环境依赖的中间件版本和线上不一致。",
      solution: "用 docker-compose 补齐依赖，写了份本地启动说明给下一个新人。",
      metric: "",
      skills: ["文档沉淀"],
      mood: 3,
    },
  ]
  return rows.map((r) => ({
    id: uid(),
    date: r.date,
    project: r.project ?? "",
    did: r.did,
    problem: r.problem ?? "",
    solution: r.solution ?? "",
    metric: r.metric ?? "",
    skills: r.skills ?? [],
    mood: (r.mood ?? 3) as InternshipLog["mood"],
    createdAt: r.date,
  }))
}

/** 演示素材库：手写 STAR，挂在对应的演示日报上，让素材库/JD 匹配一打开就有内容。 */
const HIGHLIGHT_SPEC: Array<{
  match: string
  title: string
  task: string
  action: string
  result: string
}> = [
  {
    match: "异步任务",
    title: "订单导出重构：90s → 12s",
    task: "把订单导出从同步改成异步，解决大批量导出接口超时",
    action:
      "分片拉取 + 任务表状态机记录进度，加失败重试队列；导出结果落 OSS，前端拿带签名的下载链接",
    result: "导出耗时 90s → 12s，超时率 8% → 0.3%，支撑日均 2 万次导出",
  },
  {
    match: "埋点 SDK",
    title: "结算页埋点补全：准确率 82% → 97%",
    task: "结算页转化数据不可信，业务方不敢用来做决策",
    action: "先和数据分析对齐口径，补齐 12 个埋点并接入统一 SDK，加两条口径校验规则",
    result: "埋点准确率 82% → 97%，看板数据与财务对账一致，成为结算改版的决策依据",
  },
  {
    match: "时序图",
    title: "导出字段口径对齐：下游返工 3 次 → 0 次",
    task: "导出字段反复变更，下游反复返工",
    action: "画时序图梳理全链路，拉产品与财务逐字段确认导出范围，产出字段字典",
    result: "需求评审一次通过，下游返工从 3 次降到 0 次",
  },
  {
    match: "服务架构文档",
    title: "新人上手：独立排障 3 天 → 1 天",
    task: "刚入职时不熟悉系统，排查问题依赖别人",
    action: "读完服务架构文档，本地跑通商家后台全链路，补了一份环境搭建踩坑记录",
    result: "独立排查线上问题的时间从 3 天缩短到 1 天，踩坑记录被组内两人复用",
  },
]

export function seedHighlights(logs: InternshipLog[]): Highlight[] {
  return HIGHLIGHT_SPEC.flatMap((spec) => {
    const log = logs.find((l) => l.did.includes(spec.match) || l.project.includes(spec.match))
    if (!log) return []
    const d = draftFromLog(log)
    const star = {
      title: spec.title,
      situation: d.situation,
      task: spec.task,
      action: spec.action,
      result: spec.result,
    }
    return [
      {
        id: uid(),
        logId: log.id,
        date: log.date,
        ...star,
        score: scoreHighlight(star),
        used: false,
        createdAt: log.date,
      },
    ]
  })
}

/* ============================ 面试训练 ============================ */

type QSeed = {
  q: string
  category: string
  company?: string
  role?: string
  difficulty: number
  mastery: MasteryLevel
  answer?: string
  better?: string
  tags?: string[]
  source?: string
  /** 相对今天的到期偏移，负数表示已到期 */
  due?: number
}

const QUESTION_SEEDS: QSeed[] = [
  {
    q: "说说你们项目里订单导出的整体链路，为什么要异步化？",
    category: "项目深挖", company: "字节跳动", role: "后端开发", difficulty: 3, mastery: 3,
    answer: "同步导出在 10 万行时接口超时，前端 502。改成异步入队 + 分片拉取，结果落 OSS 给下载链接。",
    better: "先讲清同步方案的瓶颈到底在哪（是 DB 扫描、序列化还是 HTTP 超时），再说异步带来的新问题（任务状态、失败重试、结果存储），最后给取舍。",
    tags: ["订单导出", "Java", "异步"], source: "复盘",
  },
  {
    q: "异步任务失败了怎么保证不丢？重试怎么防重复消费？",
    category: "项目深挖", company: "字节跳动", role: "后端开发", difficulty: 4, mastery: 2,
    answer: "加了失败重试队列。",
    better: "三个层面答：①任务持久化落表，状态机明确；②重试用指数退避 + 最大次数，超限进死信；③幂等靠业务唯一键 + 去重表，而不是靠消息不重复投递。",
    tags: ["异步", "幂等", "可靠性"], source: "复盘", due: -2,
  },
  {
    q: "Java 里 HashMap 扩容为什么容量是 2 的幂？",
    category: "八股基础", difficulty: 2, mastery: 3,
    answer: "为了用 (n-1) & hash 代替取模，位运算更快；而且扩容时元素要么留在原位要么移到 oldCap 位置，不用重新计算 hash。",
    better: "补一句：这也是为什么 hash 要扰动高低位——否则低位相同的 key 会全撞在一个桶里。",
    tags: ["Java", "集合"], source: "面经",
  },
  {
    q: "synchronized 和 ReentrantLock 的区别，什么时候用哪个？",
    category: "八股基础", difficulty: 3, mastery: 2,
    answer: "synchronized 是关键字，自动释放；ReentrantLock 手动 lock/unlock，支持公平锁、可中断、条件变量。",
    better: "补上锁升级过程（偏向锁→轻量级→重量级）和 AQS 的实现思路，面试官通常接着问这里。",
    tags: ["Java", "并发"], source: "面经", due: -5,
  },
  {
    q: "MySQL 索引失效的场景有哪些？",
    category: "八股基础", difficulty: 3, mastery: 2,
    answer: "前导模糊、隐式类型转换、对索引列做运算、or 连接非索引列、不满足最左前缀。",
    better: "举一个自己项目里真实遇到的例子，比背清单更有说服力。",
    tags: ["MySQL", "索引"], source: "面经",
  },
  {
    q: "手撕：合并 K 个有序链表",
    category: "算法手撕", difficulty: 3, mastery: 1,
    answer: "只会两两合并，复杂度 O(KN)。",
    better: "优先队列（小顶堆）O(N log K)，或分治两两合并。要能说清为什么不用逐次合并。",
    tags: ["算法", "堆"], source: "自录", due: -1,
  },
  {
    q: "手撕：实现 LRU 缓存",
    category: "算法手撕", difficulty: 3, mastery: 2,
    answer: "HashMap + 双向链表，get/put 都是 O(1)。",
    better: "注意边界：capacity=0、重复 put 已有 key 要更新值并移到头部。写之前先问清线程安全要求。",
    tags: ["算法", "设计"], source: "自录",
  },
  {
    q: "设计一个短链服务，要注意什么？",
    category: "系统设计", difficulty: 4, mastery: 1,
    answer: "发号器 + Base62，存 KV。",
    better: "按四步答：①容量估算（QPS、存储、缓存命中率）；②发号方案对比（自增/雪花/随机+查重）；③读多写少怎么缓存、缓存穿透怎么办；④过期与回收策略。",
    tags: ["系统设计"], source: "面经", due: -3,
  },
  {
    q: "讲一个你最有成就感的项目，你在其中做了什么？",
    category: "行为面", difficulty: 2, mastery: 3,
    answer: "订单导出重构，耗时 90s 降到 12s。",
    better: "用 STAR，但重点放在「你个人的判断」上——哪个决策是你做的，而不是团队做的。",
    tags: ["行为", "STAR"], source: "自录",
  },
  {
    q: "你为什么选后端而不是算法？",
    category: "行为面", difficulty: 1, mastery: 2,
    answer: "更喜欢工程落地，能看到东西跑起来。",
    better: "给一个具体证据：比如实习里主动接过哪个工程活、做完之后的感受。别只说偏好。",
    tags: ["行为"], source: "自录",
  },
  {
    q: "你最大的缺点是什么？",
    category: "行为面", difficulty: 2, mastery: 1,
    answer: "有时候太追求细节。",
    better: "这个答案面试官听了一百遍。换一个真实的、且你正在改的，并说清改进动作和效果。",
    tags: ["行为"], source: "面经", due: -6,
  },
  {
    q: "如果订单量再涨 10 倍，你的导出方案要怎么改？",
    category: "项目深挖", company: "字节跳动", difficulty: 5, mastery: 0,
    answer: "",
    better: "找瓶颈点：分片拉取的 DB 压力、OSS 写入带宽、任务调度的并发上限。逐个说扩法和代价。",
    tags: ["容量", "订单导出"], source: "复盘", due: -1,
  },
  {
    q: "你有什么想问我们的？",
    category: "反问环节", difficulty: 1, mastery: 3,
    answer: "问团队的技术栈和新人培养。",
    better: "准备三个层次的问题：业务（这条线在公司的位置）、团队（新人前三个月做什么）、技术（现在最头疼的技术问题是什么）。",
    tags: ["反问"], source: "自录",
  },
]

export function seedQuestions(): InterviewQuestion[] {
  const today = todayISO()
  return QUESTION_SEEDS.map((s) => ({
    id: uid(),
    question: s.q,
    category: s.category,
    company: s.company ?? "",
    role: s.role ?? "",
    difficulty: s.difficulty,
    answer: s.answer ?? "",
    better: s.better ?? "",
    tags: s.tags ?? [],
    source: s.source ?? "自录",
    mastery: s.mastery,
    // 只有显式标了 due 的才算到期；其余按掌握度排到未来，否则「待复习」会等于题库总量
    reviewAt: s.due !== undefined ? addDays(today, s.due) : nextReviewDate(s.mastery, today),
    reviewCount: 0,
    createdAt: addDays(today, -20),
    updatedAt: addDays(today, -3),
  }))
}

export function seedRounds(): InterviewRound[] {
  const today = todayISO()
  return [
    {
      id: uid(),
      company: "字节跳动",
      role: "后端开发工程师",
      round: "一面",
      date: addDays(today, -30),
      format: "线上视频",
      duration: 62,
      questions: [
        "自我介绍",
        "订单导出链路，为什么异步化",
        "异步任务失败怎么保证不丢",
        "HashMap 扩容为什么是 2 的幂",
        "手撕：合并 K 个有序链表",
        "你有什么想问的",
      ].join("\n"),
      selfRating: 4,
      wentWell: "项目部分讲得很顺，导出的取舍能说清数字来源。",
      wentWrong: "手撕题只写出了两两合并，没主动提优先队列。",
      nextTime: "面试前把高频手撕题过一遍，写之前先说出思路和复杂度。",
      result: "通过",
      createdAt: addDays(today, -30),
    },
    {
      id: uid(),
      company: "米哈游",
      role: "服务端开发",
      round: "二面",
      date: addDays(today, -15),
      format: "线上视频",
      duration: 55,
      questions: [
        "并发场景下你怎么保证数据一致",
        "synchronized 和 ReentrantLock 区别",
        "分布式锁怎么实现",
        "你们线上 QPS 多少，怎么压测的",
      ].join("\n"),
      selfRating: 2,
      wentWell: "态度坦诚，不会的直接说了不会。",
      wentWrong: "并发这块答得很虚，分布式锁只说得出 Redis，说不出 Redlock 的问题和续期。",
      nextTime: "补并发专题：AQS、锁升级、分布式锁的失效场景。用自己项目里的场景串起来背。",
      result: "挂",
      createdAt: addDays(today, -15),
    },
    {
      id: uid(),
      company: "腾讯",
      role: "后台开发（IEG）",
      round: "一面",
      date: addDays(today, -8),
      format: "线上视频",
      duration: 50,
      questions: [
        "自我介绍",
        "埋点数据准确性怎么保证的",
        "MySQL 索引失效场景",
        "手撕：LRU 缓存",
        "反问",
      ].join("\n"),
      selfRating: 4,
      wentWell: "埋点那题有真实数据（准确率 82%→97%），面试官明显有兴趣。",
      wentWrong: "LRU 写完忘了处理 capacity=0 的边界。",
      nextTime: "手撕题写完自己先跑几个边界用例再交。",
      result: "通过",
      createdAt: addDays(today, -8),
    },
  ]
}

/* ============================ 职业成长 ============================ */

export function seedSkills(): Skill[] {
  const today = todayISO()
  const rows: Array<[string, string, number, number]> = [
    ["Java", "编程语言", 4, 5],
    ["SQL", "数据能力", 3, 4],
    ["数据分析", "数据能力", 2, 4],
    ["埋点", "数据能力", 3, 4],
    ["项目推进", "协作沟通", 3, 4],
    ["跨部门沟通", "协作沟通", 3, 4],
    ["文档沉淀", "协作沟通", 4, 4],
    ["需求分析", "业务理解", 3, 4],
    ["并发编程", "工程能力", 2, 5],
    ["分布式", "工程能力", 1, 4],
  ]
  return rows.map(([name, category, level, target]) => ({
    id: uid(),
    name,
    category,
    level,
    target,
    updatedAt: today,
  }))
}

export function seedGoals(): GoalItem[] {
  const today = todayISO()
  const rows: Array<Partial<GoalItem> & { title: string }> = [
    {
      title: "秋招拿到 3 个可比较的 Offer",
      horizon: "3m",
      detail: "不用是最好的，但要有得选。有得选才能谈。",
      autoMetric: "offers",
      autoTarget: 3,
      dueAt: addDays(today, 75),
    },
    {
      title: "题库积累到 80 题，项目深挖类全部到「经得住追问」",
      horizon: "3m",
      detail: "重点不是题量，是每道题能不能扛住三层追问。",
      autoMetric: "questions",
      autoTarget: 80,
      dueAt: addDays(today, 75),
    },
    {
      title: "补上并发与分布式两个知识缺口",
      horizon: "3m",
      detail: "米哈游二面挂在这里。用自己项目的场景串起来学，别背八股。",
      progress: 30,
      dueAt: addDays(today, 60),
    },
    {
      title: "实习转正，拿到 return offer",
      horizon: "1y",
      detail: "转正的关键是让 mentor 在评审会上有话可说——靠的就是日报沉淀的那些量化结果。",
      progress: 45,
      dueAt: addDays(today, 240),
    },
    {
      title: "独立负责一个完整的服务模块",
      horizon: "3y",
      detail: "从需求评审到上线运维全流程自己扛，而不是只写需求文档里的那部分。",
      progress: 15,
    },
  ]
  return rows.map((r) => ({
    id: uid(),
    title: r.title,
    horizon: r.horizon ?? "3m",
    detail: r.detail ?? "",
    progress: r.progress ?? 0,
    done: false,
    dueAt: r.dueAt ?? "",
    autoMetric: r.autoMetric ?? "",
    autoTarget: r.autoTarget ?? 0,
    createdAt: today,
  }))
}
