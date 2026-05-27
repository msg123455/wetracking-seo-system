import type { MetadataRoute } from "next"
import { readMemory } from "@/lib/memory"

export const dynamic = "force-dynamic"

const BASE = "https://wetracking.co"

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE,                    lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE}/soluciones`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/industrias`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/nosotros`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE}/contacto`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/blog`,          lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const memory = readMemory()

  // Build map: page_id → full URL path from sitemap nodes
  // ThirdPages have a slug like "hacia-adelante" but the full URL is "/trazabilidad/tipos/hacia-adelante"
  // The sitemap node URL is always the source of truth
  const sitemapNodes: any[] = memory.sitemap_nodes || []
  const nodeUrlMap = new Map<string, string>(
    sitemapNodes
      .filter((n: any) => n.page_id)
      .map((n: any) => [String(n.page_id), String(n.url)])
  )

  const dynamic: MetadataRoute.Sitemap = (memory.published || [])
    .filter((p: any) => p.content?.slug || nodeUrlMap.has(String(p.id)))
    .map((p: any) => {
      const nodeUrl = nodeUrlMap.get(String(p.id))
      const path = nodeUrl
        ? (nodeUrl.startsWith("/") ? nodeUrl : `/${nodeUrl}`)
        : `/${p.content.slug}`
      return {
        url: `${BASE}${path}`,
        lastModified: new Date(p.published_at || Date.now()),
        changeFrequency: (p.page_type === "pillar" ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: p.page_type === "pillar" ? 0.9 : p.page_type === "secondary" ? 0.7 : 0.6,
      }
    })

  return [...STATIC_PAGES, ...dynamic]
}
