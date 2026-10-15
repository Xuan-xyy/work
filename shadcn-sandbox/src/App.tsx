import { useCallback, useMemo, useState } from "react"
import { Info } from "lucide-react"

import { Sidebar, Topbar } from "@/components/shell"
import { SettingsDialog } from "@/components/SettingsDialog"
import { Toaster } from "@/components/toaster"
import { Button } from "@/components/ui/button"
import { Applications } from "@/pages/Applications"
import { Career } from "@/pages/Career"
import { Dashboard } from "@/pages/Dashboard"
import { Internship } from "@/pages/Internship"
import { Interview } from "@/pages/Interview"
import { Stories } from "@/pages/Stories"
import { sprintDay } from "@/lib/analytics"
import { navigate, useHashRoute } from "@/lib/router"
import { actions, useDB } from "@/lib/store"
import { toast } from "@/lib/toast"
import { useAppliedTheme, useGlobalKeys } from "@/lib/theme"

export default function App() {
  const db = useDB()
  const route = useHashRoute()
  useAppliedTheme(db.theme)

  const [quoteIndex, setQuoteIndex] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const offers = db.applications.filter((a) => a.status === "offer").length
  const sprint = useMemo(() => sprintDay(db.applications), [db.applications])

  const counts = useMemo(
    () => ({
      "/applications": db.applications.filter((a) => a.status === "interview").length,
      "/internship": db.internship.length,
      "/interview": db.questions.length,
      "/stories": db.highlights.length,
      "/career": db.skills.length,
    }),
    [db.applications, db.internship, db.highlights, db.questions, db.skills],
  )

  const onNew = useCallback(() => navigate("/applications?view=board"), [])
  const onSearch = useCallback(() => navigate("/applications?view=table"), [])
  const onHome = useCallback(() => navigate("/dashboard"), [])
  useGlobalKeys({ onNew, onSearch, onHome })

  let page: React.ReactNode
  switch (route.path) {
    case "/applications":
      page = <Applications />
      break
    case "/internship":
      page = <Internship />
      break
    case "/interview":
      page = <Interview />
      break
    case "/stories":
      page = <Stories />
      break
    case "/career":
      page = <Career />
      break
    default:
      page = <Dashboard />
  }

  return (
    <div className="flex h-screen gap-4 overflow-hidden p-4 text-foreground">
      <Sidebar
        path={route.path}
        theme={db.theme === "auto" ? "light" : db.theme}
        onTheme={() => actions.setTheme(db.theme === "dark" ? "light" : "dark")}
        onSettings={() => setSettingsOpen(true)}
        name={db.profile.name}
        target={db.profile.target}
        counts={counts}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Topbar
          name={db.profile.name}
          quoteIndex={quoteIndex}
          onQuote={() => setQuoteIndex((i) => i + 1)}
          sprintDays={sprint}
          offerCount={offers}
        />
        {db.seededDemo && (
          <div className="glass flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3">
            <Info className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} />
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              当前是演示数据（{db.applications.length} 家公司 · {db.internship.length} 条实习日报），
              用来让你先看清工作台长什么样。清空后就是你自己的秋招。
            </p>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                actions.clearAll()
                toast("已清空演示数据，从今天开始记录")
              }}
            >
              清空并开始记录
            </Button>
            <Button variant="ghost" size="xs" onClick={() => actions.dismissDemo()}>
              先留着
            </Button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto pr-1">
          <div className="mx-auto max-w-[1400px] pb-2">{page}</div>
        </main>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster />
    </div>
  )
}
