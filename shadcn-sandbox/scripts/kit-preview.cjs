/* ------------------------------------------------------------------
   把面试准备清单的真实产物写到 dist-kit/ 下，用来人工核对导出内容。

   为什么需要它：截图只能看到界面，看不到「导出/复制出去的那份 Markdown 长什么样」。
   而清单里的内容 bug（同一项目重复成卡片、软技能被当成技术问、层标题丢字）
   全都是在这一步才暴露出来的 —— 界面上看着都正常。

   用法：pnpm kit:preview
   ------------------------------------------------------------------ */
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const root = path.join(__dirname, "..")

/** 不写死版本号：esbuild 是 vite 的间接依赖，版本随 vite 升级而变。 */
function resolveEsbuild() {
  const pnpmDir = path.join(root, "node_modules/.pnpm")
  const entry = fs
    .readdirSync(pnpmDir)
    .filter((d) => d.startsWith("esbuild@"))
    .sort()
    .pop()
  if (!entry) throw new Error("在 node_modules/.pnpm 下找不到 esbuild")
  return path.join(pnpmDir, entry, "node_modules/esbuild/lib/main.js")
}

const esbuild = require(resolveEsbuild())

esbuild
  .build({
    entryPoints: [path.join(__dirname, "kit-preview.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: path.join(root, "dist-kit/.kit-preview.mjs"),
    alias: { "@": path.join(root, "src") },
    /* store.ts 顶层会碰 window / localStorage，Node 里得先把它们垫上 */
    banner: {
      js: [
        'globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {} };',
        'try { Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: { getItem() { return null }, setItem() {}, removeItem() {}, clear() {} } }); } catch {}',
      ].join("\n"),
    },
    logLevel: "warning",
  })
  .then(() => {
    /* Windows 上动态 import 绝对路径必须转成 file:// URL，直接给盘符路径会报 ESM loader 错误 */
    const out = path.join(root, "dist-kit/.kit-preview.mjs")
    return import(pathToFileURL(out).href)
  })
  .catch((err) => {
    console.error(err.message ?? err)
    process.exit(1)
  })
