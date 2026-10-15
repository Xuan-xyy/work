import { useMemo, useState } from "react"
import { FileUp, Upload } from "lucide-react"

import { Field } from "@/components/bits"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { parseRows, parseDateCell, type Row } from "@/lib/csv"
import { normalizeApp, actions } from "@/lib/store"
import { toast } from "@/lib/toast"
import type { Application, Priority, Status } from "@/lib/types"

type FieldKey =
  | "ignore"
  | "company"
  | "role"
  | "city"
  | "channel"
  | "salary"
  | "status"
  | "priority"
  | "appliedAt"
  | "nextAt"
  | "notes"

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: "ignore", label: "忽略此列" },
  { key: "company", label: "公司" },
  { key: "role", label: "岗位" },
  { key: "city", label: "城市" },
  { key: "channel", label: "投递渠道" },
  { key: "salary", label: "薪资" },
  { key: "status", label: "当前阶段" },
  { key: "priority", label: "优先级" },
  { key: "appliedAt", label: "投递日期" },
  { key: "nextAt", label: "下一步时间" },
  { key: "notes", label: "备注" },
]

const ALIASES: Record<string, FieldKey> = {
  公司: "company", 公司名称: "company", company: "company", 企业: "company",
  岗位: "role", 职位: "role", 应聘岗位: "role", role: "role", position: "role", 投递岗位: "role",
  城市: "city", 地点: "city", city: "city", 工作地点: "city", 地区: "city",
  渠道: "channel", 投递渠道: "channel", channel: "channel", 来源: "channel",
  薪资: "salary", 薪资范围: "salary", salary: "salary", 待遇: "salary",
  状态: "status", 阶段: "status", 当前阶段: "status", status: "status", 进度: "status",
  优先级: "priority", 重要度: "priority", priority: "priority",
  投递日期: "appliedAt", 投递时间: "appliedAt", 日期: "appliedAt", date: "appliedAt", applied: "appliedAt",
  下一步: "nextAt", 下一步时间: "nextAt", 跟进时间: "nextAt", next: "nextAt",
  备注: "notes", 说明: "notes", notes: "notes", note: "notes", 记录: "notes",
}

function guessField(header: string): FieldKey {
  const h = header.trim().toLowerCase().replace(/\s/g, "")
  return ALIASES[h] ?? ALIASES[header.trim()] ?? "ignore"
}

function parseStatusCell(raw: string): Status {
  const v = raw.trim()
  const map: Array<[RegExp, Status]> = [
    [/offer|已发|录用|通过/i, "offer"],
    [/面|面试/i, "interview"],
    [/笔|笔试|测评/i, "written"],
    [/已投|投递|申请/i, "applied"],
    [/想投|待投|收藏/i, "wishlist"],
    [/挂|拒|reject|未通过|感谢信/i, "rejected"],
    [/放弃|withdraw|已拒/i, "withdrawn"],
  ]
  for (const [re, s] of map) if (re.test(v)) return s
  return "wishlist"
}

function parsePriorityCell(raw: string): Priority {
  const v = raw.trim()
  if (/高|重点|急|high|1/i.test(v)) return "high"
  if (/低|保底|low|3/i.test(v)) return "low"
  return "mid"
}

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [step, setStep] = useState(1)
  const [text, setText] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [body, setBody] = useState<Row[]>([])
  const [mapping, setMapping] = useState<FieldKey[]>([])
  const [mode, setMode] = useState<"skip" | "update" | "all">("skip")

  const reset = () => {
    setStep(1)
    setText("")
    setHeaders([])
    setBody([])
    setMapping([])
    setMode("skip")
  }

  const parsed = useMemo(() => {
    const rows = parseRows(text)
    if (rows.length < 1) return { headers: [] as string[], body: [] as Row[] }
    return { headers: rows[0], body: rows.slice(1) }
  }, [text])

  const goMap = () => {
    if (!parsed.headers.length) {
      toast("没有解析到内容，请先粘贴或选择文件", "warn")
      return
    }
    setHeaders(parsed.headers)
    setBody(parsed.body)
    setMapping(parsed.headers.map(guessField))
    setStep(2)
  }

  const build = (): Application[] =>
    actionsBuild(body, mapping)

  const doImport = () => {
    const incoming = build()
    if (!incoming.length) {
      toast("没有可导入的有效行（公司列为空的行会被跳过）", "warn")
      return
    }
    const existing = actions.getApplications()
    const key = (a: Application) => `${a.company}::${a.role}`.toLowerCase()
    const index = new Map(existing.map((a) => [key(a), a]))
    const result: Application[] = [...existing]
    let added = 0
    let updated = 0
    let skipped = 0

    for (const row of incoming) {
      const hit = index.get(key(row))
      if (!hit) {
        result.push(row)
        index.set(key(row), row)
        added++
      } else if (mode === "skip") {
        skipped++
      } else if (mode === "update") {
        const i = result.findIndex((a) => a.id === hit.id)
        if (i >= 0) result[i] = { ...hit, id: hit.id }
        updated++
      } else {
        result.push(row)
        added++
      }
    }

    actions.replaceApplications(result)
    toast(`导入完成：新增 ${added} 条，更新 ${updated} 条，跳过重复 ${skipped} 条`)
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>导入投递记录</DialogTitle>
          <DialogDescription>
            第 {step} / 3 步 · 支持 CSV / TSV，直接复制 Excel 表格粘贴也能识别
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setText(await f.text())
                  }}
                />
                <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
                  <FileUp className="size-3.5" />
                  选择文件
                </span>
              </label>
              <span className="text-xs text-muted-foreground">或直接把表格内容粘贴到下面</span>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={"公司,岗位,城市,渠道,状态,投递日期\n字节跳动,后端开发,北京,官网,已投递,2026-10-01"}
              className="font-mono text-xs"
            />
            {parsed.headers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                已识别 {parsed.headers.length} 列、{parsed.body.length} 行数据
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="max-h-[52vh] space-y-2 overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              已自动匹配字段，请确认或修改（样例取自第一行数据）
            </p>
            {headers.map((h, i) => (
              <div key={`${h}-${i}`} className="grid grid-cols-[1.2fr_1fr_1.4fr] items-center gap-3">
                <span className="truncate text-xs font-medium" title={h}>
                  {h || `第 ${i + 1} 列`}
                </span>
                <Select
                  value={mapping[i] ?? "ignore"}
                  onValueChange={(v) =>
                    setMapping((m) => m.map((x, j) => (j === i ? (v as FieldKey) : x)))
                  }
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="truncate text-[11px] text-muted-foreground" title={body[0]?.[i] ?? ""}>
                  {body[0]?.[i] || "（空）"}
                </span>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3 text-xs">
              <p>
                将把 <span className="font-medium">{body.length}</span> 行按「公司 + 岗位」去重后写入，
                现有记录 <span className="font-medium">{actions.getApplications().length}</span> 条。
              </p>
            </div>
            <Field label="遇到重复记录时" hint="公司 + 岗位相同视为重复">
              <div className="flex gap-2">
                {([
                  ["skip", "跳过（保留我原有的）"],
                  ["update", "覆盖（用文件里的）"],
                  ["all", "都导入（允许重复）"],
                ] as const).map(([k, label]) => (
                  <Button
                    key={k}
                    variant={mode === k ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode(k)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Field>
            <div className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] text-muted-foreground">
              {build()
                .slice(0, 5)
                .map((a, i) => (
                  <div key={i}>
                    {a.company} · {a.role} · {a.status} · {a.appliedAt || "无日期"}
                  </div>
                ))}
              {body.length > 5 && <div>… 其余 {body.length - 5} 行</div>}
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              上一步
            </Button>
          )}
          {step === 1 && <Button onClick={goMap}>下一步</Button>}
          {step === 2 && <Button onClick={() => setStep(3)}>下一步</Button>}
          {step === 3 && (
            <Button onClick={doImport}>
              <Upload className="size-3.5" />
              开始导入
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function actionsBuild(body: Row[], mapping: FieldKey[]): Application[] {
  const out: Application[] = []
  for (const row of body) {
    const rec: Record<string, string> = {}
    mapping.forEach((key, i) => {
      if (key !== "ignore" && row[i] !== undefined) rec[key] = row[i].trim()
    })
    if (!rec.company) continue
    const app = normalizeApp({
      company: rec.company,
      role: rec.role ?? "",
      city: rec.city ?? "",
      channel: rec.channel ?? "",
      salary: rec.salary ?? "",
      status: rec.status ? parseStatusCell(rec.status) : "applied",
      priority: rec.priority ? parsePriorityCell(rec.priority) : "mid",
      appliedAt: rec.appliedAt ? parseDateCell(rec.appliedAt) : "",
      nextAt: rec.nextAt ? parseDateCell(rec.nextAt) : "",
      notes: rec.notes ?? "",
    })
    if (app && !app.timeline.length) {
      app.timeline = [{ id: Math.random().toString(36).slice(2), at: app.appliedAt || "", type: "created" }]
    }
    if (app) out.push(app)
  }
  return out
}
