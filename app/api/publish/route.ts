import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

export async function POST(req: NextRequest) {
  const { page_id } = await req.json()
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))

  const pageIndex = memory.pending_approval.findIndex((p: any) => p.id === page_id)
  if (pageIndex === -1) {
    return Response.json({ error: "Página no encontrada" }, { status: 404 })
  }

  const page = memory.pending_approval[pageIndex]
  const { content } = page

  const base44Res = await fetch(
    `https://api.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/Pages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.BASE44_API_KEY!,
      },
      body: JSON.stringify({
        title: content.h1,
        slug: content.slug,
        metaTitle: content.meta_title,
        metaDescription: content.meta_description,
        htmlContent: buildHtml(content),
        status: "published",
        keyword: page.keyword,
      }),
    }
  )

  if (!base44Res.ok) {
    return Response.json({ error: "Error publicando en Base44" }, { status: 500 })
  }

  await fetch(`https://api.vercel.com/v1/deployments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: process.env.VERCEL_PROJECT_ID }),
  })

  memory.published.push({ ...page, status: "published", published_at: new Date().toISOString() })
  memory.pending_approval.splice(pageIndex, 1)
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))

  return Response.json({ success: true, page })
}

function buildHtml(content: any): string {
  let html = `<h1>${content.h1}</h1>\n<p>${content.intro}</p>\n`
  content.sections?.forEach((s: any) => {
    html += `<h2>${s.h2}</h2>\n<p>${s.content}</p>\n`
  })
  html += `<h2>Preguntas Frecuentes</h2>\n`
  content.faq?.forEach((f: any) => {
    html += `<h3>${f.question}</h3>\n<p>${f.answer}</p>\n`
  })
  html += `<div class="cta">${content.cta}</div>`
  return html
}
