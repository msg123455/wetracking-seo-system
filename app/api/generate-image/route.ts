import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  try {
    const { description, page_id, image_field } = await req.json()
    if (!description?.trim()) return Response.json({ error: "description requerida" }, { status: 400 })

    const prompt =
      `Professional, photorealistic image of: ${description}. ` +
      `High resolution, clean corporate style, suitable for a Colombian RFID technology company website. ` +
      `No text, no logos, no watermarks. Bright, modern, professional lighting.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9", safetyFilterLevel: "block_some" },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return Response.json({ error: `Gemini Imagen error (${res.status}): ${errText}` }, { status: 500 })
    }

    const result = await res.json()
    const base64 = result.predictions?.[0]?.bytesBase64Encoded

    if (!base64) {
      return Response.json({ error: "Gemini no devolvió imagen" }, { status: 500 })
    }

    // Save to public/generated-images/
    const imageId = Date.now().toString()
    const filename = `${imageId}.jpg`
    const publicDir = path.join(process.cwd(), "public", "generated-images")
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
    fs.writeFileSync(path.join(publicDir, filename), Buffer.from(base64, "base64"))

    const imageUrl = `/generated-images/${filename}`

    // If page_id + image_field provided, update the pending page
    if (page_id && image_field) {
      const memory = readMemory()
      const page = memory.pending_approval.find((p: any) => p.id === page_id)
      if (page) {
        page.content[image_field] = imageUrl
        writeMemory(memory)
      }
    }

    return Response.json({ url: imageUrl, description })
  } catch (e: any) {
    console.error("generate-image error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
