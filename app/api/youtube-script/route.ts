import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.youtube_scripts || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, page_type, page_id, industry } = await req.json()
    if (!keyword?.trim()) return Response.json({ error: "keyword requerida" }, { status: 400 })

    const memory = readMemory()

    // If a page_id is provided, use its content as base context
    let pageContext = ""
    if (page_id) {
      const page = [...memory.pending_approval, ...memory.published].find((p: any) => p.id === page_id)
      if (page) {
        const c = page.content
        const sections =
          page.page_type !== "blog"
            ? (c.content_sections || []).slice(0, 3).map((s: any) => `${s.type}: ${s.content}`).join("\n")
            : `P1: ${c.paragraph_1?.substring(0, 200)}`
        pageContext = `\nContenido base (${page.page_type}):\n- Título: ${c.title}\n- Meta: ${c.meta_description}\n${sections}\n`
      }
    }

    const prompt = `Eres un experto en YouTube SEO y video marketing B2B para Colombia y Latinoamérica.
${pageContext}
Crea el script completo de un video de YouTube sobre: "${keyword}"
Tipo de contenido SEO: ${page_type} | Industria: ${industry || "tecnología RFID"}

El video debe posicionar a WeTracking como el referente RFID en LATAM.

DEVUELVE SOLO JSON sin markdown:
{
  "video_title": "Título YouTube SEO máximo 60 chars con keyword",
  "video_description": "Descripción 400-500 chars con keyword, timestamps y CTA. Ejemplo:\\n0:00 Intro\\n1:30 Problema\\n3:00 Solución",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12"],
  "thumbnail_text": "Máximo 5 palabras impacto para thumbnail",
  "hook": "Primeros 15 segundos: frase de apertura que engancha inmediatamente al espectador",
  "chapters": [
    { "timestamp": "0:00",  "title": "Intro y problema", "script": "Script de 80-100 palabras para este capítulo" },
    { "timestamp": "1:30",  "title": "Contexto RFID en Colombia", "script": "Script..." },
    { "timestamp": "3:00",  "title": "Solución WeTracking", "script": "Script..." },
    { "timestamp": "5:00",  "title": "Casos de uso reales", "script": "Script..." },
    { "timestamp": "7:00",  "title": "Resultados y beneficios", "script": "Script..." },
    { "timestamp": "9:00",  "title": "Conclusión y CTA", "script": "Script..." }
  ],
  "cta_outro": "Script del llamado a la acción final (25-30 segundos): visita, suscribe, demo",
  "pinned_comment": "Comentario fijado con link a wetracking.co y recursos (máximo 200 chars)"
}`

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const scriptData = JSON.parse(raw.replace(/```json\n?|```/g, "").trim())

    const script = {
      id: Date.now().toString(),
      keyword,
      page_type,
      page_id: page_id || null,
      industry,
      script: scriptData,
      created_at: new Date().toISOString(),
    }

    if (!memory.youtube_scripts) memory.youtube_scripts = []
    memory.youtube_scripts.unshift(script)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)

    return Response.json(script)
  } catch (e: any) {
    console.error("youtube-script error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const memory = readMemory()
    memory.youtube_scripts = (memory.youtube_scripts || []).filter((s: any) => s.id !== id)
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
