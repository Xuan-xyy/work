import { useEffect, useState } from "react"

import { Field } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CHANNELS, CITIES, PRIORITIES, STATUS, STATUS_ORDER } from "@/lib/constants"
import { todayISO } from "@/lib/format"
import { actions } from "@/lib/store"
import type { Application, Priority, Status } from "@/lib/types"

type Draft = {
  company: string
  role: string
  city: string
  channel: string
  salary: string
  status: Status
  priority: Priority
  appliedAt: string
  nextAt: string
  jdLink: string
  tags: string
  notes: string
}

const EMPTY: Draft = {
  company: "",
  role: "",
  city: "",
  channel: CHANNELS[0],
  salary: "",
  status: "wishlist",
  priority: "mid",
  appliedAt: todayISO(),
  nextAt: "",
  jdLink: "",
  tags: "",
  notes: "",
}

function toDraft(a: Application): Draft {
  return {
    company: a.company,
    role: a.role,
    city: a.city,
    channel: a.channel,
    salary: a.salary,
    status: a.status,
    priority: a.priority,
    appliedAt: a.appliedAt,
    nextAt: a.nextAt,
    jdLink: a.jdLink,
    tags: a.tags.join(" "),
    notes: a.notes,
  }
}

export function EditorSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: Application | null
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setDraft(initial ? toDraft(initial) : EMPTY)
      setError("")
    }
  }, [open, initial])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const submit = () => {
    if (!draft.company.trim()) {
      setError("公司名不能为空")
      return
    }
    const payload = {
      company: draft.company.trim(),
      role: draft.role.trim(),
      city: draft.city.trim(),
      channel: draft.channel,
      salary: draft.salary.trim(),
      status: draft.status,
      priority: draft.priority,
      appliedAt: draft.appliedAt,
      nextAt: draft.nextAt,
      jdLink: draft.jdLink.trim(),
      tags: draft.tags.split(/[\s,，]+/).filter(Boolean),
      notes: draft.notes.trim(),
    }
    if (initial) actions.updateApplication(initial.id, payload)
    else actions.addApplication(payload)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{initial ? "编辑投递记录" : "新增投递记录"}</SheetTitle>
          <SheetDescription>
            阶段变化会自动写入时间线，漏斗统计依赖这条时间线回溯最远深度。
          </SheetDescription>
        </SheetHeader>

        <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto px-4">
          <div className="col-span-2">
            <Field label="公司 *">
              <Input
                value={draft.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="如：字节跳动"
                autoFocus
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="岗位">
              <Input
                value={draft.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="如：后端开发工程师"
              />
            </Field>
          </div>

          <Field label="城市">
            <Input
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="北京"
              list="city-options"
            />
            <datalist id="city-options">
              {CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="投递渠道">
            <Select value={draft.channel} onValueChange={(v) => set("channel", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="当前阶段">
            <Select value={draft.status} onValueChange={(v) => set("status", v as Status)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="优先级">
            <Select value={draft.priority} onValueChange={(v) => set("priority", v as Priority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="投递日期">
            <Input type="date" value={draft.appliedAt} onChange={(e) => set("appliedAt", e.target.value)} />
          </Field>
          <Field label="下一步时间" hint="用于「今日聚焦」和逾期提醒">
            <Input type="date" value={draft.nextAt} onChange={(e) => set("nextAt", e.target.value)} />
          </Field>

          <div className="col-span-2">
            <Field label="薪资范围">
              <Input
                value={draft.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="如：25-35K·15薪"
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="JD 链接">
              <Input
                value={draft.jdLink}
                onChange={(e) => set("jdLink", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="标签" hint="空格或逗号分隔">
              <Input
                value={draft.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="Java 基础架构"
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="备注">
              <Textarea
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="面试问了什么、HR 怎么说的、下次注意什么"
              />
            </Field>
          </div>
        </div>

        <SheetFooter className="border-t border-border">
          {error && <p className="mr-auto text-xs text-destructive">{error}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>{initial ? "保存" : "添加"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
