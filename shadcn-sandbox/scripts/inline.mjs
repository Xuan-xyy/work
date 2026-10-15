/**
 * 把 dist-single 的 HTML + CSS + JS 合成一个自包含的单文件 HTML。
 *
 * Vite 没有内置「把所有东西塞进一个 html」的能力（assetsInlineLimit 只作用于
 * 被引用的静态资源，不作用于入口 chunk 本身），所以这里做一个最小的后处理。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const dist = join(root, "dist-single")
const target = resolve(process.argv[2] ?? join(root, "..", "秋招工作台.html"))

const html = await readFile(join(dist, "index.html"), "utf8")
const js = await readFile(join(dist, "app.js"), "utf8")
const css = await readFile(join(dist, "app.css"), "utf8")

// 内联进 <script>/<style> 的内容里若出现结束标签会提前截断，先转义掉。
const safeJs = js.replace(/<\/script/gi, "<\\/script")
const safeCss = css.replace(/<\/style/gi, "<\\/style")

// 用函数式 replace，避免 JS 里的 $& / $' 被当成替换模式。
let out = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, () => `<style>\n${safeCss}\n</style>`)

// 关键：入口脚本必须挪到 </body> 之前。
// Vite 把它放在 <head> 里并带上 type="module"（模块脚本默认 defer，所以等 DOM 就绪才跑）；
// 内联成普通 <script> 后 defer 失效，会在 <head> 阶段立即执行，
// 那时 #root 还不存在，React 挂载失败 —— 表现为双击打开一片白屏。
const scriptTagRe = /<script[^>]*src="[^"]*app\.js"[^>]*>\s*<\/script>/i
if (!scriptTagRe.test(out)) {
  console.error("单文件化失败：没找到入口 <script src=app.js>")
  process.exit(1)
}
out = out.replace(scriptTagRe, "")
if (!/<\/body>/i.test(out)) {
  console.error("单文件化失败：HTML 里没有 </body>")
  process.exit(1)
}
out = out.replace(/<\/body>/i, () => `<script>\n${safeJs}\n</script>\n  </body>`)

const leftover = out.match(/<(script|link)[^>]*(src|href)=/gi)
if (leftover) {
  console.error("单文件化失败，仍有外部引用：", leftover)
  process.exit(1)
}
const scriptAt = out.indexOf("<script>")
const rootAt = out.indexOf('id="root"')
if (rootAt < 0 || scriptAt < rootAt) {
  console.error(`单文件化失败：脚本(${scriptAt}) 必须排在 #root(${rootAt}) 之后`)
  process.exit(1)
}

await mkdir(dirname(target), { recursive: true })
await writeFile(target, out, "utf8")

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
console.log(`单文件已生成：${target}`)
console.log(`  合计 ${kb(Buffer.byteLength(out))}（内联 JS ${kb(Buffer.byteLength(js))} + CSS ${kb(Buffer.byteLength(css))}）`)
console.log("  外部引用：0 —— 可直接双击打开")
