import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FORMAT_LABELS: Record<string, string> = {
  carousel: "Carrusel educativo (6-8 láminas)",
  historia: "Historia / Caso de éxito",
  insight:  "Insight / Opinión thought leadership",
  video:    "Script de video (45-75 segundos)",
}

function buildPrompt(format: string, keyword: string, pageType: string, contentSnippet: string, pageUrl?: string): string {
  const linkLine = pageUrl
    ? `\n- Al final del post, ANTES de los hashtags, incluye exactamente esta línea: "Lee el artículo completo: ${pageUrl}"`
    : ""

  const context = `
CONTEXTO DE LA EMPRESA:
WeTracking es una empresa colombiana especializada en trazabilidad y tecnología RFID para cadenas de suministro en Latinoamérica. Trabajan con empresas de manufactura, logística, retail y agroindustria. Su propuesta de valor: visibilidad total del inventario y activos en tiempo real.

REGLAS DEL POST (OBLIGATORIAS):
- Idioma: español latinoamericano, tono consultivo y directo. NUNCA corporativo ni vendedor.${linkLine}
- PROHIBIDO: "Estamos orgullosos", "Nos complace", "Soluciones integrales", "De la mano de"
- Empieza directo con el gancho. Sin saludos ni presentaciones.
- Usa saltos de línea para facilitar la lectura en móvil (párrafos cortos).
- Menciona WeTracking máximo 2 veces, de forma natural.
- Termina con una pregunta o invitación a comentar.
- Incluye 4-5 hashtags relevantes al final.
- PROHIBIDO el guion largo (—).`

  const contentBlock = `
CONTENIDO DE LA PÁGINA SEO (usa estos datos reales en el post):
${contentSnippet}`

  const formats: Record<string, string> = {
    carousel: `${context}
${contentBlock}

Genera el COPY COMPLETO de un post de LinkedIn tipo CARRUSEL sobre: "${keyword}"

El post tiene dos partes:
1. CAPTION (texto del post): 3-4 párrafos cortos. Hook potente, presenta el problema, anuncia que el carrusel lo resuelve, termina con pregunta.
2. SLIDES (contenido de cada lámina): lista numerada de 7 láminas con título + 1-2 líneas de contenido cada una. La lámina 1 es portada, la última es CTA.

Escribe TODO el copy listo para usar. Sin JSON, sin etiquetas, sin explicaciones. Solo el texto.`,

    historia: `${context}
${contentBlock}

Genera el COPY COMPLETO de un post de LinkedIn tipo HISTORIA / CASO DE ÉXITO sobre: "${keyword}"

Estructura narrativa (todo en texto corrido, sin subtítulos):
- Línea 1-2: Hook fuerte (resultado inesperado o momento de crisis)
- Párrafo 1: Situación inicial de la empresa cliente (sector, sin nombre, Colombia/LATAM)
- Párrafo 2: El problema específico con datos concretos
- Párrafo 3: Cómo WeTracking lo resolvió
- Párrafo 4: Resultado medible (%, tiempo, dinero)
- Línea final: Lección + pregunta para comentarios
- Hashtags

Escribe TODO el copy listo para pegar en LinkedIn. Sin JSON, sin etiquetas. Solo el texto del post.`,

    insight: `${context}
${contentBlock}

Genera el COPY COMPLETO de un post de LinkedIn tipo INSIGHT / OPINIÓN sobre: "${keyword}"

Estructura (texto corrido):
- Línea 1-2: Declaración audaz o contraintuitiva que genere curiosidad
- Párrafo 1: Por qué la mayoría lo hace diferente (el error común)
- Párrafo 2: La perspectiva de WeTracking con argumento concreto y dato
- Párrafo 3: Consecuencia práctica para empresas colombianas/latam
- Cierre: Reflexión + pregunta abierta para debate
- Hashtags

Escribe TODO el copy listo para pegar en LinkedIn. Sin JSON, sin etiquetas. Solo el texto del post.`,

    video: `${context}
${contentBlock}

Genera el COPY COMPLETO de un script de video de LinkedIn (45-75 segundos) sobre: "${keyword}"

Estructura:
SCRIPT DEL VIDEO:
[0-5s] texto que se dice en cámara para el gancho
[5-20s] texto del problema
[20-45s] texto de la solución con ejemplo
[45-65s] cierre y CTA suave

TEXTO DEL POST (caption que acompaña el video):
2-3 párrafos cortos + hashtags

Escribe TODO listo para usar. Sin JSON, sin etiquetas adicionales. Solo el script y el caption.`,
  }

  return formats[format] || formats.insight
}

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.linkedin_posts || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, page_type, format, page_id, page_url } = await req.json()
    if (!keyword?.trim()) return Response.json({ error: "keyword requerida" }, { status: 400 })
    if (!format)          return Response.json({ error: "format requerido" },  { status: 400 })

    const memory = readMemory()

    // Extract real content from the source page
    let contentSnippet = `Tema: ${keyword}. Tipo de página: ${page_type || "general"}.`
    if (page_id) {
      const page =
        memory.pending_approval?.find((p: any) => p.id === page_id) ||
        memory.published?.find((p: any) => p.id === page_id)

      if (page?.content) {
        const c = page.content
        const sections = (c.content_sections || [])
          .filter((s: any) => ["heading2", "paragraph", "callout", "example"].includes(s.type))
          .map((s: any) => `${s.type === "heading2" ? "## " : ""}${s.content}`)
          .filter(Boolean)
          .join("\n")
          .substring(0, 2000)

        contentSnippet = [
          c.title           && `Título: ${c.title}`,
          c.meta_description && `Descripción: ${c.meta_description}`,
          sections           && `Contenido:\n${sections}`,
          c.faq_items?.length && `Preguntas frecuentes: ${c.faq_items.map((f: any) => f.question).join(" | ")}`,
          c.paragraph_1      && `Intro: ${c.paragraph_1.substring(0, 400)}`,
          c.key_points?.length && `Puntos clave: ${c.key_points.join(" | ")}`,
        ].filter(Boolean).join("\n\n")
      }
    }

    const prompt = buildPrompt(format, keyword, page_type || "general", contentSnippet, page_url || undefined)

    const message = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : ""

    const post = {
      id: Date.now().toString(),
      keyword,
      page_type: page_type || "general",
      format,
      format_label: FORMAT_LABELS[format] || format,
      page_id:  page_id  || null,
      page_url: page_url || null,
      text,
      created_at: new Date().toISOString(),
    }

    if (!memory.linkedin_posts) memory.linkedin_posts = []
    memory.linkedin_posts.unshift(post)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)

    return Response.json(post)
  } catch (e: any) {
    console.error("linkedin error:", e)
    return Response.json({ error: e.message || "Error generando post" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const memory = readMemory()
    memory.linkedin_posts = (memory.linkedin_posts || []).filter((p: any) => p.id !== id)
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
