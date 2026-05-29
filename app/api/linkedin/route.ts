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
  const ctaLine = pageUrl
    ? `${pageUrl}`
    : "https://wetracking.co"

  const context = `
CONTEXTO DE LA EMPRESA:
WeTracking es una empresa colombiana especializada en trazabilidad y tecnología RFID para cadenas de suministro en Latinoamérica. Trabajan con empresas de manufactura, logística, retail y agroindustria.

ESTRATEGIA DEL POST — MUY IMPORTANTE:
El objetivo de este post es llevar tráfico a la página web de WeTracking.
El post es el TRAILER, la página es la PELICULA.
- Da suficiente valor para generar confianza y curiosidad.
- NO des toda la información — deja que la página responda en profundidad.
- El CTA final siempre cierra con la URL de la página como destino concreto.

REGLAS OBLIGATORIAS:
- Idioma: español latinoamericano, tono consultivo y directo. NUNCA corporativo ni vendedor.
- PROHIBIDO: "Estamos orgullosos", "Nos complace", "Soluciones integrales", "De la mano de"
- Empieza directo con el gancho. Sin saludos ni presentaciones.
- Párrafos cortos, saltos de línea entre ideas (lectura móvil).
- Menciona WeTracking máximo 2 veces, de forma natural.
- PROHIBIDO el guion largo (—).
- El CTA FINAL debe ser la última línea antes de los hashtags, exactamente así:
  "Conoce todos los detalles aquí: ${ctaLine}"
- Hashtags: 4-5 al final, en la última línea.`

  const contentBlock = `
CONTENIDO DE LA PÁGINA (extrae los puntos clave, no lo copies literal):
${contentSnippet}`

  const formats: Record<string, string> = {
    carousel: `${context}
${contentBlock}

Genera el COPY de un post de LinkedIn tipo CARRUSEL sobre: "${keyword}"

PARTE 1 — CAPTION DEL POST (texto que aparece sobre el carrusel):
- Hook de 1-2 líneas que plantea el problema o dato sorprendente.
- 1-2 párrafos que presentan el tema con un insight clave de la página.
- Anuncia que el carrusel muestra solo los puntos principales — la guía completa está en la página.
- CTA con URL.
- Hashtags.

PARTE 2 — SLIDES DEL CARRUSEL (7 láminas):
- Lámina 1 (portada): título impactante + subtítulo de 1 línea.
- Láminas 2-6: cada una con 1 título corto + 1-2 líneas de contexto. Cada lámina es UN punto clave de la página, no el desarrollo completo.
- Lámina 7 (CTA): "¿Quieres profundizar? Guía completa en: ${ctaLine}"

Escribe TODO listo para usar. Sin JSON, sin etiquetas. Solo el texto.`,

    historia: `${context}
${contentBlock}

Genera el COPY de un post de LinkedIn tipo HISTORIA / CASO DE ÉXITO sobre: "${keyword}"

Estructura (texto corrido, sin subtítulos):
- Línea 1-2: Hook con el resultado final (genera intriga sobre cómo llegaron ahí).
- Párrafo 1: Situación inicial de empresa cliente (sector, sin nombre, Colombia/LATAM). El problema específico con dato concreto.
- Párrafo 2: Qué intentaron antes sin éxito. Por qué fallaba.
- Párrafo 3: Qué cambió al implementar la solución. Sin detallar el "cómo" técnico — ese está en la página.
- Párrafo 4: Resultado medible (%, tiempo, dinero). Solo 1-2 números concretos.
- CTA: "¿Cómo lo hicieron exactamente? Lo explicamos paso a paso aquí: ${ctaLine}"
- Hashtags.

Solo el texto del post.`,

    insight: `${context}
${contentBlock}

Genera el COPY de un post de LinkedIn tipo INSIGHT / OPINIÓN sobre: "${keyword}"

Estructura (texto corrido):
- Línea 1-2: Declaración audaz o dato contraintuitivo extraído de la página.
- Párrafo 1: El error que comete la mayoría. Por qué pasa.
- Párrafo 2: El enfoque correcto según la página, con 1 dato o ejemplo concreto. No expliques todo — da el principio, no el método completo.
- Párrafo 3: Consecuencia práctica para empresas en Colombia/LATAM si aplican esto.
- CTA: "Analizamos esto en profundidad con datos reales aquí: ${ctaLine}"
- Hashtags.

Solo el texto del post.`,

    video: `${context}
${contentBlock}

Genera el COPY de un script de video LinkedIn (45-60 segundos) sobre: "${keyword}"

SCRIPT DEL VIDEO:
[0-5s] Hook visual/verbal: pregunta o dato que detenga el scroll.
[5-15s] Presenta el problema real que enfrenta el espectador. 1-2 oraciones.
[15-35s] Da 1 insight concreto de la página — suficiente para que vea que sabes, no suficiente para que no necesite ir a la página.
[35-50s] "Cubrimos esto en detalle, con ejemplos y casos reales, en el artículo de WeTracking. El link está en el caption."
[50-60s] Pregunta al espectador para generar comentarios.

CAPTION DEL POST (acompaña el video):
- 2 párrafos: contexto del tema + por qué importa.
- CTA: "Artículo completo con todos los detalles: ${ctaLine}"
- Hashtags.

Solo el script y el caption.`,
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
