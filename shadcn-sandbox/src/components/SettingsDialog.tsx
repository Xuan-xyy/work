import { useState } from "react"
import { Download, RotateCcw, Trash2, Upload } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { STORAGE_KEY } from "@/lib/constants"
import { download } from "@/lib/csv"
import { actions, useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import type { ThemeMode } from "@/lib/types"

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const db = useDB()
  const [confirmClear, setConfirmClear] = useState(false)

  const stats = [
    { label: "投递记录", value: db.applications.length },
    { label: "实习日报", value: db.internship.length },
    { label: "简历亮点", value: db.highlights.length },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setConfirmClear(false)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>设置与数据</DialogTitle>
          <DialogDescription>所有数据只存在这台电脑的浏览器里，不会上传到任何服务器。</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-medium">个人信息</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="称呼">
                <Input
                  value={db.profile.name}
                  onChange={(e) => actions.setProfile({ name: e.target.value })}
                  placeholder="User"
                />
              </Field>
              <Field label="目标岗位">
                <Input
                  value={db.profile.target}
                  onChange={(e) => actions.setProfile({ target: e.target.value })}
                  placeholder="后端开发"
                />
              </Field>
              <Field label="学校">
                <Input
                  value={db.profile.school}
                  onChange={(e) => actions.setProfile({ school: e.target.value })}
                />
              </Field>
              <Field label="毕业年份">
                <Input
                  value={db.profile.gradYear}
                  onChange={(e) => actions.setProfile({ gradYear: e.target.value })}
                  placeholder="2027"
                />
              </Field>
            </div>
          </div>

          <Separator />

          <Field label="主题">
            <Select value={db.theme} onValueChange={(v) => actions.setTheme(v as ThemeMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
                <SelectItem value="auto">跟随系统</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium">数据</p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              {stats.map((s) => (
                <span key={s.label} className="rounded-md bg-muted px-2 py-1">
                  {s.label} {s.value}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  download(
                    `秋招工作台备份-${new Date().toISOString().slice(0, 10)}.json`,
                    actions.exportJSON(),
                    "application/json",
                  )
                  toast("备份已下载")
                }}
              >
                <Download className="size-3.5" />
                导出备份
              </Button>

              <label className="inline-flex">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const r = actions.importJSON(await f.text())
                    toast(r.message, r.ok ? "ok" : "error")
                  }}
                />
                <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
                  <Upload className="size-3.5" />
                  恢复备份
                </span>
              </label>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  actions.loadDemo()
                  toast("已载入演示数据")
                }}
              >
                <RotateCcw className="size-3.5" />
                载入演示数据
              </Button>
            </div>

            {confirmClear ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
                <p className="flex-1 text-xs">确定清空所有投递、日报与亮点？此操作不可撤销。</p>
                <Button variant="outline" size="xs" onClick={() => setConfirmClear(false)}>
                  取消
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => {
                    actions.clearAll()
                    setConfirmClear(false)
                    toast("已清空", "warn")
                  }}
                >
                  确认清空
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="size-3.5" />
                清空所有数据
              </Button>
            )}

            <p className="text-[11px] text-muted-foreground">
              存储位置：localStorage · <code className="rounded bg-muted px-1">{STORAGE_KEY}</code>
              <br />
              与旧版零构建工作台共用同一份数据，两边打开看到的是同一套记录。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
