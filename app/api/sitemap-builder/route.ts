import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json({
      sitemaps: memory.sitemaps || [],
      nodes: memory.sitemap_nodes || [],
    })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "parse") {
      const { name, root_keyword, industry, structure_text } = body

      const prompt = `Analiza este sitemap en texto y conviértelo en un array de nodos JSON para una estrategia SEO.

Sitemap:
${structure_text}

Keyword raíz: "${root_keyword}"

Reglas de clasificación:
- Profundidad 0: la URL raíz principal → page_type "pillar" (solo 1 por sitemap)
- Profundidad 1: hijos directos del pillar → page_type "secondary"
- Profundidad 2: hijos de secondary → page_type "third"
- URLs bajo "blog/": → page_type "blog"
- Genera una keyword SEO descriptiva en español para cada nodo (no copies el slug literalmente)
- parent_url = URL completa del padre directo (null para el pillar)

DEVUELVE SOLO JSON sin markdown:
{
  "nodes": [
    {"url": "/ruta-completa", "keyword": "keyword SEO natural en español", "page_type": "pillar", "depth": 0, "parent_url": null},
    {"url": "/ruta/sub-ruta", "keyword": "keyword descriptiva", "page_type": "secondary", "depth": 1, "parent_url": "/ruta"},
    {"url": "/ruta/sub-ruta/detalle", "keyword": "keyword específica", "page_type": "third", "depth": 2, "parent_url": "/ruta/sub-ruta"}
  ]
}`

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        messages: [{ role: "user", content: prompt }],
      })

      const raw = message.content[0].type === "text" ? message.content[0].text : ""
      const parsed = JSON.parse(raw.replace(/```json\n?|```/g, "").trim())

      const memory = readMemory()
      const sitemapId = Date.now().toString()
      const sitemap = {
        id: sitemapId,
        name,
        root_keyword,
        industry: industry || "general",
        node_count: parsed.nodes.length,
        created_at: new Date().toISOString(),
      }

      if (!memory.sitemaps) memory.sitemaps = []
      if (!memory.sitemap_nodes) memory.sitemap_nodes = []

      memory.sitemaps.unshift(sitemap)

      const urlToId: Record<string, string> = {}
      const nodes = parsed.nodes.map((n: any, i: number) => {
        const id = `${sitemapId}_${i}`
        urlToId[n.url] = id
        return {
          id,
          sitemap_id: sitemapId,
          url: n.url,
          keyword: n.keyword,
          page_type: n.page_type,
          depth: n.depth,
          parent_id: null as string | null,
          status: "draft",
          page_id: null as string | null,
          created_at: new Date().toISOString(),
        }
      })

      parsed.nodes.forEach((n: any, i: number) => {
        if (n.parent_url && urlToId[n.parent_url]) {
          nodes[i].parent_id = urlToId[n.parent_url]
        }
      })

      memory.sitemap_nodes.push(...nodes)
      memory.last_updated = new Date().toISOString()
      writeMemory(memory)

      return Response.json({ sitemap, nodes })
    }

    if (action === "add_node") {
      const { sitemap_id, url, keyword, page_type, parent_id, depth } = body
      const memory = readMemory()
      if (!memory.sitemap_nodes) memory.sitemap_nodes = []
      const node = {
        id: `${sitemap_id}_m_${Date.now()}`,
        sitemap_id,
        url,
        keyword,
        page_type,
        depth: depth ?? 0,
        parent_id: parent_id || null,
        status: "draft",
        page_id: null,
        created_at: new Date().toISOString(),
      }
      memory.sitemap_nodes.push(node)
      writeMemory(memory)
      return Response.json(node)
    }

    return Response.json({ error: "action no reconocida" }, { status: 400 })
  } catch (e: any) {
    console.error("sitemap-builder error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { node_id, status, page_id, url, keyword, page_type, depth } = await req.json()
    const memory = readMemory()
    const node = (memory.sitemap_nodes || []).find((n: any) => n.id === node_id)
    if (node) {
      if (status     !== undefined) node.status     = status
      if (page_id    !== undefined) node.page_id    = page_id
      if (url        !== undefined) node.url        = url
      if (keyword    !== undefined) node.keyword    = keyword
      if (page_type  !== undefined) node.page_type  = page_type
      if (depth      !== undefined) node.depth      = depth
      writeMemory(memory)
    }
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sitemap_id, node_id } = await req.json()
    const memory = readMemory()
    if (sitemap_id) {
      memory.sitemaps = (memory.sitemaps || []).filter((s: any) => s.id !== sitemap_id)
      memory.sitemap_nodes = (memory.sitemap_nodes || []).filter((n: any) => n.sitemap_id !== sitemap_id)
    } else if (node_id) {
      memory.sitemap_nodes = (memory.sitemap_nodes || []).filter((n: any) => n.id !== node_id)
    }
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
