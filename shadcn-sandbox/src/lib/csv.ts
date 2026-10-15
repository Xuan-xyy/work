/** CSV / TSV 解析与序列化：引号感知、分隔符自动识别、兼容 Excel 序列号日期。 */

export type Row = string[]

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n")
  const counts: Array<[string, number]> = [
    [",", (head.match(/,/g) ?? []).length],
    ["\t", (head.match(/\t/g) ?? []).length],
    [";", (head.match(/;/g) ?? []).length],
  ]
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ","
}

/** 解析为二维数组，正确处理引号内的分隔符与换行。 */
export function parseRows(text: string, delimiter?: string): Row[] {
  const d = delimiter ?? detectDelimiter(text)
  const rows: Row[] = []
  let row: Row = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') {
      quoted = true
    } else if (ch === d) {
      row.push(cell)
      cell = ""
    } else if (ch === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (ch === "\r") {
      // 忽略，交给 \n
    } else {
      cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

export function stringifyRows(rows: Row[], delimiter = ","): string {
  const esc = (v: string) => {
    const s = v ?? ""
    return /["\n\r,;\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(esc).join(delimiter)).join("\r\n")
}

/** 把单元格文本解析成 ISO 日期：支持 YYYY-MM-DD、YYYY/M/D、10-15、Excel 序列号。 */
export function parseDateCell(raw: string): string {
  const v = (raw ?? "").trim()
  if (!v) return ""
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(v)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = /^(\d{1,2})[-/.](\d{1,2})$/.exec(v)
  if (m) return `${new Date().getFullYear()}-${pad(m[1])}-${pad(m[2])}`
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  if (/^\d{5}$/.test(v)) {
    // Excel 序列号：1899-12-30 起算
    const d = new Date(Date.UTC(1899, 11, 30) + Number(v) * 86400000)
    return isoUTC(d)
  }
  return ""
}

function pad(s: string): string {
  return String(Number(s)).padStart(2, "0")
}

function isoUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

export function download(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  // BOM 保证 Excel 打开中文不乱码
  const blob = new Blob(["\uFEFF" + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
