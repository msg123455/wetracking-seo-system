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

  const dynamic: MetadataRoute.Sitemap = (memory.published || [])
    .filter((p: any) => p.content?.slug)
    .map((p: any) => ({
      url: `${BASE}/${p.content.slug}`,
      lastModified: new Date(p.published_at || Date.now()),
      changeFrequency: (p.page_type === "pillar" ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
      priority: p.page_type === "pillar" ? 0.9 : p.page_type === "secondary" ? 0.7 : 0.6,
    }))

  return [...STATIC_PAGES, ...dynamic]
}
