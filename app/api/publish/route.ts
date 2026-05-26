import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"
import path from "path"
import fs from "fs"

const CMS_URL = `${process.env.BASE44_APP_DOMAIN}/functions/cmsApi`
const UPLOAD_URL = `${process.env.BASE44_APP_DOMAIN}/functions/uploadFile`

// Generate image with Gemini Imagen and upload to Base44 — returns public file_url or null
async function generateAndUploadImage(description: string): Promise<string | null> {
  try {
    const imagePrompt = [
      `Editorial flat illustration in the style of Investopedia or HBR article headers.`,
      `Concept to illustrate: ${description}.`,
      `CHARACTER AND OBJECT STYLE (required): Draw human figures and product/machine icons in a clean sketch style — rounded outlines, simple facial features, expressive postures, no photorealism. Each character represents a role or step in the process. Objects like boxes, machines, trucks, shelves must match the same sketch aesthetic. Keep this style 100% consistent throughout.`,
      `COLOR PALETTE (strict):`,
      `- Background: solid bright blue (#007aed) filling the entire canvas.`,
      `- All outlines, figures, characters and objects: deep navy (#0b194f).`,
      `- White: fills inside characters and objects for contrast.`,
      `- Cyan (#00ffd7): only 2-3 specific accent details. Not overused.`,
      `- No other colors. No gradients. No shadows.`,
      `TYPOGRAPHY (required):`,
      `- Bold title in white at the top-center. Short, clear, all-caps or title case.`,
      `- One subtitle line in white below the title, smaller. Describes what the image shows.`,
      `- Each illustrated element gets ONE label only — either above OR below the figure, never both. Never repeat the same word twice anywhere in the image.`,
      `NO REPETITION: every piece of text and every visual element must appear exactly once in the entire image.`,
      `COMPOSITION: Wide 16:9. Characters and objects left to right showing the process. Arrows connecting steps. Text block at top, illustration fills bottom two-thirds.`,
      `NO logos, NO watermarks, NO UI screenshots.`,
      `Quality: professional editorial illustration, consistent line weight, cohesive visual language.`,
    ].join(" ")

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
        signal: AbortSignal.timeout(30000),
      }
    )
    if (!geminiRes.ok) return null
    const geminiData = await geminiRes.json()
    const parts = geminiData.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData)
    const base64 = imagePart?.inlineData?.data
    if (!base64) return null

    // Overlay white logo at top-center if logo file exists
    let buffer = Buffer.from(base64, "base64")
    const logoPath = path.join(process.cwd(), "public", "logo-white.png")
    if (fs.existsSync(logoPath)) {
      try {
        const sharp = (await import("sharp")).default
        const img = sharp(buffer)
        const meta = await img.metadata()
        const imgWidth = meta.width || 1280
        const logoWidth = Math.round(imgWidth * 0.18)
        const logoResized = await sharp(logoPath)
          .resize(logoWidth, null, { fit: "inside" })
          .toBuffer()
        const logoMeta = await sharp(logoResized).metadata()
        buffer = await img.composite([{
          input: logoResized,
          top: Math.round((meta.height || 720) * 0.04),
          left: Math.round((imgWidth - (logoMeta.width || logoWidth)) / 2),
        }]).jpeg({ quality: 92 }).toBuffer()
      } catch { /* logo overlay failed, use original */ }
    }

    // Upload to Base44 as multipart
    const blob = new Blob([buffer], { type: "image/jpeg" })
    const form = new FormData()
    form.append("file", blob, `img-${Date.now()}.jpg`)

    const uploadRes = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.CMS_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(20000),
    })
    if (!uploadRes.ok) return null
    const uploadData = await uploadRes.json()
    return uploadData.file_url || uploadData.url || null
  } catch {
    return null
  }
}

// Inject image sections after matching H2s
async function injectImages(
  sections: any[],
  suggestions: { after_section: string; description: string }[]
): Promise<any[]> {
  if (!suggestions?.length) return sections

  // Generate all images in parallel
  const generated = await Promise.all(
    suggestions.map(async s => ({
      after_section: s.after_section,
      description: s.description,
      url: await generateAndUploadImage(s.description),
    }))
  )

  const result: any[] = []
  for (const section of sections) {
    result.push(section)
    if (section.type === "heading2") {
      const match = generated.find(
        g => g.url && section.content?.toLowerCase().includes(g.after_section.toLowerCase().substring(0, 20))
      )
      if (match) {
        result.push({ type: "image", content: match.url, alt_text: match.description })
      }
    }
  }
  return result
}

// Inject suggested_links as Markdown links into paragraph/callout/example text
function injectMarkdownLinks(sections: any[], links: { anchor: string; url: string }[]): any[] {
  if (!links?.length || !sections?.length) return sections
  const used = new Set<string>()
  return sections.map((s: any) => {
    const textTypes = ["paragraph", "callout", "example"]
    if (!textTypes.includes(s.type) || !s.content) return s
    let content = s.content
    for (const link of links) {
      if (used.has(link.anchor)) continue
      const escaped = link.anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(escaped, "i")
      if (regex.test(content)) {
        content = content.replace(regex, `[${link.anchor}](${link.url})`)
        used.add(link.anchor)
      }
    }
    return { ...s, content }
  })
}

// Strip internal-only fields before sending to Base44
function cleanContent(content: any): any {
  const { suggested_links, external_sources, image_suggestions, ...rest } = content

  // Inject links as Markdown before cleaning
  if (rest.content_sections && suggested_links?.length) {
    rest.content_sections = injectMarkdownLinks(rest.content_sections, suggested_links)
  }

  // Clean content_sections — only keep fields Base44 schema accepts
  if (rest.content_sections) {
    rest.content_sections = rest.content_sections.map((s: any) => {
      const clean: any = { type: s.type }
      if (s.content !== undefined) clean.content = s.content || ""
      if (s.alt_text !== undefined) clean.alt_text = s.alt_text || ""
      if (s.items?.length) clean.items = s.items
      if (s.headers?.length) clean.headers = s.headers
      if (s.rows?.length) clean.rows = s.rows
      return clean
    })
  }

  return rest
}

async function getEntityConfig(page: any, memory: any): Promise<{ entity: string; data: Record<string, any> }> {
  const { content, page_type, cluster_id, pillar_id } = page

  // Inject images before cleaning (only for pillar/secondary/third that have content_sections)
  let processedContent = { ...content }
  if (content.image_suggestions?.length && content.content_sections) {
    processedContent.content_sections = await injectImages(
      content.content_sections,
      content.image_suggestions
    )
  }

  const clean = cleanContent(processedContent)

  // Always look up the sitemap node — its URL is the source of truth for slugs
  const sitemapNode = (memory.sitemap_nodes || []).find((n: any) => n.page_id === page.id)

  // Helper: extract last URL segment as slug
  function lastSegment(url: string): string {
    return url.replace(/^\//, "").split("/").filter(Boolean).pop() || ""
  }

  switch (page_type) {
    case "pillar": {
      const slug = sitemapNode ? lastSegment(sitemapNode.url) : clean.slug
      return {
        entity: "PillarPage",
        data: { ...clean, slug, cluster_id: cluster_id || "default", is_active: true },
      }
    }
    case "secondary": {
      const slug = sitemapNode ? lastSegment(sitemapNode.url) : clean.slug
      return {
        entity: "SecondaryPage",
        data: { ...clean, slug, cluster_id: cluster_id || "default", pillar_id: pillar_id || "default", is_active: true },
      }
    }
    case "third": {
      // Derive pillar_slug, secondary_slug and slug from sitemap node URL
      // e.g. /trazabilidad/tipos/hacia-adelante → pillar=trazabilidad, secondary=tipos, slug=hacia-adelante
      let pillar_slug = ""
      let secondary_slug = ""
      let thirdSlug = clean.slug || ""

      const url = sitemapNode?.url || (clean.slug?.includes("/") ? `/${clean.slug}` : "")
      if (url) {
        const parts = url.replace(/^\//, "").split("/").filter(Boolean)
        if (parts.length >= 3) { pillar_slug = parts[0]; secondary_slug = parts[1]; thirdSlug = parts[2] }
        else if (parts.length === 2) { pillar_slug = parts[0]; thirdSlug = parts[1] }
        else if (parts.length === 1) { thirdSlug = parts[0] }
      }

      return {
        entity: "ThirdPage",
        data: { ...clean, slug: thirdSlug, pillar_slug, secondary_slug, cluster_id: cluster_id || "default", pillar_id: pillar_id || "default", is_active: true },
      }
    }
    case "blog":
      return {
        entity: "BlogPost",
        data: { ...clean, is_active: true, related_blog_ids: [] },
      }
    default:
      return {
        entity: "PillarPage",
        data: { ...clean, cluster_id: "default", is_active: true },
      }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { page_id } = await req.json()
    const memory = readMemory()

    const pageIndex = memory.pending_approval.findIndex((p: any) => p.id === page_id)
    if (pageIndex === -1) {
      return Response.json({ error: "Página no encontrada" }, { status: 404 })
    }

    const page = memory.pending_approval[pageIndex]
    const { entity, data } = await getEntityConfig(page, memory)

    // Escape non-ASCII so Base44's Python backend doesn't choke on Spanish text
    const safeBody = JSON.stringify({ entity, action: "create", data })
      .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)

    const base44Res = await fetch(CMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CMS_API_KEY}`,
      },
      body: safeBody,
    })

    if (!base44Res.ok) {
      const errText = await base44Res.text().catch(() => base44Res.statusText)
      return Response.json({ error: `Base44 error (${base44Res.status}): ${errText}` }, { status: 500 })
    }

    const base44Data = await base44Res.json()

    memory.published.push({
      ...page,
      status: "published",
      entity,
      base44_id: base44Data._id || base44Data.id,
      published_at: new Date().toISOString(),
    })
    memory.pending_approval.splice(pageIndex, 1)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)

    return Response.json({ success: true, entity, page })
  } catch (e: any) {
    console.error("publish error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
