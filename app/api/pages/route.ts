import { readMemory } from "@/lib/memory"

const BASE = "https://wetracking.co"

// Returns published pages with full content + public URL — used by LinkedIn module
export async function GET() {
  try {
    const memory = readMemory()
    const sitemapNodes: any[] = memory.sitemap_nodes || []
    const nodeUrlMap = new Map<string, string>(
      sitemapNodes.filter(n => n.page_id).map(n => [String(n.page_id), String(n.url)])
    )

    const pages = (memory.published || []).map((p: any) => {
      const nodeUrl = nodeUrlMap.get(String(p.id))
      const path = nodeUrl
        ? (nodeUrl.startsWith("/") ? nodeUrl : `/${nodeUrl}`)
        : (p.content?.slug ? `/${p.content.slug}` : null)
      return {
        ...p,
        list: "published",
        page_url: path ? `${BASE}${path}` : null,
      }
    })

    return Response.json(pages)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
