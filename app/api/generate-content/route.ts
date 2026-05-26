import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { readMemory, writeMemory } from "@/lib/memory"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildPrompt(keyword: string, page_type: string, _industry: string): string {
  const REGLAS_CONTENIDO = `
REGLAS DE CONTENIDO (OBLIGATORIAS):
1. PROHIBIDO mencionar nombres de empresas, marcas o productos. Sin nombres propios en el cuerpo.
2. SOBRE RFID: RFID es solo una de las tecnologías que puede usarse para lograr trazabilidad, junto con códigos de barras, QR, GPS, sensores IoT, y registros digitales. NO lo presentes como "la solución" ni lo menciones en cada sección. Solo menciona RFID cuando el subtema específico lo requiera directamente.
3. El tema central son los conceptos, beneficios y aplicaciones de [el keyword]. La tecnología es un medio, no el fin.
4. ESTRUCTURA VISUAL: no pongas bloques del mismo tipo uno encima del otro. Cada sección H2 debe tener variedad visual. Usa los tipos disponibles según lo que encaje naturalmente:
   - "paragraph": prosa explicativa, máximo 2 por sección, 150-180 palabras cada uno, SIN ejemplos.
   - "list": cuando hay 3+ elementos paralelos (beneficios, características, requisitos, factores a considerar). El campo "items" es un array de strings.
   - "numbered_list": cuando hay pasos secuenciales o un proceso ordenado. El campo "items" es un array de strings.
   - "callout": para destacar UNA idea clave que el lector no debe perderse. 1-2 oraciones máximo.
   - "table": cuando estás comparando opciones, métodos o variables. El campo "headers" es array de cabeceras y "rows" es array de arrays de celdas.
   - "example": caso real concreto al final de cada sección. 4-5 oraciones. Tipo de empresa + país + situación + cómo aplicaron el concepto + resultado.
5. Los párrafos NO tienen ejemplos — los ejemplos siempre van en el bloque "example" separado.
6. SOLO incluye estadísticas si vienen del contexto de investigación. Si no hay datos reales, no inventes números.
7. El cta_text: maximo 6 palabras. Solo la accion. Ej: "Habla con un especialista hoy." o "Implementalo en tu empresa."
8. Todo en español latinoamericano, tono profesional pero accesible.
9. PROHIBIDO usar el guion largo (—). Nunca uses el caracter — en ningun campo. Ni en titulos, ni en parrafos, ni en ejemplos. Si necesitas separar ideas usa coma o dos puntos.`

  const PATRON_SECCION = `
Patrón por cada subtema — elige el mix visual que encaje con el contenido:
{ "type": "heading2", "content": "Título del subtema", "alt_text": "" },
[ uno o dos "paragraph" O un "paragraph" + un "list" O un "paragraph" + un "numbered_list" O un "paragraph" + un "table" ],
{ "type": "callout", "content": "La idea más importante de esta sección en 1-2 oraciones.", "alt_text": "" },
{ "type": "example", "content": "Caso real: tipo empresa + país + situación + resultado.", "alt_text": "" }

Nota: no uses siempre el mismo mix. Varía: una sección puede ser paragraph+list+example, la siguiente paragraph+table+example, la otra numbered_list+callout+example.`

  if (page_type === "pillar") {
    return `Eres un experto en SEO y redacción de contenido informativo de largo alcance.

Genera contenido para una Pillar Page (página pilar) sobre: "${keyword}"
Esta es la página más completa y extensa del sitio sobre este tema. Debe cubrir TODOS los ángulos importantes con profundidad real. Objetivo: mínimo 2500 palabras de contenido útil, bien estructurado y sin relleno.

${REGLAS_CONTENIDO}
${PATRON_SECCION}

DEVUELVE SOLO JSON sin markdown. Los campos "items", "headers" y "rows" solo aparecen cuando el type lo requiere (list, numbered_list, table). Para paragraph, example y callout esos campos no van.

Estructura esperada:
{
  "slug": "slug-en-kebab-case",
  "title": "H1 máximo 60 caracteres — informativo, no vendedor",
  "meta_description": "Máximo 160 caracteres — describe el contenido",
  "content_sections": [
    { "type": "heading2", "content": "Primer subtema", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras, solo conceptos.", "alt_text": "" },
    { "type": "list", "content": "", "alt_text": "", "items": ["Elemento 1", "Elemento 2", "Elemento 3"] },
    { "type": "callout", "content": "La idea más importante de esta sección.", "alt_text": "" },
    { "type": "example", "content": "Caso real: tipo empresa + país + situación + resultado.", "alt_text": "" },
    { "type": "heading2", "content": "Segundo subtema", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras.", "alt_text": "" },
    { "type": "numbered_list", "content": "", "alt_text": "", "items": ["Paso 1: descripción", "Paso 2: descripción", "Paso 3: descripción"] },
    { "type": "example", "content": "Caso real.", "alt_text": "" },
    { "type": "heading2", "content": "Tercer subtema — comparativo o de variables", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras.", "alt_text": "" },
    { "type": "table", "content": "", "alt_text": "", "headers": ["Columna 1", "Columna 2", "Columna 3"], "rows": [["celda", "celda", "celda"], ["celda", "celda", "celda"]] },
    { "type": "example", "content": "Caso real.", "alt_text": "" },
    { "type": "heading2", "content": "Cuarto subtema", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras.", "alt_text": "" },
    { "type": "paragraph", "content": "Segundo párrafo, ángulo diferente.", "alt_text": "" },
    { "type": "callout", "content": "Idea clave.", "alt_text": "" },
    { "type": "example", "content": "Caso real.", "alt_text": "" },
    { "type": "heading2", "content": "Quinto subtema", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras.", "alt_text": "" },
    { "type": "list", "content": "", "alt_text": "", "items": ["Item 1", "Item 2", "Item 3", "Item 4"] },
    { "type": "example", "content": "Caso real.", "alt_text": "" }
  ],
  "image_suggestions": [
    { "after_section": "Título del H2 donde va la imagen", "description": "Qué imagen o diagrama iría aquí (nota interna)" },
    { "after_section": "Otro H2", "description": "Imagen sugerida" }
  ],
  "faq_title": "Preguntas frecuentes sobre [tema]",
  "faq_subtitle": "Resuelve las dudas más comunes sobre [tema]",
  "faq_items": [
    { "question": "¿Pregunta real de alguien sin contexto?", "answer": "Respuesta clara de 3-4 oraciones con ejemplo si aplica." },
    { "question": "¿Segunda pregunta?", "answer": "Respuesta completa." },
    { "question": "¿Tercera pregunta?", "answer": "Respuesta completa." },
    { "question": "¿Cuarta pregunta?", "answer": "Respuesta completa." }
  ],
  "cta_text": "CTA informativo sin nombre de empresa."
}

Genera entre 6 y 8 bloques H2, cada uno con su mix visual variado. Los párrafos deben ser densos y aportar valor real — evita frases genéricas. faq_items exactamente 4. image_suggestions entre 3 y 5. VARÍA el mix visual entre secciones — no repitas el mismo patrón. El objetivo es crear la página más completa sobre este tema en internet en español.`
  }

  if (page_type === "secondary") {
    return `Eres un experto en SEO y redacción de contenido informativo de profundidad real.

Genera contenido para una Secondary Page (página secundaria) sobre: "${keyword}"
Esta página es el HUB de un subtema dentro de la estrategia SEO. Debe ser extensa, visualmente variada y servir como guía de referencia que el lector consulta antes de profundizar en las páginas de tercer nivel que dependen de ella.

${REGLAS_CONTENIDO}
${PATRON_SECCION}

REGLAS ADICIONALES PARA SECONDARY PAGES:
A. Si el contexto incluye "SUBTEMAS DE TERCER NIVEL", DEBES incluir un H2 dedicado que presente cada subtema con descripción breve. Úsalos todos — este H2 es el índice visual de la sección.
B. El contenido debe ser lo suficientemente completo para posicionar la keyword, pero debe dejar los detalles profundos para las páginas de tercer nivel.
C. Incluye siempre FAQ con 4 preguntas reales que la gente busca sobre este tema.

DEVUELVE SOLO JSON sin markdown. Los campos "items", "headers", "rows" solo aparecen en sus tipos correspondientes.

{
  "slug": "slug-en-kebab-case",
  "title": "H1 máximo 60 caracteres, informativo",
  "meta_description": "Máximo 160 caracteres",
  "content_sections": [
    { "type": "heading2", "content": "Qué es [tema]: definición y contexto", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras. Definición clara y por qué importa.", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras. Contexto más amplio, problema que resuelve, quién lo necesita.", "alt_text": "" },
    { "type": "callout", "content": "La idea clave que el lector no debe perderse.", "alt_text": "" },
    { "type": "example", "content": "Caso real.", "alt_text": "" },
    { "type": "heading2", "content": "Cómo funciona [tema] en la práctica", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras. Mecanismo, proceso o lógica de funcionamiento.", "alt_text": "" },
    { "type": "numbered_list", "content": "", "alt_text": "", "items": ["Paso/elemento 1: descripción", "Paso/elemento 2", "Paso/elemento 3", "Paso/elemento 4"] },
    { "type": "example", "content": "Caso real de funcionamiento.", "alt_text": "" },
    { "type": "heading2", "content": "Factores clave o variables que determinan [tema]", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras. Introduce las variables o dimensiones del tema.", "alt_text": "" },
    { "type": "table", "content": "", "alt_text": "", "headers": ["Variable", "Descripción", "Impacto"], "rows": [["Variable 1", "...", "..."], ["Variable 2", "...", "..."], ["Variable 3", "...", "..."]] },
    { "type": "example", "content": "Caso real.", "alt_text": "" },
    { "type": "heading2", "content": "[Subtemas o variantes] dentro de [tema]: guía completa", "alt_text": "" },
    { "type": "paragraph", "content": "120-150 palabras. Introduce los subtemas o variantes que se desarrollan en profundidad en las páginas relacionadas.", "alt_text": "" },
    { "type": "list", "content": "", "alt_text": "", "items": ["Subtema 1: descripción de 1-2 oraciones", "Subtema 2: descripción", "Subtema 3: descripción", "Subtema 4: descripción"] },
    { "type": "heading2", "content": "Cómo elegir o implementar [tema] según tu caso", "alt_text": "" },
    { "type": "paragraph", "content": "150-180 palabras. Criterios de decisión o pasos de implementación.", "alt_text": "" },
    { "type": "list", "content": "", "alt_text": "", "items": ["Criterio/paso 1", "Criterio/paso 2", "Criterio/paso 3"] },
    { "type": "callout", "content": "El criterio más importante para tomar la decisión correcta.", "alt_text": "" },
    { "type": "example", "content": "Caso real de implementación.", "alt_text": "" }
  ],
  "image_suggestions": [
    { "after_section": "H2 más visual del contenido", "description": "Imagen o diagrama sugerido" },
    { "after_section": "Otro H2 relevante", "description": "Segunda imagen sugerida" }
  ],
  "faq_title": "Preguntas frecuentes sobre [tema]",
  "faq_subtitle": "Respuestas a lo que más se busca en Google sobre este tema",
  "faq_items": [
    { "question": "¿Pregunta real de Google sobre este tema?", "answer": "Respuesta directa de 3-4 oraciones." },
    { "question": "¿Segunda pregunta frecuente?", "answer": "Respuesta completa." },
    { "question": "¿Tercera pregunta?", "answer": "Respuesta completa." },
    { "question": "¿Cuarta pregunta?", "answer": "Respuesta completa." }
  ],
  "cta_text": "CTA informativo sin nombre de empresa."
}

5 bloques H2, mix visual variado en cada uno. Los párrafos deben ser densos — 160-200 palabras cada uno con datos concretos, no generalidades. faq_items exactamente 4 preguntas reales. image_suggestions entre 2 y 3. Si el contexto indica subtemas de tercer nivel, el H2 de subtemas/variantes DEBE listarlos todos con descripción real de cada uno. Objetivo: página de referencia sobre el tema, mínimo 1800 palabras útiles.`
  }

  if (page_type === "third") {
    return `Eres un experto en SEO y redacción de contenido técnico informativo.

Genera contenido para una Third-Level Page (página de detalle) sobre: "${keyword}"
Responde una sola intención de búsqueda muy específica con profundidad real. El lector quiere entender el concepto a fondo, cómo funciona, cuándo usarlo y en qué se diferencia de los conceptos relacionados.

${REGLAS_CONTENIDO}
${PATRON_SECCION}

DEVUELVE SOLO JSON sin markdown. Los campos "items", "headers", "rows" solo aparecen en sus tipos correspondientes.

{
  "slug": "slug-en-kebab-case",
  "title": "H1 máximo 60 caracteres, muy específico",
  "meta_description": "Máximo 160 caracteres",
  "content_sections": [
    { "type": "heading2", "content": "Qué es [concepto]: definición y mecanismo", "alt_text": "" },
    { "type": "paragraph", "content": "Definición precisa + cómo funciona en la práctica. 150-180 palabras, sin ejemplos.", "alt_text": "" },
    { "type": "paragraph", "content": "Segundo ángulo: por qué existe este tipo, qué problema resuelve, contexto en la cadena de suministro. 150-180 palabras.", "alt_text": "" },
    { "type": "callout", "content": "La diferencia clave que el lector no debe perderse.", "alt_text": "" },
    { "type": "example", "content": "Caso real: tipo empresa + país + situación + resultado.", "alt_text": "" },
    { "type": "heading2", "content": "Cómo funciona [concepto] paso a paso", "alt_text": "" },
    { "type": "numbered_list", "content": "", "alt_text": "", "items": ["Paso 1: descripción detallada", "Paso 2", "Paso 3", "Paso 4"] },
    { "type": "paragraph", "content": "Consideraciones prácticas de implementación. 150-180 palabras.", "alt_text": "" },
    { "type": "example", "content": "Caso real de implementación.", "alt_text": "" },
    { "type": "heading2", "content": "Cuándo aplicar [concepto]: sectores y casos de uso", "alt_text": "" },
    { "type": "paragraph", "content": "En qué industrias o situaciones este tipo es el más adecuado. 150-180 palabras.", "alt_text": "" },
    { "type": "list", "content": "", "alt_text": "", "items": ["Caso de uso 1", "Caso de uso 2", "Caso de uso 3", "Caso de uso 4"] },
    { "type": "example", "content": "Caso real de un sector específico.", "alt_text": "" },
    { "type": "heading2", "content": "[Concepto] vs [tipo relacionado]: diferencias clave", "alt_text": "" },
    { "type": "paragraph", "content": "Introduce la comparación y explica cuándo elegir uno u otro. 120-150 palabras.", "alt_text": "" },
    { "type": "table", "content": "", "alt_text": "", "headers": ["Característica", "[Concepto actual]", "[Tipo relacionado]"], "rows": [["Dirección del flujo", "...", "..."], ["Qué rastrea", "...", "..."], ["Cuándo se usa", "...", "..."], ["Tecnología común", "...", "..."], ["Sector principal", "...", "..."]] }
  ],
  "image_suggestions": [
    { "after_section": "H2 más visual del contenido", "description": "Diagrama o ilustración sugerida (nota interna)" }
  ],
  "faq_title": "Preguntas frecuentes sobre [concepto]",
  "faq_subtitle": "Respuestas a lo que más se busca en Google sobre este tema",
  "faq_items": [
    { "question": "¿Pregunta real de alguien buscando en Google?", "answer": "Respuesta directa de 3-4 oraciones con ejemplo si aplica." },
    { "question": "¿Segunda pregunta frecuente?", "answer": "Respuesta completa." },
    { "question": "¿Tercera pregunta?", "answer": "Respuesta completa." },
    { "question": "¿Cuarta pregunta?", "answer": "Respuesta completa." }
  ],
  "cta_text": "CTA informativo sin nombre de empresa."
}

4 bloques H2. El último siempre es la tabla comparativa con el tipo más relacionado. faq_items exactamente 4 preguntas reales que la gente busca en Google. image_suggestions entre 1 y 2.`
  }

  // blog
  return `Eres un experto en SEO y redacción de contenido editorial informativo.

Genera contenido para un Blog Post sobre: "${keyword}"
Debe leer como un artículo útil, no como publicidad. El lector busca aprender algo concreto.

${REGLAS_CONTENIDO}

DEVUELVE SOLO JSON sin markdown con esta estructura exacta:
{
  "slug": "slug-en-kebab-case",
  "title": "Título máximo 60 caracteres — despierta curiosidad, no vende",
  "meta_description": "Máximo 160 caracteres",
  "paragraph_1": "Párrafo introductorio 170-190 palabras. Plantea el problema o situación que enfrenta el lector. Solo contexto, sin ejemplos todavía.",
  "example_1": "Caso de apertura: [tipo de empresa] en [ciudad/país] + situación concreta + cómo lo resolvieron. Máximo 5 oraciones.",
  "key_points": ["Punto clave 1 que cubre el artículo", "Punto clave 2", "Punto clave 3", "Punto clave 4"],
  "paragraph_2": "Desarrollo principal 170-190 palabras. Explica el mecanismo o concepto central. Sin ejemplos.",
  "paragraph_3": "Segundo ángulo de desarrollo 150-170 palabras. Profundiza en un aspecto diferente. Sin ejemplos.",
  "example_2": "Caso de desarrollo: diferente industria o país que ejemplo_1. Empresa + situación + aplicación + resultado. 4-5 oraciones.",
  "paragraph_4": "Cierre 150-170 palabras. Pasos concretos que el lector puede tomar. Sin mencionar empresas.",
  "image_suggestions": [
    { "after_section": "paragraph_1", "description": "Imagen que represente el escenario del intro" },
    { "after_section": "paragraph_2", "description": "Diagrama o infografía del mecanismo central" }
  ],
  "image_1_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  "image_1_alt": "Descripción alt relacionada con el tema principal",
  "image_2_url": "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80",
  "image_2_alt": "Descripción alt de la segunda imagen",
  "cta_text": "CTA informativo sin nombre de empresa."
}

Todo en español latinoamericano.`
}

function buildSitemapContext(memory: any, keyword: string, page_type: string, cluster_id: string, pillar_id: string): string {
  const allPages: any[] = [...(memory.pending_approval || []), ...(memory.published || [])]
  const sitemapNodes: any[] = memory.sitemap_nodes || []

  const h2sOf = (page: any): string[] =>
    page?.content?.content_sections
      ?.filter((s: any) => s.type === "heading2")
      ?.map((s: any) => s.content) || []

  let ctx = ""

  // For secondary pages: auto-detect third-level children in the sitemap
  if (page_type === "secondary") {
    const currentNode = sitemapNodes.find((n: any) =>
      n.keyword?.toLowerCase() === keyword?.toLowerCase()
    )
    if (currentNode) {
      const children = sitemapNodes.filter((n: any) => n.parent_id === currentNode.id)
      if (children.length > 0) {
        ctx += `\nSUBTEMAS DE TERCER NIVEL QUE DEPENDEN DE ESTA PÁGINA (third pages ya definidas en el sitemap):\n`
        for (const child of children) {
          ctx += `  - "${child.keyword}" → ${child.url}\n`
        }
        ctx += `\nINSTRUCCION CRITICA: Esta página es el HUB que introduce y conecta todos esos subtemas. DEBES:\n`
        ctx += `  1. Incluir un H2 dedicado que presente TODOS los subtemas de la lista anterior con una descripción de 1-2 oraciones cada uno.\n`
        ctx += `  2. Mencionar cada subtema al menos una vez en el cuerpo del contenido.\n`
        ctx += `  3. No desarrollar en profundidad cada subtema aquí — el lector encontrará eso en las páginas de tercer nivel.\n`
      }
    }
  }

  // Parent pillar page
  if (pillar_id && pillar_id !== "default") {
    const parent = allPages.find(p => p.id === pillar_id)
    if (parent?.content) {
      const h2s = h2sOf(parent)
      ctx += `\nPAGINA PADRE — "${parent.keyword}" (${parent.page_type}):\n`
      ctx += `  Título: ${parent.content.title}\n`
      if (h2s.length) ctx += `  Subtemas ya cubiertos: ${h2s.join(" | ")}\n`
      ctx += `  → Tu página debe profundizar en "${keyword}" sin repetir esos subtemas. Añade capas de detalle que la página padre no tiene espacio de cubrir.\n`
    }
  }

  // Parent pillar via cluster when pillar_id not set
  if ((!pillar_id || pillar_id === "default") && cluster_id && cluster_id !== "default") {
    const clusterPillar = allPages.find(p => p.cluster_id === cluster_id && p.page_type === "pillar")
    if (clusterPillar?.content) {
      const h2s = h2sOf(clusterPillar)
      ctx += `\nPAGINA PILAR DEL CLUSTER — "${clusterPillar.keyword}":\n`
      if (h2s.length) ctx += `  Subtemas cubiertos: ${h2s.join(" | ")}\n`
      ctx += `  → Complementa lo que cubre la pillar page sin duplicar sus secciones.\n`
    }
  }

  // Sibling pages (same cluster or same pillar_id, excluding current keyword)
  const siblings = allPages.filter(p =>
    p.keyword !== keyword &&
    (p.cluster_id === cluster_id || p.pillar_id === pillar_id) &&
    p.cluster_id !== "default" &&
    p.id !== pillar_id
  ).slice(0, 6)

  if (siblings.length > 0) {
    ctx += `\nPAGINAS HERMANAS YA GENERADAS (no repitas su contenido):\n`
    for (const s of siblings) {
      const h2s = h2sOf(s).slice(0, 4)
      ctx += `  - "${s.keyword}" (${s.page_type}): ${h2s.length ? h2s.join(" | ") : "sin secciones aún"}\n`
    }
    ctx += `  → Tu página debe tener un enfoque claramente distinto a estas. Aporta ángulos que ninguna hermana cubre.\n`
  }

  if (!ctx) return ""

  return `\n\nCONTEXTO DEL SITEMAP (páginas relacionadas ya existentes):${ctx}\nUSA este contexto para: (1) no repetir subtemas ya cubiertos, (2) referenciar conceptos de la página padre asumiendo que el lector ya los conoce, (3) añadir profundidad que complemente el ecosistema de contenido.\n`
}

async function detectInternalLinks(
  sections: any[],
  sitemapNodes: any[],
  currentKeyword: string
): Promise<{ anchor: string; url: string; keyword: string; context: string }[]> {
  if (!sitemapNodes.length) return []

  // Build compact readable version of the content
  const contentText = sections
    .map(s => {
      if (s.type === "heading2") return `[H2] ${s.content}`
      if (s.type === "paragraph" || s.type === "callout") return s.content?.substring(0, 400) || ""
      if (s.type === "example") return s.content?.substring(0, 200) || ""
      if (s.items?.length) return s.items.join(" | ")
      if (s.headers?.length) return `Tabla: ${s.headers.join(" | ")}`
      return ""
    })
    .filter(Boolean)
    .join("\n")
    .substring(0, 5000)

  const nodeList = sitemapNodes
    .filter(n => n.keyword?.toLowerCase() !== currentKeyword?.toLowerCase())
    .map(n => `${n.url} → "${n.keyword}"`)
    .join("\n")
    .substring(0, 3000)

  if (!nodeList) return []

  const prompt = `Eres un especialista en SEO técnico. Analiza este contenido y el sitemap disponible.
Identifica qué frases o conceptos del contenido coinciden con páginas del sitemap que valdría la pena enlazar internamente.

CONTENIDO DE LA PÁGINA:
${contentText}

SITEMAP DISPONIBLE (URL → keyword de la página):
${nodeList}

Devuelve SOLO JSON sin markdown — un array de links sugeridos:
[
  {
    "anchor": "frase exacta tal como aparece en el contenido (o variante muy cercana)",
    "url": "/url-exacto-del-sitemap",
    "keyword": "keyword del nodo del sitemap",
    "context": "título del H2 donde aparece esta mención"
  }
]

Reglas:
- Solo enlaces realmente útiles para el lector — que el link lleve a una página que profundice lo que se menciona
- Máximo 8 links por página
- No enlaces la página actual ("${currentKeyword}")
- Prioriza conceptos técnicos, métodos, tecnologías o subtemas específicos
- Si no hay coincidencias reales, devuelve []`

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "[]"
    return JSON.parse(raw.replace(/```json\n?|```/g, "").trim())
  } catch {
    return []
  }
}

function removeEmDash(val: any): any {
  if (typeof val === "string") return val.replace(/ — /g, ", ").replace(/—/g, "")
  if (Array.isArray(val)) return val.map(removeEmDash)
  if (val && typeof val === "object") return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, removeEmDash(v)]))
  return val
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, page_type, industry, cluster_id, pillar_id, research_id } = await req.json()

    if (!keyword?.trim()) {
      return Response.json({ error: "keyword es requerido" }, { status: 400 })
    }

    const memory = readMemory()

    // Context 1: sitemap — parent + sibling pages
    const sitemapContext = buildSitemapContext(memory, keyword, page_type, cluster_id || "default", pillar_id || "default")

    // Context 2: research + competitor analysis
    let researchContext = ""
    if (research_id) {
      const r = (memory.research || []).find((x: any) => x.id === research_id)
      if (r) {
        researchContext =
          `\n\nCONTEXTO DE INVESTIGACION (usa estos datos en el contenido):\n` +
          `Resumen: ${r.data.summary}\n` +
          `Hechos clave: ${r.data.key_facts?.join(" | ")}\n` +
          `Estadisticas: ${r.data.statistics?.map((s: any) => s.data).join(" | ")}\n` +
          `Oportunidades SEO: ${r.data.seo_opportunities?.join(" | ")}\n`

        // PAA questions from Google — use as base + complement with own questions
        if (r.data.paa_questions?.length) {
          researchContext +=
            `\nPREGUNTAS REALES DE GOOGLE (People Also Ask):\n` +
            r.data.paa_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n") +
            `\nUSA estas preguntas como base para los faq_items — pueden adaptarse, reformularse o complementarse con preguntas propias que adds valor. El objetivo es cubrir lo que la gente realmente busca en Google sobre este tema, más cualquier pregunta adicional que sea genuinamente útil.\n`
        }

        // Related searches — use to inspire sections or keywords
        if (r.data.related_searches?.length) {
          researchContext +=
            `\nBUSQUEDAS RELACIONADAS EN GOOGLE (úsalas para inspirar subtemas, secciones o ángulos del contenido):\n` +
            r.data.related_searches.join(" | ") + "\n"
        }

        if (r.competitor_analysis) {
          const ca = r.competitor_analysis
          researchContext +=
            `\nANALISIS COMPETITIVO (paginas que ya rankean en Google para este tema):\n` +
            `Temas que todos cubren (obligatorio incluir): ${ca.temas_comunes?.join(" | ")}\n` +
            `Content gaps (lo que nadie cubre bien — diferenciacion): ${ca.content_gaps?.join(" | ")}\n` +
            `Angulos unicos: ${ca.angulos_unicos_wetracking?.join(" | ")}\n` +
            `Estructura recomendada H2s: ${ca.estructura_recomendada?.join(" | ")}\n` +
            `Preguntas sin responder: ${ca.preguntas_sin_responder?.join(" | ")}\n` +
            `Elementos de engagement: ${ca.elementos_engagement?.join(" | ")}\n` +
            `\nINSTRUCCION: cubre los temas comunes Y explota los content gaps. Usa la estructura recomendada. Se mas especifico que cualquier competidor.\n`
        }
      }
    }

    const allContext = sitemapContext + researchContext

    const basePrompt = buildPrompt(keyword, page_type, industry)
    const finalPrompt = allContext ? basePrompt.replace(
      "DEVUELVE SOLO JSON",
      `${allContext}\nDEVUELVE SOLO JSON`
    ) : basePrompt

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: finalPrompt }],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""
    const clean = raw.replace(/```json\n?|```/g, "").trim()
    const content = removeEmDash(JSON.parse(clean))

    // Internal links — detect sitemap matches in the generated content (runs in parallel with nothing, fast Haiku call)
    const sitemapNodes: any[] = memory.sitemap_nodes || []
    const suggestedLinks = await detectInternalLinks(
      content.content_sections || [],
      sitemapNodes,
      keyword
    )

    // External sources — citations from research (already available, no extra API call)
    let externalSources: { url: string; domain: string }[] = []
    if (research_id) {
      const r = (memory.research || []).find((x: any) => x.id === research_id)
      const sources: string[] = r?.data?.sources || []
      externalSources = sources.slice(0, 6).map((url: string) => ({
        url,
        domain: (() => { try { return new URL(url).hostname.replace("www.", "") } catch { return url } })(),
      }))
    }

    const page = {
      id: Date.now().toString(),
      keyword,
      page_type,
      industry,
      cluster_id: cluster_id || "default",
      pillar_id: pillar_id || "default",
      content: {
        ...content,
        suggested_links: suggestedLinks,
        external_sources: externalSources,
      },
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
