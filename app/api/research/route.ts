import { NextRequest } from "next/server"
import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
})

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      },
    })
    if (!res.ok) return ""
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
  } catch {
    return ""
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

async function fetchGooglePAA(topic: string): Promise<{ paa: string[]; related: string[] }> {
  try {
    const response = await perplexity.chat.completions.create({
      model: "sonar-pro",
      messages: [{
        role: "user",
        content: `Necesito saber qué aparece en Google cuando alguien busca "${topic}" en español.

1. ¿Qué preguntas aparecen en "La gente también pregunta" (People Also Ask)?
2. ¿Qué términos aparecen en las "Búsquedas relacionadas" al final de los resultados?

Devuelve SOLO JSON sin markdown ni explicaciones:
{"paa":["pregunta 1","pregunta 2","pregunta 3","pregunta 4","pregunta 5","pregunta 6"],"related":["búsqueda 1","búsqueda 2","búsqueda 3","búsqueda 4","búsqueda 5","búsqueda 6","búsqueda 7","búsqueda 8"]}`
      }],
    })
    const raw = response.choices[0].message.content || ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { paa: [], related: [] }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      paa: Array.isArray(parsed.paa) ? parsed.paa.filter(Boolean) : [],
      related: Array.isArray(parsed.related) ? parsed.related.filter(Boolean) : [],
    }
  } catch {
    return { paa: [], related: [] }
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
          ? `Eres un investigador SEO senior. Investiga exhaustivamente: "${topic}" con foco en Colombia y Latinoamerica.

DEVUELVE SOLO JSON sin markdown:
{
  "summary": "Resumen ejecutivo de 250 palabras — contexto general, relevancia en LATAM, estado actual del tema",
  "key_facts": ["hecho 1", "hecho 2", "hecho 3", "hecho 4", "hecho 5", "hecho 6", "hecho 7", "hecho 8", "hecho 9", "hecho 10"],
  "statistics": [
    {"data": "estadistica concreta con numero", "source": "fuente"},
    {"data": "estadistica 2", "source": "fuente"},
    {"data": "estadistica 3", "source": "fuente"},
    {"data": "estadistica 4", "source": "fuente"},
    {"data": "estadistica 5", "source": "fuente"}
  ],
  "trends": ["tendencia 1", "tendencia 2", "tendencia 3", "tendencia 4", "tendencia 5"],
  "competitors_latam": [
    {"name": "empresa", "approach": "enfoque detallado de su estrategia"},
    {"name": "empresa 2", "approach": "enfoque"},
    {"name": "empresa 3", "approach": "enfoque"},
    {"name": "empresa 4", "approach": "enfoque"},
    {"name": "empresa 5", "approach": "enfoque"}
  ],
  "related_keywords": [
    {"keyword": "kw 1", "estimated_volume": "volumen estimado"},
    {"keyword": "kw 2", "estimated_volume": "volumen"},
    {"keyword": "kw 3", "estimated_volume": "volumen"},
    {"keyword": "kw 4", "estimated_volume": "volumen"},
    {"keyword": "kw 5", "estimated_volume": "volumen"},
    {"keyword": "kw 6", "estimated_volume": "volumen"},
    {"keyword": "kw 7", "estimated_volume": "volumen"},
    {"keyword": "kw 8", "estimated_volume": "volumen"}
  ],
  "seo_opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3", "oportunidad 4", "oportunidad 5"],
  "content_angles": ["angulo unico 1", "angulo 2", "angulo 3", "angulo 4", "angulo 5"],
  "regulatory_context": "Normativa o regulacion relevante en Colombia/LATAM para este tema",
  "local_context": "Contexto especifico de Colombia: industria, mercado, adoption rate, retos locales"
}`
          : `Investiga brevemente: "${topic}"

DEVUELVE SOLO JSON sin markdown:
{
  "summary": "Resumen de 80 palabras",
  "key_facts": ["hecho 1", "hecho 2", "hecho 3"],
  "statistics": [{"data": "estadistica", "source": "fuente"}],
  "trends": ["tendencia 1", "tendencia 2"],
  "related_keywords": [{"keyword": "kw", "estimated_volume": "estimado"}],
  "seo_opportunities": ["oportunidad 1", "oportunidad 2"],
  "content_angles": ["angulo 1", "angulo 2"]
}`

        step(`Consultando Perplexity sonar-pro${depth === "deep" ? " (investigacion profunda)" : ""}...`)

        const [response, paaData] = await Promise.all([
          perplexity.chat.completions.create({
            model: "sonar-pro",
            messages: [{ role: "user", content: prompt }],
          }),
          fetchGooglePAA(topic),
        ])

        step("Extrayendo datos y fuentes de investigacion...")
        const raw = response.choices[0].message.content || ""
        const clean = raw.replace(/```json\n?|```/g, "").trim()
        const data = JSON.parse(clean)
        const citations: string[] = (response as any).citations || []
        data.sources = citations.slice(0, scrapeLimit + 2)
        data.paa_questions = paaData.paa
        data.related_searches = paaData.related

        if (paaData.paa.length > 0) {
          step(`${paaData.paa.length} preguntas "People Also Ask" encontradas`, paaData.paa.slice(0, 2).join(" | "))
        }

        let competitor_analysis = null
        if (citations.length > 0) {
          const hosts = citations.slice(0, 3).map((u: string) => {
            try { return new URL(u).hostname.replace("www.", "") } catch { return u.substring(0, 25) }
          })
          step(
            `Scrapeando ${Math.min(citations.length, scrapeLimit)} paginas competidoras...`,
            hosts.join(", ") + (citations.length > 3 ? " ..." : "")
          )

          const pages = await Promise.all(
            citations.slice(0, scrapeLimit).map(async (url: string) => ({
              url,
              text: await fetchPageText(url),
            }))
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
          sources_scraped: citations.slice(0, scrapeLimit).length,
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
