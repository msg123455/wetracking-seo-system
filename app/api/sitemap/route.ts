import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"

const BASE = "https://wetracking.co"

export async function GET() {
  try {
    const memory = readMemory()
    const published = (memory.published || []).map((p: any) => ({
      url: `${BASE}/${p.content?.slug || ""}`,
      keyword: p.keyword,
      page_type: p.page_type,
      entity: p.entity,
      cluster_id: p.cluster_id,
      lastmod: p.published_at,
      priority: p.page_type === "pillar" ? "0.9" : p.page_type === "secondary" ? "0.7" : "0.6",
    }))
    return Response.json({
      sitemap_url: `${BASE}/sitemap.xml`,
      total: published.length,
      strategy: memory.sitemap_strategy,
      published,
    })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const memory = readMemory()
    memory.sitemap_strategy = body.strategy
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
