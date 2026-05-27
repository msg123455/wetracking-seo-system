import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.generated_images || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { description, page_id, image_field } = await req.json()
    if (!description?.trim()) return Response.json({ error: "description requerida" }, { status: 400 })

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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return Response.json({ error: `Gemini error (${res.status}): ${errText}` }, { status: 500 })
    }

    const result = await res.json()
    const parts = result.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: any) => p.inlineData)
    const base64 = imagePart?.inlineData?.data
    if (!base64) return Response.json({ error: "Gemini no devolvió imagen" }, { status: 500 })

    // Overlay white logo at top-center if logo file exists
    let buffer = Buffer.from(base64, "base64")
    const logoPath = path.join(process.cwd(), "public", "logo-white.png")
    if (fs.existsSync(logoPath)) {
      try {
        const sharp = (await import("sharp")).default
        const img = sharp(buffer)
        const meta = await img.metadata()
        const imgWidth = meta.width || 1280
        const imgHeight = meta.height || 720
        const logoWidth = Math.round(imgWidth * 0.18)
        const logoResized = await sharp(logoPath)
          .resize(logoWidth, null, { fit: "inside" })
          .toBuffer()
        const logoMeta = await sharp(logoResized).metadata()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buffer = (await img.composite([{
          input: logoResized,
          top: Math.round(imgHeight * 0.04),
          left: Math.round((imgWidth - (logoMeta.width || logoWidth)) / 2),
        }]).jpeg({ quality: 92 }).toBuffer()) as unknown as Buffer
      } catch { /* logo overlay failed, use original */ }
    }

    // Save to public/generated-images/
    const imageId = Date.now().toString()
    const filename = `${imageId}.jpg`
    const publicDir = path.join(process.cwd(), "public", "generated-images")
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
    fs.writeFileSync(path.join(publicDir, filename), buffer)

    const imageUrl = `/generated-images/${filename}`

    // Save to memory gallery
    const memory = readMemory()
    if (!memory.generated_images) memory.generated_images = []
    memory.generated_images.unshift({
      id: imageId,
      url: imageUrl,
      description,
      created_at: new Date().toISOString(),
    })
    // Keep last 50
    memory.generated_images = memory.generated_images.slice(0, 50)

    // If page_id + image_field provided, update the pending page
    if (page_id && image_field) {
      const page = memory.pending_approval.find((p: any) => p.id === page_id)
      if (page) page.content[image_field] = imageUrl
    }

    writeMemory(memory)
    return Response.json({ url: imageUrl, description, id: imageId })
  } catch (e: any) {
    console.error("generate-image error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const memory = readMemory()
    memory.generated_images = (memory.generated_images || []).filter((img: any) => img.id !== id)
    writeMemory(memory)
    // Delete file
    const filePath = path.join(process.cwd(), "public", "generated-images", `${id}.jpg`)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
