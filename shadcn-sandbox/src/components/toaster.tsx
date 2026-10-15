import { useSyncExternalStore } from "react"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { dismissToast, getToasts, subscribeToasts } from "@/lib/toast"

const ICONS = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
} as const

const TONE = {
  ok: "text-foreground",
  warn: "text-amber-800 dark:text-amber-200",
  error: "text-rose-800 dark:text-rose-200",
} as const

export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  if (!items.length) return null
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      {items.map((t) => {
        const Icon = ICONS[t.tone]
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismissToast(t.id)}
            className={cn(
              "glass pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 text-left text-xs",
              TONE[t.tone],
            )}
          >
            <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">{t.message}</span>
          </button>
        )
      })}
    </div>
  )
}
