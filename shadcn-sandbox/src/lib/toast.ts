export type ToastTone = "ok" | "warn" | "error"

export type ToastItem = {
  id: string
  message: string
  tone: ToastTone
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

export function toast(message: string, tone: ToastTone = "ok"): void {
  const id = Math.random().toString(36).slice(2, 9)
  items = [...items, { id, message, tone }]
  emit()
  setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 3200)
}

export function dismissToast(id: string): void {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts(): ToastItem[] {
  return items
}
