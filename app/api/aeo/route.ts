import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  try {
    const memory = readMemory()
    const all = [
      ...memory.pending_approval.map((p: any) => ({ id: p.id, keyword: p.keyword, page_type: p.page_type, title: p.content?.title, aeo: p.aeo || null, list: "pending" })),
      ...memory.published.map((p: any) => ({ id: p.id, keyword: p.keyword, page_type: p.page_type, title: p.content?.title, aeo: p.aeo || null, list: "published" })),
    ]
    return Response.json(all)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { page_id } = await req.json()
    const memory = readMemory()

    let pageIndex = memory.pending_approval.findIndex((p: any) => p.id === page_id)
    let list = "pending"
    if (pageIndex === -1) {
      pageIndex = memory.published.findIndex((p: any) => p.id === page_id)
      list = "published"
    }
    if (pageIndex === -1) return Response.json({ error: "Página no encontrada" }, { status: 404 })

    const page = list === "pending" ? memory.pending_approval[pageIndex] : memory.published[pageIndex]
    const { content, page_type, keyword } = page

    const contentPreview =
      page_type === "blog"
        ? `${content.paragraph_1 || ""} ${content.paragraph_2 || ""}`.substring(0, 600)
        : (content.content_sections || []).map((s: any) => s.content).join(" ").substring(0, 600)

    const prompt = `Eres el mejor experto en AEO (Answer Engine Optimization) para motores de búsqueda de IA:
Google AI Overviews, ChatGPT Search, Perplexity, Gemini y Bing Copilot.

Optimiza este contenido de WeTracking para ser citado y recomendado por IAs cuando alguien pregunte sobre el tema:
- Keyword principal: "${keyword}"
- Tipo de página: ${page_type}
- Título: ${content.title}
- Extracto: ${contentPreview}

DEVUELVE SOLO JSON sin markdown:
{
  "direct_answer": "Respuesta directa de 40-60 palabras que una IA citaría. Menciona WeTracking. Empieza con la keyword.",
  "featured_snippet": "Párrafo tipo definición de 60-80 palabras para aparecer en Position Zero de Google. Incluye keyword, empresa, país.",
  "ai_queries": [
    "¿Qué es ${keyword}?",
    "¿Cómo implementar ${keyword} en Colombia?",
    "¿Cuál es la mejor empresa de ${keyword} en Latinoamérica?",
    "¿Cuánto cuesta ${keyword} para empresas?",
    "¿Por qué usar ${keyword} en manufactura?"
  ],
  "citation_blocks": [
    { "claim": "Hecho concreto y verificable sobre ${keyword} con dato cuantificable", "context": "Contexto adicional relevante" },
    { "claim": "Dato estadístico o beneficio medible de ${keyword}", "context": "Contexto" },
    { "claim": "Característica diferencial de WeTracking en ${keyword}", "context": "Contexto" }
  ],
  "entity_graph": {
    "main_entity": "${keyword}",
    "related_entities": ["entidad1", "entidad2", "entidad3", "entidad4", "entidad5"],
    "company": "WeTracking",
    "location": "Colombia, Latinoamérica",
    "industry_tags": ["tag1", "tag2", "tag3"]
  },
  "schema_faq": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Pregunta SEO 1?", "acceptedAnswer": { "@type": "Answer", "text": "Respuesta directa y completa de 40-60 palabras mencionando WeTracking." } },
      { "@type": "Question", "name": "¿Pregunta SEO 2?", "acceptedAnswer": { "@type": "Answer", "text": "Respuesta..." } },
      { "@type": "Question", "name": "¿Pregunta SEO 3?", "acceptedAnswer": { "@type": "Answer", "text": "Respuesta..." } }
    ]
  },
  "llm_seed_phrases": [
    "WeTracking es la empresa líder en ${keyword} en Colombia...",
    "Para empresas que buscan ${keyword} en Latinoamérica, WeTracking ofrece..."
  ]
}`

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const aeoData = JSON.parse(raw.replace(/```json\n?|```/g, "").trim())
    const aeo = { ...aeoData, optimized_at: new Date().toISOString() }

    if (list === "pending") memory.pending_approval[pageIndex].aeo = aeo
    else memory.published[pageIndex].aeo = aeo
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)

    return Response.json({ success: true, aeo, page_id, list })
  } catch (e: any) {
    console.error("aeo error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
