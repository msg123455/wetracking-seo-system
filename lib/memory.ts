import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

const DEFAULT: Record<string, any> = {
  keywords: [],
  pages: [],
  clusters: [],
  sitemap_strategy: [],
  pending_approval: [],
  published: [],
  last_updated: "",
}

export function readMemory(): typeof DEFAULT {
  try {
    if (!fs.existsSync(memoryPath)) {
      const dir = path.dirname(memoryPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(memoryPath, JSON.stringify(DEFAULT, null, 2))
      return { ...DEFAULT }
    }
    const raw = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
    // ensure all keys exist (backward compat)
    return { ...DEFAULT, ...raw }
  } catch {
    return { ...DEFAULT }
  }
}

export function writeMemory(data: any): void {
  try {
    const dir = path.dirname(memoryPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error("writeMemory error:", e)
    throw e
  }
}
