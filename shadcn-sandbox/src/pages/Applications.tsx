import { useMemo, useState } from "react"
import { Download, Plus, Search, Upload } from "lucide-react"

import { Board } from "@/components/applications/Board"
import { DetailSheet } from "@/components/applications/DetailSheet"
import { EditorSheet } from "@/components/applications/EditorSheet"
import { ImportDialog } from "@/components/applications/ImportDialog"
import { OfferCompare } from "@/components/applications/OfferCompare"
import { Table } from "@/components/applications/Table"
import { WeeklyReport } from "@/components/applications/WeeklyReport"
import { Empty, PageHeader } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { followUps } from "@/lib/analytics"
import { CHANNELS, PRIORITIES, STATUS, STATUS_ORDER } from "@/lib/constants"
import { download, stringifyRows } from "@/lib/csv"
import { useHashRoute, navigate, withQuery } from "@/lib/router"
import { useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import type { Application, Status } from "@/lib/types"

export function Applications() {
  const db = useDB()
  const route = useHashRoute()
  const view = route.query.get("view") ?? "board"
  const filter = route.query.get("filter") ?? ""
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<Status | "all">("all")
  const [channel, setChannel] = useState<string>("all")
  const [priority, setPriority] = useState<string>("all")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Application | null>(null)
  const [detail, setDetail] = useState<Application | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const followIds = useMemo(() => new Set(followUps(db.applications).map((a) => a.id)), [db.applications])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return db.applications.filter((a) => {
      if (filter === "followup" && !followIds.has(a.id)) return false
      if (status !== "all" && a.status !== status) return false
      if (channel !== "all" && a.channel !== channel) return false
      if (priority !== "all" && a.priority !== priority) return false
      if (kw) {
        const hay = [a.company, a.role, a.city, a.channel, a.notes, a.tags.join(" ")].join(" ").toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [db.applications, q, status, channel, priority, filter, followIds])

  const exportCSV = () => {
    const header = [
      "公司", "岗位", "城市", "投递渠道", "薪资", "当前阶段", "优先级",
      "投递日期", "下一步时间", "标签", "备注",
    ]
    const body = filtered.map((a) => [
      a.company, a.role, a.city, a.channel, a.salary,
      STATUS[a.status].label,
      PRIORITIES.find((p) => p.id === a.priority)?.label ?? a.priority,
      a.appliedAt, a.nextAt, a.tags.join(" "), a.notes,
    ])
    download(`投递记录-${new Date().toISOString().slice(0, 10)}.csv`, stringifyRows([header, ...body]))
    toast(`已导出 ${filtered.length} 条记录`)
  }

  const openNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="求职管理"
        description={`共 ${db.applications.length} 条记录，当前筛选出 ${filtered.length} 条`}
        action={
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="size-3.5" />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="size-3.5" />
              导出
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="size-3.5" />
              新增
            </Button>
          </div>
        }
      />

      <Tabs
        value={view}
        onValueChange={(v) => {
          navigate(withQuery("/applications", { view: v, filter: filter || null }))
        }}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="board">看板</TabsTrigger>
            <TabsTrigger value="table">表格</TabsTrigger>
            <TabsTrigger value="offers">Offer 决策对比</TabsTrigger>
            <TabsTrigger value="weekly">投递周报</TabsTrigger>
          </TabsList>

          {(view === "board" || view === "table") && (
            <>
              <div className="relative min-w-44 flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索公司 / 岗位 / 备注"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部阶段</SelectItem>
                  {STATUS_ORDER.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS[st].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部渠道</SelectItem>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger size="sm" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filter === "followup" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(withQuery("/applications", { view, filter: null }))}
                >
                  只看待跟进 ×
                </Button>
              )}
            </>
          )}
        </div>

        <TabsContent value="board">
          {filtered.length === 0 ? (
            <Empty
              title="没有符合条件的记录"
              description="换个筛选条件，或者新增一条投递记录。"
              action={
                <Button size="sm" onClick={openNew}>
                  新增记录
                </Button>
              }
            />
          ) : (
            <Board apps={filtered} onOpen={setDetail} />
          )}
        </TabsContent>

        <TabsContent value="table">
          <Table apps={filtered} onOpen={setDetail} />
        </TabsContent>

        <TabsContent value="offers">
          <OfferCompare />
        </TabsContent>

        <TabsContent value="weekly">
          <WeeklyReport
            onGoApplications={() => navigate(withQuery("/applications", { view: "table", filter: null }))}
          />
        </TabsContent>
      </Tabs>

      <EditorSheet open={editorOpen} onOpenChange={setEditorOpen} initial={editing} />
      <DetailSheet
        app={detail}
        open={Boolean(detail)}
        onOpenChange={(v) => {
          if (!v) setDetail(null)
        }}
        onEdit={(a) => {
          setDetail(null)
          setEditing(a)
          setEditorOpen(true)
        }}
      />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
