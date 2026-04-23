import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")
const BASE_URL = `https://api.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities`

function getEntityConfig(page: any): { entity: string; body: Record<string, any> } {
  const { content, page_type, cluster_id, pillar_id } = page

  switch (page_type) {
    case "pillar":
      return {
        entity: "PillarPage",
        body: { ...content, cluster_id: cluster_id || "default", is_active: true },
      }
    case "secondary":
      return {
        entity: "SecondaryPage",
        body: {
          ...content,
          cluster_id: cluster_id || "default",
          pillar_id: pillar_id || "default",
          is_active: true,
        },
      }
    case "blog":
      return {
        entity: "BlogPost",
        body: { ...content, is_active: true, related_blog_ids: [] },
      }
    default:
      return {
        entity: "PillarPage",
        body: { ...content, cluster_id: "default", is_active: true },
      }
  }
}

export async function POST(req: NextRequest) {
  const { page_id } = await req.json()
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))

  const pageIndex = memory.pending_approval.findIndex((p: any) => p.id === page_id)
  if (pageIndex === -1) {
    return Response.json({ error: "Página no encontrada" }, { status: 404 })
  }

  const page = memory.pending_approval[pageIndex]
  const { entity, body } = getEntityConfig(page)

  const base44Res = await fetch(`${BASE_URL}/${entity}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.BASE44_API_KEY!,
    },
    body: JSON.stringify(body),
  })

  if (!base44Res.ok) {
    const errText = await base44Res.text().catch(() => base44Res.statusText)
    return Response.json({ error: `Base44 error: ${errText}` }, { status: 500 })
  }

  const base44Data = await base44Res.json()

  await fetch("https://api.vercel.com/v1/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: process.env.VERCEL_PROJECT_ID }),
  })

  memory.published.push({
    ...page,
    status: "published",
    entity,
    base44_id: base44Data._id || base44Data.id,
    published_at: new Date().toISOString(),
  })
  memory.pending_approval.splice(pageIndex, 1)
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))

  return Response.json({ success: true, entity, page })
}
