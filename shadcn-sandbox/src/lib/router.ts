import { useEffect, useState } from "react"

export type Route = {
  path: string
  query: URLSearchParams
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/dashboard"
  const [path, qs] = raw.split("?")
  return { path: path || "/dashboard", query: new URLSearchParams(qs ?? "") }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener("hashchange", onChange)
    if (!window.location.hash) window.location.hash = "#/dashboard"
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return route
}

export function navigate(to: string): void {
  const next = to.startsWith("#") ? to : `#${to}`
  if (window.location.hash === next) return
  window.location.hash = next
}

/** 在当前路径上合并查询参数（用于表格/看板视图切换）。 */
export function withQuery(path: string, patch: Record<string, string | null>): string {
  const [p, qs] = path.split("?")
  const q = new URLSearchParams(qs ?? "")
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) q.delete(k)
    else q.set(k, v)
  }
  const s = q.toString()
  return s ? `${p}?${s}` : p
}
