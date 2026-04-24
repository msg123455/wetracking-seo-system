import { NextRequest } from "next/server"
import OpenAI from "openai"
import { readMemory, writeMemory } from "@/lib/memory"

const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
})

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.research || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic, depth = "basic" } = await req.json()
    if (!topic?.trim()) return Response.json({ error: "topic requerido" }, { status: 400 })

    const prompt =
      depth === "deep"
        ? `Eres un investigador SEO especializado en tecnología RFID e industria en Colombia y Latinoamérica.

Investiga en profundidad: "${topic}"

DEVUELVE SOLO JSON sin markdown:
{
  "summary": "Resumen ejecutivo de 150 palabras",
  "key_facts": ["hecho 1", "hecho 2", "hecho 3", "hecho 4", "hecho 5"],
  "statistics": [{"data": "estadística concreta", "source": "fuente"}],
  "trends": ["tendencia 1", "tendencia 2", "tendencia 3"],
  "competitors_latam": [{"name": "empresa", "approach": "enfoque"}],
  "related_keywords": [{"keyword": "kw", "estimated_volume": "volumen estimado"}],
  "common_questions": ["¿pregunta 1?", "¿pregunta 2?", "¿pregunta 3?", "¿pregunta 4?"],
  "seo_opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3"],
  "content_angles": ["ángulo 1", "ángulo 2", "ángulo 3"]
}`
        : `Investiga brevemente para WeTracking (empresa RFID en Colombia): "${topic}"

DEVUELVE SOLO JSON sin markdown:
{
  "summary": "Resumen de 80 palabras",
  "key_facts": ["hecho 1", "hecho 2", "hecho 3"],
  "statistics": [{"data": "estadística", "source": "fuente"}],
  "trends": ["tendencia 1", "tendencia 2"],
  "related_keywords": [{"keyword": "kw", "estimated_volume": "estimado"}],
  "common_questions": ["¿pregunta 1?", "¿pregunta 2?"],
  "seo_opportunities": ["oportunidad 1", "oportunidad 2"],
  "content_angles": ["ángulo 1", "ángulo 2"]
}`

    const response = await perplexity.chat.completions.create({
      model: "sonar-pro",
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.choices[0].message.content || ""
    const clean = raw.replace(/```json\n?|```/g, "").trim()
    const data = JSON.parse(clean)

    const memory = readMemory()
    const research = {
      id: Date.now().toString(),
      topic,
      depth,
      data,
      created_at: new Date().toISOString(),
    }
    if (!memory.research) memory.research = []
    memory.research.unshift(research)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)

    return Response.json(research)
  } catch (e: any) {
    console.error("research error:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
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
