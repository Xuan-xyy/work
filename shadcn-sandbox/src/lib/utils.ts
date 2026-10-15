import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * shadcn/ui 的类名合并工具。
 * 每一个 shadcn 生成的组件都会 `import { cn } from "@/lib/utils"`，
 * 所以这个文件必须存在、且必须导出名为 cn 的函数——否则组件无法编译。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
