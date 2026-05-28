import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GEMINI_MODEL = "gemini-2.5-pro"
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta/models"

async function fetchPageText(url: string): Promise<{ text: string; finalUrl: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    })
    const finalUrl = res.url // actual URL after redirect
    if (!res.ok) return { text: "", finalUrl }
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 3500)
    return { text, finalUrl }
  } catch {
    return { text: "", finalUrl: url }
  }
}

async function analyzeCompetitors(topic: string, pages: { url: string; text: string }[]): Promise<any> {
  const validPages = pages.filter(p => p.text.length > 200)
  if (validPages.length === 0) return null

  const pagesText = validPages
    .map((p, i) => `--- Competidor ${i + 1}: ${p.url} ---\n${p.text}`)
    .join("\n\n")

  const prompt = `Eres un experto SEO analizando las paginas que actualmente rankean en Google para: "${topic}" en Colombia/Latinoamerica.

Aqui el contenido de los ${validPages.length} primeros resultados:

${pagesText}

Analiza y extrae los insights mas valiosos para que WeTracking (empresa RFID en Colombia) cree contenido que los supere.

DEVUELVE SOLO JSON sin markdown:
{
  "temas_comunes": ["tema que todos cubren y es obligatorio incluir"],
  "content_gaps": ["tema que NADIE cubre bien — oportunidad de diferenciacion"],
  "angulos_unicos_wetracking": ["como WeTracking puede cubrir este tema mejor que todos"],
  "estructura_recomendada": ["H2 que debe tener la pagina para superar a la competencia"],
  "long_tail_keywords": ["keyword de cola larga detectada en el contenido"],
  "preguntas_sin_responder": ["pregunta que los usuarios hacen pero los competidores no responden bien"],
  "word_count_promedio": 1500,
  "elementos_engagement": ["tabla comparativa", "paso a paso", "caso de estudio", "estadistica local"]
}`

  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text : ""
  try {
    return JSON.parse(raw.replace(/```json\n?|```/g, "").trim())
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.research || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { topic, depth = "basic" } = await req.json()
  if (!topic?.trim()) return Response.json({ error: "topic requerido" }, { status: 400 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: Record<string, any>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`))
      const step = (text: string, detail?: string) =>
        emit("step", detail !== undefined ? { text, detail } : { text })

      try {
        const scrapeLimit = depth === "deep" ? 10 : 5

        const prompt = depth === "deep"
          ? `Eres un investigador SEO senior. Usa Google Search para investigar exhaustivamente: "${topic}" con foco en Colombia y Latinoamerica.

DEVUELVE SOLO JSON sin markdown ni bloques de codigo:
{
  "summary": "Resumen ejecutivo de 250 palabras — contexto general, relevancia en LATAM, estado actual del tema",
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
    {"name": "empresa relevante en el sector", "approach": "descripcion detallada de su estrategia"},
    {"name": "empresa 2", "approach": "enfoque"},
    {"name": "empresa 3", "approach": "enfoque"},
    {"name": "empresa 4", "approach": "enfoque"},
    {"name": "empresa 5", "approach": "enfoque"}
  ],
  "related_keywords": [
    {"keyword": "termino relacionado", "estimated_volume": "estimado mensual Colombia"},
    {"keyword": "keyword 2", "estimated_volume": "estimado"},
    {"keyword": "keyword 3", "estimated_volume": "estimado"},
    {"keyword": "keyword 4", "estimated_volume": "estimado"},
    {"keyword": "keyword 5", "estimated_volume": "estimado"},
    {"keyword": "keyword 6", "estimated_volume": "estimado"},
    {"keyword": "keyword 7", "estimated_volume": "estimado"},
    {"keyword": "keyword 8", "estimated_volume": "estimado"}
  ],
  "paa_questions": ["pregunta real de Google People Also Ask 1", "pregunta 2", "pregunta 3", "pregunta 4", "pregunta 5", "pregunta 6"],
  "related_searches": ["busqueda relacionada Google 1", "busqueda 2", "busqueda 3", "busqueda 4", "busqueda 5", "busqueda 6", "busqueda 7", "busqueda 8"],
  "seo_opportunities": ["oportunidad concreta 1", "oportunidad 2", "oportunidad 3", "oportunidad 4", "oportunidad 5"],
  "content_angles": ["angulo unico 1", "angulo 2", "angulo 3", "angulo 4", "angulo 5"],
  "regulatory_context": "Normativa o regulacion relevante en Colombia/LATAM para este tema",
  "local_context": "Contexto especifico del mercado colombiano: industria, adoption rate, retos locales, casos de uso reales"
}`
          : `Usa Google Search para investigar brevemente: "${topic}" con foco en Colombia.

DEVUELVE SOLO JSON sin markdown ni bloques de codigo:
{
  "summary": "Resumen de 100 palabras",
  "key_facts": ["hecho 1", "hecho 2", "hecho 3", "hecho 4"],
  "statistics": [{"data": "estadistica", "source": "fuente"}],
  "trends": ["tendencia 1", "tendencia 2", "tendencia 3"],
  "paa_questions": ["pregunta PAA 1", "pregunta 2", "pregunta 3", "pregunta 4"],
  "related_searches": ["busqueda 1", "busqueda 2", "busqueda 3", "busqueda 4"],
  "related_keywords": [{"keyword": "kw", "estimated_volume": "estimado"}],
  "seo_opportunities": ["oportunidad 1", "oportunidad 2"],
  "content_angles": ["angulo 1", "angulo 2"],
  "regulatory_context": "",
  "local_context": "contexto colombia breve"
}`

        step(`Consultando Gemini ${GEMINI_MODEL} con Google Search${depth === "deep" ? " (investigacion profunda)" : ""}...`)

        const geminiRes = await fetch(
          `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }], role: "user" }],
              tools: [{ google_search: {} }],
            }),
            signal: AbortSignal.timeout(90000),
          }
        )

        if (!geminiRes.ok) {
          const errText = await geminiRes.text()
          throw new Error(`Gemini API error (${geminiRes.status}): ${errText.substring(0, 300)}`)
        }

        const geminiData = await geminiRes.json()
        const candidate = geminiData.candidates?.[0]
        if (!candidate) throw new Error("Sin respuesta de Gemini")

        step("Extrayendo datos y fuentes de investigacion...")

        const rawText: string = candidate.content?.parts?.[0]?.text || ""
        const groundingChunks: any[] = candidate.groundingMetadata?.groundingChunks || []
        const webSearchQueries: string[] = candidate.groundingMetadata?.webSearchQueries || []

        // Extract citation URLs from grounding metadata
        const citationUrls: string[] = groundingChunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => c.web.uri)

        // Parse JSON response (strip markdown code blocks if present)
        const clean = rawText.replace(/```json\n?|```/g, "").trim()
        const data = JSON.parse(clean)

        // Use grounding citations as sources (follow redirects to get actual URLs)
        data.sources = citationUrls.slice(0, scrapeLimit + 2)

        if (data.paa_questions?.length) {
          step(`${data.paa_questions.length} preguntas "People Also Ask" encontradas`, data.paa_questions.slice(0, 2).join(" | "))
        }

        if (webSearchQueries.length > 0) {
          step(`${webSearchQueries.length} queries de busqueda ejecutadas`, webSearchQueries.slice(0, 3).join(" | "))
        }

        // Scrape competitor pages from grounding sources
        let competitor_analysis = null
        if (citationUrls.length > 0) {
          const hosts = citationUrls.slice(0, 3).map((u: string) => {
            try { return new URL(u).hostname.replace("www.", "") } catch { return u.substring(0, 30) }
          })
          step(
            `Scrapeando ${Math.min(citationUrls.length, scrapeLimit)} paginas competidoras...`,
            hosts.join(", ") + (citationUrls.length > 3 ? " ..." : "")
          )

          const pages = await Promise.all(
            citationUrls.slice(0, scrapeLimit).map(async (url: string) => {
              const { text, finalUrl } = await fetchPageText(url)
              return { url: finalUrl, text } // use resolved URL so Claude knows the real domain
            })
          )

          step("Analizando competidores con Claude Sonnet...")
          competitor_analysis = await analyzeCompetitors(topic, pages)

          if (competitor_analysis?.content_gaps?.length) {
            step(
              "Gaps de contenido detectados",
              competitor_analysis.content_gaps.slice(0, 3).join(" | ")
            )
          }
        }

        step("Guardando research en memoria...")
        const memory = readMemory()
        const research = {
          id: Date.now().toString(),
          topic,
          depth,
          data,
          competitor_analysis,
          sources_scraped: citationUrls.slice(0, scrapeLimit).length,
          created_at: new Date().toISOString(),
        }
        if (!memory.research) memory.research = []
        memory.research.unshift(research)
        memory.last_updated = new Date().toISOString()
        writeMemory(memory)

        emit("done", { data: research })
      } catch (e: any) {
        console.error("research error:", e)
        emit("error", { text: e.message || "Error en research" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const memory = readMemory()
    memory.research = (memory.research || []).filter((r: any) => r.id !== id)
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
