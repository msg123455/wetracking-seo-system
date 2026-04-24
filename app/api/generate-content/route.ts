import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildPrompt(keyword: string, page_type: string, industry: string): string {
  const ctx = `WeTracking es empresa de tecnología RFID en Colombia y Latinoamérica. Industria objetivo: ${industry}.`

  if (page_type === "pillar") {
    return `Eres un experto en SEO. ${ctx}

Genera contenido para una Pillar Page sobre: "${keyword}"

DEVUELVE SOLO JSON sin markdown con esta estructura exacta:
{
  "slug": "slug-en-kebab-case",
  "title": "H1 principal máximo 60 caracteres",
  "meta_description": "Meta description máximo 160 caracteres",
  "content_sections": [
    { "type": "heading2", "content": "Texto del H2", "alt_text": "" },
    { "type": "paragraph", "content": "Párrafo de 150-200 palabras", "alt_text": "" },
    { "type": "heading2", "content": "Segundo H2", "alt_text": "" },
    { "type": "paragraph", "content": "Párrafo de 150-200 palabras", "alt_text": "" },
    { "type": "heading2", "content": "Tercer H2", "alt_text": "" },
    { "type": "paragraph", "content": "Párrafo de 150-200 palabras", "alt_text": "" }
  ],
  "faq_title": "Preguntas Frecuentes sobre [tema]",
  "faq_subtitle": "Resolvemos tus dudas sobre [tema] con WeTracking",
  "faq_items": [
    { "question": "¿Pregunta 1?", "answer": "Respuesta completa de 2-3 oraciones." },
    { "question": "¿Pregunta 2?", "answer": "Respuesta completa de 2-3 oraciones." },
    { "question": "¿Pregunta 3?", "answer": "Respuesta completa de 2-3 oraciones." },
    { "question": "¿Pregunta 4?", "answer": "Respuesta completa de 2-3 oraciones." }
  ],
  "cta_text": "Solicita una demo gratuita de WeTracking y transforma tu operación con tecnología RFID."
}

Reglas: content_sections 4-6 elementos alternando heading2/paragraph. faq_items exactamente 4. Todo en español latinoamericano.`
  }

  if (page_type === "secondary") {
    return `Eres un experto en SEO. ${ctx}

Genera contenido para una Secondary Page sobre: "${keyword}"

DEVUELVE SOLO JSON sin markdown con esta estructura exacta:
{
  "slug": "slug-en-kebab-case",
  "title": "H1 principal máximo 60 caracteres",
  "meta_description": "Meta description máximo 160 caracteres",
  "content_sections": [
    { "type": "heading2", "content": "Texto del H2", "alt_text": "" },
    { "type": "paragraph", "content": "Párrafo de 150-200 palabras", "alt_text": "" },
    { "type": "heading2", "content": "Segundo H2", "alt_text": "" },
    { "type": "paragraph", "content": "Párrafo de 150-200 palabras", "alt_text": "" }
  ],
  "cta_text": "Contacta a WeTracking y descubre cómo nuestra solución RFID se adapta a tu empresa."
}

Reglas: content_sections 3-4 elementos alternando heading2/paragraph. Todo en español latinoamericano.`
  }

  // blog
  return `Eres un experto en SEO y content marketing. ${ctx}

Genera contenido para un Blog Post sobre: "${keyword}"

DEVUELVE SOLO JSON sin markdown con esta estructura exacta:
{
  "slug": "slug-en-kebab-case",
  "title": "Título del blog máximo 60 caracteres",
  "meta_description": "Meta description máximo 160 caracteres",
  "paragraph_1": "Párrafo introductorio de 150-200 palabras.",
  "paragraph_2": "Párrafo de desarrollo de 200-250 palabras con datos y beneficios.",
  "paragraph_3": "Párrafo de cierre de 150-200 palabras con llamado a la acción.",
  "image_1_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  "image_1_alt": "Descripción alt de la imagen 1 relacionada con el tema",
  "image_2_url": "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80",
  "image_2_alt": "Descripción alt de la imagen 2 relacionada con el tema",
  "cta_text": "Descubre cómo WeTracking puede ayudarte con soluciones RFID a medida."
}

Todo en español latinoamericano.`
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, page_type, industry, cluster_id, pillar_id, research_id } = await req.json()

    if (!keyword?.trim()) {
      return Response.json({ error: "keyword es requerido" }, { status: 400 })
    }

    // Enrich prompt with Perplexity research if provided
    let researchContext = ""
    if (research_id) {
      const memory = readMemory()
      const r = (memory.research || []).find((x: any) => x.id === research_id)
      if (r) {
        researchContext =
          `\n\nCONTEXTO DE INVESTIGACIÓN (usa estos datos en el contenido):\n` +
          `Resumen: ${r.data.summary}\n` +
          `Hechos clave: ${r.data.key_facts?.join(" | ")}\n` +
          `Estadísticas: ${r.data.statistics?.map((s: any) => s.data).join(" | ")}\n` +
          `Oportunidades SEO: ${r.data.seo_opportunities?.join(" | ")}\n`
      }
    }

    const basePrompt = buildPrompt(keyword, page_type, industry)
    const finalPrompt = researchContext ? basePrompt.replace(
      "DEVUELVE SOLO JSON",
      `${researchContext}\nDEVUELVE SOLO JSON`
    ) : basePrompt

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: finalPrompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const clean = raw.replace(/```json\n?|```/g, "").trim()
    const content = JSON.parse(clean)

    const memory = readMemory()
    const page = {
      id: Date.now().toString(),
      keyword,
      page_type,
      industry,
      cluster_id: cluster_id || "default",
      pillar_id: pillar_id || "default",
      content,
      status: "pending_approval",
      created_at: new Date().toISOString(),
    }
    memory.pending_approval.push(page)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)

    return Response.json(page)
  } catch (e: any) {
    console.error("generate-content error:", e)
    return Response.json({ error: e.message || "Error generando contenido" }, { status: 500 })
  }
}
