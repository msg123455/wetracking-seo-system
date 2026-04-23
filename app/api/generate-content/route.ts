import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import fs from "fs"
import path from "path"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

export async function POST(req: NextRequest) {
  const { keyword, page_type, industry } = await req.json()

  const prompt = `Eres un experto en SEO para empresas de tecnología RFID en Colombia y Latinoamérica.

Genera el contenido completo para una ${page_type} de WeTracking sobre: "${keyword}"

Industria objetivo: ${industry || "general"}

El contenido debe incluir:
1. Meta title (máximo 60 caracteres)
2. Meta description (máximo 160 caracteres)
3. H1 principal
4. Introducción (150 palabras)
5. 3-5 secciones H2 con contenido de 200 palabras cada una
6. FAQ con 4 preguntas y respuestas
7. CTA final
8. Slug URL sugerido

Responde SOLO en JSON con esta estructura exacta:
{
  "meta_title": "",
  "meta_description": "",
  "h1": "",
  "slug": "",
  "intro": "",
  "sections": [
    { "h2": "", "content": "" }
  ],
  "faq": [
    { "question": "", "answer": "" }
  ],
  "cta": ""
}`

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  })

  const raw = message.content[0].type === "text" ? message.content[0].text : ""
  const clean = raw.replace(/```json|```/g, "").trim()
  const content = JSON.parse(clean)

  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  const page = {
    id: Date.now().toString(),
    keyword,
    page_type,
    industry,
    content,
    status: "pending_approval",
    created_at: new Date().toISOString()
  }
  memory.pending_approval.push(page)
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))

  return Response.json(page)
}
