import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Prompts por formato ──────────────────────────────────────────────────────

function buildPrompt(format: string, keyword: string, pageType: string, contentSnippet: string): string {
  const REGLAS = `
REGLAS LINKEDIN B2B COLOMBIA (OBLIGATORIAS):
1. Idioma: español latinoamericano, tono consultivo y directo. NUNCA vendedor ni corporativo.
2. PROHIBIDO: "Estamos orgullosos de...", "Nos complace...", "Soluciones integrales", "De la mano de..."
3. Empieza SIEMPRE con el hook — nada antes del gancho. Sin "Hola LinkedIn," ni presentaciones.
4. Los numeros concretos dan credibilidad: usa porcentajes, tiempos, cantidades reales o plausibles.
5. Menciona WeTracking con naturalidad (max 2 veces), no como publicidad.
6. El CTA final debe ser sutil: una pregunta, una invitacion a debatir, o "Cuéntame en los comentarios."
7. PROHIBIDO el guion largo (—). Usa coma o dos puntos para separar ideas.`

  if (format === "carousel") return `Eres un experto en contenido B2B para LinkedIn en Colombia, especializado en industria y tecnología.

Crea un POST CARRUSEL de LinkedIn sobre: "${keyword}" (fuente: página ${pageType} de WeTracking)

${REGLAS}

Contexto del contenido SEO:
${contentSnippet}

ESTRUCTURA DEL CARRUSEL:
- 6 a 8 láminas
- Lámina 1 (portada): título impactante + subtítulo breve
- Láminas 2-6/7: cada una con un punto clave, dato o paso accionable
- Última lámina: CTA suave + @WeTracking

DEVUELVE SOLO JSON sin markdown:
{
  "format": "carousel",
  "hook": "Primera línea del POST de LinkedIn (no la lámina). Máximo 2 oraciones. Usa una de estas fórmulas: dato sorprendente, declaración contraintuitiva, pregunta al pain point.",
  "post_text": "Texto completo del post que acompaña el carrusel en LinkedIn. 3-4 párrafos. Presenta el problema, anuncia que el carrusel lo resuelve, termina con pregunta para comentarios.",
  "slides": [
    { "numero": 1, "titulo": "Título portada impactante", "subtitulo": "1 oración que amplía", "tipo": "portada" },
    { "numero": 2, "titulo": "Punto clave 1", "contenido": "2-3 oraciones o 3 bullets cortos", "tipo": "contenido" },
    { "numero": 3, "titulo": "Punto clave 2", "contenido": "2-3 oraciones o dato + contexto", "tipo": "contenido" },
    { "numero": 4, "titulo": "Punto clave 3", "contenido": "2-3 oraciones", "tipo": "contenido" },
    { "numero": 5, "titulo": "Punto clave 4", "contenido": "2-3 oraciones", "tipo": "contenido" },
    { "numero": 6, "titulo": "Lo que pocas empresas hacen", "contenido": "el insight diferencial", "tipo": "insight" },
    { "numero": 7, "titulo": "¿Tu empresa ya lo aplica?", "contenido": "CTA suave + menciona WeTracking", "tipo": "cta" }
  ],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "mejor_horario": "Martes o Miércoles, 9:00-10:30am Colombia",
  "nota_diseno": "Sugerencia visual para el carrusel (colores, estilo, iconos)"
}`

  if (format === "historia") return `Eres un experto en contenido B2B para LinkedIn en Colombia.

Crea un POST DE HISTORIA/CASO DE ÉXITO de LinkedIn sobre: "${keyword}" (fuente: página ${pageType} de WeTracking)

${REGLAS}

Contexto del contenido SEO:
${contentSnippet}

FORMATO HISTORIA: Situación → Problema → Solución → Resultado → Lección
El cliente es anónimo (empresa de manufactura/logística/retail en Colombia o LATAM).
Los números son plausibles y específicos (ej: "reducción del 23% en errores de despacho").

DEVUELVE SOLO JSON sin markdown:
{
  "format": "historia",
  "hook": "Primera línea. Máximo 2 oraciones. Fórmula: [resultado inesperado] o [el peor momento que se convirtió en aprendizaje].",
  "situacion": "Párrafo 1: contexto de la empresa cliente (sector, tamaño, sin nombre). 2-3 oraciones.",
  "problema": "Párrafo 2: el dolor específico que tenían. Concreto con números si aplica. 2-3 oraciones.",
  "solucion": "Párrafo 3: cómo WeTracking lo resolvió. Sin jerga técnica excesiva. 2-3 oraciones.",
  "resultado": "Párrafo 4: impacto medible. 2-3 resultados con números específicos.",
  "leccion": "Párrafo 5: qué puede aprender cualquier empresa de esta historia. 2 oraciones.",
  "cierre": "Pregunta final para comentarios. 1 oración.",
  "post_completo": "El post completo listo para copiar y pegar en LinkedIn. Incluye emojis estratégicos (max 5), saltos de línea para lectura móvil.",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4"],
  "mejor_horario": "Jueves 9:00-11:00am Colombia"
}`

  if (format === "insight") return `Eres un experto en contenido B2B para LinkedIn en Colombia.

Crea un POST DE INSIGHT/OPINIÓN de LinkedIn sobre: "${keyword}" (fuente: página ${pageType} de WeTracking)

${REGLAS}

Contexto del contenido SEO:
${contentSnippet}

FORMATO INSIGHT: Una idea contraintuitiva o poco conocida, bien argumentada.
El objetivo es generar debate y posicionar a WeTracking como thought leader.

DEVUELVE SOLO JSON sin markdown:
{
  "format": "insight",
  "hook": "Declaración audaz o contraintuitiva de máximo 2 oraciones. Debe generar curiosidad inmediata.",
  "desarrollo_p1": "Párrafo 1: explica por qué la mayoría piensa diferente. 3-4 oraciones.",
  "desarrollo_p2": "Párrafo 2: presenta la perspectiva de WeTracking con argumento concreto. 3-4 oraciones.",
  "desarrollo_p3": "Párrafo 3: consecuencias prácticas para una empresa colombiana/latam. 2-3 oraciones.",
  "puntos_clave": ["punto resumido 1", "punto resumido 2", "punto resumido 3"],
  "cierre": "Reflexión final + pregunta abierta para debate. 2 oraciones.",
  "post_completo": "El post completo listo para copiar y pegar. Con emojis estratégicos, saltos de línea para móvil.",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4"],
  "mejor_horario": "Miércoles 10:00am o Viernes 9:00am Colombia"
}`

  // video
  return `Eres un experto en contenido B2B para LinkedIn en Colombia.

Crea un SCRIPT DE VIDEO CORTO (45-75 segundos) de LinkedIn sobre: "${keyword}" (fuente: página ${pageType} de WeTracking)

${REGLAS}

Contexto del contenido SEO:
${contentSnippet}

FORMATO VIDEO: Directo a cámara. Tono conversacional pero profesional.
Estructura: Hook visual (0-5s) → Problema (5-20s) → Solución (20-50s) → CTA (50-65s)

DEVUELVE SOLO JSON sin markdown:
{
  "format": "video",
  "titulo": "Título del video (aparece en miniatura o primer frame)",
  "duracion_estimada": "60 segundos",
  "guion": [
    { "tiempo": "0-5s", "texto": "frase de apertura en cámara", "indicacion": "qué hacer/mostrar visualmente" },
    { "tiempo": "5-15s", "texto": "texto hablado presentando el problema", "indicacion": "indicacion visual" },
    { "tiempo": "15-35s", "texto": "texto hablado con la solución o insight principal", "indicacion": "indicacion visual" },
    { "tiempo": "35-50s", "texto": "texto hablado con ejemplo o dato concreto", "indicacion": "indicacion visual" },
    { "tiempo": "50-60s", "texto": "cierre y CTA suave", "indicacion": "indicacion visual" }
  ],
  "texto_post": "Texto que acompaña el video en LinkedIn. 2-3 párrafos cortos. Hook + contexto + pregunta final.",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4"],
  "mejor_horario": "Martes o Miércoles 9:00-11:00am Colombia",
  "tip_produccion": "Sugerencia práctica para grabarlo (fondo, iluminación, duración de cada escena)"
}`
}

// ── GET — listar todos los posts ─────────────────────────────────────────────

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.linkedin_posts || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// ── POST — generar contenido LinkedIn ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { keyword, page_type, format, page_id } = await req.json()
    if (!keyword?.trim()) return Response.json({ error: "keyword requerida" }, { status: 400 })
    if (!format) return Response.json({ error: "format requerido" }, { status: 400 })

    const memory = readMemory()

    // Extract content snippet from the source page if page_id is provided
    let contentSnippet = ""
    if (page_id) {
      const page =
        memory.pending_approval?.find((p: any) => p.id === page_id) ||
        memory.published?.find((p: any) => p.id === page_id)

      if (page?.content) {
        const { title, meta_description, content_sections, faq_items, paragraph_1, key_points } = page.content
        const sections = (content_sections || [])
          .filter((s: any) => ["heading2", "paragraph", "callout", "example"].includes(s.type))
          .map((s: any) => s.content)
          .filter(Boolean)
          .join("\n")
          .substring(0, 1500)

        contentSnippet = [
          title && `Título: ${title}`,
          meta_description && `Descripción: ${meta_description}`,
          sections && `Secciones principales:\n${sections}`,
          faq_items?.length && `FAQs: ${faq_items.map((f: any) => f.question).join(" | ")}`,
          paragraph_1 && `Intro: ${paragraph_1.substring(0, 300)}`,
          key_points?.length && `Puntos clave: ${key_points.join(" | ")}`,
        ].filter(Boolean).join("\n\n")
      }
    }

    if (!contentSnippet) {
      contentSnippet = `Tema: ${keyword}. Tipo: ${page_type || "general"}. Empresa: WeTracking (trazabilidad RFID, Colombia).`
    }

    const prompt = buildPrompt(format, keyword, page_type || "general", contentSnippet)

    const message = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const postData = JSON.parse(raw.replace(/```json\n?|```/g, "").trim())

    const post = {
      id: Date.now().toString(),
      keyword,
      page_type: page_type || "general",
      format,
      page_id: page_id || null,
      post: postData,
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

// ── DELETE ───────────────────────────────────────────────────────────────────

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
