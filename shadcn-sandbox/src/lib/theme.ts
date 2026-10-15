import { useEffect, useState } from "react"

import { navigate } from "./router"
import type { ThemeMode } from "./types"

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function useAppliedTheme(mode: ThemeMode): "light" | "dark" {
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const resolved: "light" | "dark" = mode === "auto" ? (systemDark ? "dark" : "light") : mode

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolved === "dark")
    root.style.colorScheme = resolved
  }, [resolved])

  return resolved
}

/** 全局快捷键：n 新建、/ 搜索、g 回面板。输入框内不触发。 */
export function useGlobalKeys(handlers: { onNew?: () => void; onSearch?: () => void; onHome?: () => void }): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "n") {
        e.preventDefault()
        handlers.onNew?.()
      } else if (e.key === "/") {
        e.preventDefault()
        handlers.onSearch?.()
      } else if (e.key === "g") {
        e.preventDefault()
        handlers.onHome?.()
        navigate("/dashboard")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handlers])
}
