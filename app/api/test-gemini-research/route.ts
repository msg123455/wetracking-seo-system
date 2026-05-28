import { NextRequest } from "next/server"

// Test endpoint to compare Gemini + Google Search Grounding vs Perplexity sonar-pro
// Same output schema as /api/research so results are comparable side-by-side

const ALLOWED_MODELS = new Set([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
])

export async function POST(req: NextRequest) {
  let { topic, model = "gemini-2.0-flash" } = await req.json()
  if (!ALLOWED_MODELS.has(model)) model = "gemini-2.5-pro"
  if (!topic?.trim()) return Response.json({ error: "topic requerido" }, { status: 400 })

  const prompt = `Eres un investigador SEO senior especializado en Colombia y Latinoamerica.
Usa Google Search para investigar en tiempo real: "${topic}"

Devuelve SOLO JSON valido sin markdown ni bloques de codigo:
{
  "summary": "Resumen ejecutivo de 200-250 palabras — contexto general, relevancia en LATAM, estado actual del tema",
  "key_facts": ["hecho verificable 1", "hecho 2", "hecho 3", "hecho 4", "hecho 5", "hecho 6", "hecho 7", "hecho 8", "hecho 9", "hecho 10"],
  "statistics": [
    {"data": "estadistica concreta con numero real", "source": "nombre de la fuente"},
    {"data": "estadistica 2", "source": "fuente"},
    {"data": "estadistica 3", "source": "fuente"},
    {"data": "estadistica 4", "source": "fuente"},
    {"data": "estadistica 5", "source": "fuente"}
  ],
  "trends": ["tendencia actual 1", "tendencia 2", "tendencia 3", "tendencia 4", "tendencia 5"],
  "competitors_latam": [
    {"name": "empresa relevante", "approach": "descripcion detallada de su enfoque"},
    {"name": "empresa 2", "approach": "enfoque"},
    {"name": "empresa 3", "approach": "enfoque"}
  ],
  "related_keywords": [
    {"keyword": "termino relacionado", "estimated_volume": "estimado mensual"},
    {"keyword": "keyword 2", "estimated_volume": "estimado"},
    {"keyword": "keyword 3", "estimated_volume": "estimado"},
    {"keyword": "keyword 4", "estimated_volume": "estimado"},
    {"keyword": "keyword 5", "estimated_volume": "estimado"}
  ],
  "seo_opportunities": ["oportunidad concreta 1", "oportunidad 2", "oportunidad 3", "oportunidad 4", "oportunidad 5"],
  "content_angles": ["angulo unico 1", "angulo 2", "angulo 3", "angulo 4"],
  "regulatory_context": "Normativa o regulacion relevante en Colombia/LATAM para este tema",
  "local_context": "Contexto especifico del mercado colombiano: industria, adoption rate, retos locales, casos de uso reales"
}`

  const started = Date.now()

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(90000),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    return Response.json({ error: `Gemini API error (${res.status}): ${errText}` }, { status: 500 })
  }

  const elapsed = Date.now() - started
  const geminiData = await res.json()

  const candidate = geminiData.candidates?.[0]
  if (!candidate) {
    return Response.json({ error: "Sin candidato en respuesta de Gemini", raw: geminiData }, { status: 500 })
  }

  const rawText: string = candidate.content?.parts?.[0]?.text || ""
  const groundingChunks: any[] = candidate.groundingMetadata?.groundingChunks || []
  const webSearchQueries: string[] = candidate.groundingMetadata?.webSearchQueries || []

  const citations = groundingChunks
    .filter((c: any) => c.web?.uri)
    .map((c: any) => ({ url: c.web.uri, title: c.web.title || "" }))

  let data: any = null
  let parseError: string | null = null
  try {
    const clean = rawText.replace(/```json\n?|```/g, "").trim()
    data = JSON.parse(clean)
  } catch (e: any) {
    parseError = e.message
  }

  return Response.json({
    ok: data !== null,
    model_used: model,
    topic,
    elapsed_ms: elapsed,
    citations_count: citations.length,
    web_search_queries: webSearchQueries,
    citations,
    data,
    parse_error: parseError,
    raw_text_preview: rawText.substring(0, 600),
  })
}
