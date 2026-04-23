import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

export async function GET() {
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  return Response.json({
    strategy: memory.sitemap_strategy,
    published: memory.published.map((p: any) => ({
      url: `https://wetracking.co/${p.content.slug}`,
      keyword: p.keyword,
      lastmod: p.published_at,
      priority: p.page_type === "pillar" ? "0.9" : "0.7"
    }))
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  memory.sitemap_strategy = body.strategy
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))
  return Response.json({ success: true })
}
