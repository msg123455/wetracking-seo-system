"use client"
import { useState, useEffect } from "react"

type Keyword = { id: string; keyword: string; volume: string; difficulty: string; intent: string }
type Cluster = { id: string; name: string; created_at: string }
type ContentSection = { type: "heading2" | "heading3" | "paragraph" | "image"; content: string; alt_text: string }
type FaqItem = { question: string; answer: string }

type PillarContent = {
  slug: string; title: string; meta_description: string
  content_sections: ContentSection[]; faq_title: string; faq_subtitle: string
  faq_items: FaqItem[]; cta_text: string
}
type SecondaryContent = {
  slug: string; title: string; meta_description: string
  content_sections: ContentSection[]; cta_text: string
}
type BlogContent = {
  slug: string; title: string; meta_description: string
  paragraph_1: string; paragraph_2: string; paragraph_3: string
  image_1_url: string; image_1_alt: string; image_2_url: string; image_2_alt: string
  cta_text: string
}

type Page = {
  id: string; keyword: string; page_type: "pillar" | "secondary" | "blog"
  industry: string; cluster_id: string; pillar_id: string
  content: PillarContent & SecondaryContent & BlogContent
  status: string; created_at: string
}

type SitemapEntry = { url: string; keyword: string; lastmod: string; priority: string; entity?: string }

type Tab = "keywords" | "generate" | "pending" | "clusters" | "sitemap"

const PAGE_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pillar:    { label: "Pillar",    color: "#6f42c1", bg: "#f3eeff" },
  secondary: { label: "Secondary", color: "#007aed", bg: "#e8f4fd" },
  blog:      { label: "Blog",      color: "#fd7e14", bg: "#fff3e8" },
}

export default function SEOCommandCenter() {
  const [tab, setTab] = useState<Tab>("keywords")
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [pending, setPending] = useState<Page[]>([])
  const [sitemap, setSitemap] = useState<SitemapEntry[]>([])

  const [newKeyword, setNewKeyword] = useState("")
  const [newClusterName, setNewClusterName] = useState("")
  const [newClusterId, setNewClusterId] = useState("")

  const [genKeyword, setGenKeyword] = useState("")
  const [genType, setGenType] = useState<"pillar" | "secondary" | "blog">("pillar")
  const [genIndustry, setGenIndustry] = useState("RFID general")
  const [genClusterId, setGenClusterId] = useState("")
  const [genPillarId, setGenPillarId] = useState("")

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null)
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [kRes, pRes, sRes, cRes] = await Promise.all([
      fetch("/api/keywords"),
      fetch("/api/pending"),
      fetch("/api/sitemap"),
      fetch("/api/clusters"),
    ])
    setKeywords(await kRes.json())
    setPending(await pRes.json())
    const sData = await sRes.json()
    setSitemap(sData.published || [])
    setClusters(await cRes.json())
  }

  function notify(text: string, type: "success" | "error" | "info" = "info") {
    setMessage({ text, type })
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return
    await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: newKeyword }),
    })
    setNewKeyword("")
    loadData()
  }

  async function addCluster() {
    if (!newClusterName.trim() || !newClusterId.trim()) return
    const res = await fetch("/api/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClusterName, id: newClusterId }),
    })
    if (res.ok) {
      setNewClusterName("")
      setNewClusterId("")
      loadData()
    } else {
      const data = await res.json()
      notify(data.error, "error")
    }
  }

  async function deleteCluster(id: string) {
    await fetch("/api/clusters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    loadData()
  }

  async function generateContent() {
    if (!genKeyword.trim()) return
    setLoading(true)
    notify("Generando contenido con Claude...", "info")
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: genKeyword,
          page_type: genType,
          industry: genIndustry,
          cluster_id: genClusterId || "default",
          pillar_id: genPillarId || "default",
        }),
      })
      if (!res.ok) throw new Error("API error")
      notify(`✓ Contenido generado para "${genKeyword}" — revisa en Pendientes`, "success")
      setGenKeyword("")
      setTab("pending")
      loadData()
    } catch {
      notify("Error al generar. Verifica tu ANTHROPIC_API_KEY.", "error")
    }
    setLoading(false)
  }

  async function publishPage(id: string) {
    setLoading(true)
    notify("Publicando en Base44 y disparando redeploy en Vercel...", "info")
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      notify(`✓ Publicado en Base44 (${data.entity}) y redeploy disparado`, "success")
      loadData()
    } catch (e: any) {
      notify(`Error publicando: ${e.message}`, "error")
    }
    setLoading(false)
  }

  async function rejectPage(id: string) {
    await fetch("/api/pending", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: id }),
    })
    loadData()
  }

  const tabDef: { key: Tab; label: string; count?: number }[] = [
    { key: "keywords",  label: "Keywords",         count: keywords.length },
    { key: "generate",  label: "Generar Contenido" },
    { key: "pending",   label: "Pendientes",        count: pending.length },
    { key: "clusters",  label: "Clusters",          count: clusters.length },
    { key: "sitemap",   label: "Publicadas",        count: sitemap.length },
  ]

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f2f3f7" }}>

      {/* ── Header ── */}
      <div style={{ background: "#0b194f", padding: "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ color: "#00ffd7", fontWeight: 800, fontSize: 22 }}>WeTracking</span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
        <span style={{ color: "white", fontWeight: 600, fontSize: 17 }}>SEO Command Center</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <HeaderStat label="Keywords"  value={keywords.length} />
          <HeaderStat label="Pendientes" value={pending.length} highlight={pending.length > 0} />
          <HeaderStat label="Clusters"  value={clusters.length} />
          <HeaderStat label="Publicadas" value={sitemap.length} />
        </div>
      </div>

      {/* ── Mensaje ── */}
      {message && (
        <div style={{
          background: message.type === "success" ? "#d4edda" : message.type === "error" ? "#f8d7da" : "#fff3cd",
          padding: "10px 32px", borderBottom: "1px solid #ddd", color: "#333", fontSize: 14,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: "0 32px", background: "white", display: "flex", borderBottom: "2px solid #eee" }}>
        {tabDef.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "13px 20px", border: "none", background: "none", cursor: "pointer",
            fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "#007aed" : "#666",
            borderBottom: tab === t.key ? "3px solid #007aed" : "3px solid transparent",
            marginBottom: -2, fontSize: 14, whiteSpace: "nowrap",
          }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>

        {/* ─── TAB: KEYWORDS ─── */}
        {tab === "keywords" && (
          <div>
            <h2 style={h2}>Banco de Keywords</h2>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()}
                placeholder="ej: gestión de activos RFID Colombia"
                style={{ ...input, flex: 1 }} />
              <button onClick={addKeyword} style={btnBlue}>Agregar</button>
            </div>
            {keywords.length === 0
              ? <Empty text="Sin keywords aún. Agrega la primera arriba." />
              : keywords.map(k => (
                <div key={k.id} style={{ ...card, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0b194f" }}>{k.keyword}</span>
                    <Badge text={k.intent} />
                    <Badge text={k.difficulty} />
                  </div>
                  <button onClick={() => { setGenKeyword(k.keyword); setTab("generate") }} style={btnCyan}>
                    → Generar página
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {/* ─── TAB: GENERAR CONTENIDO ─── */}
        {tab === "generate" && (
          <div>
            <h2 style={h2}>Generar Contenido SEO con Claude</h2>
            <div style={{ background: "white", padding: 28, borderRadius: 12, border: "1px solid #eee" }}>

              <Field label="Keyword objetivo">
                <input value={genKeyword} onChange={e => setGenKeyword(e.target.value)}
                  placeholder="ej: sistema rastreo activos RFID manufactura"
                  style={{ ...input, width: "100%", boxSizing: "border-box" }} />
              </Field>

              <div style={{ display: "flex", gap: 16 }}>
                <Field label="Tipo de página" style={{ flex: 1 }}>
                  <select value={genType} onChange={e => setGenType(e.target.value as any)} style={{ ...select }}>
                    <option value="pillar">Pillar Page → PillarPage</option>
                    <option value="secondary">Secondary Page → SecondaryPage</option>
                    <option value="blog">Blog Post → BlogPost</option>
                  </select>
                </Field>
                <Field label="Industria" style={{ flex: 1 }}>
                  <select value={genIndustry} onChange={e => setGenIndustry(e.target.value)} style={select}>
                    <option value="RFID general">RFID General</option>
                    <option value="retail">Retail</option>
                    <option value="manufactura">Manufactura</option>
                    <option value="clubes y gimnasios">Clubes y Gimnasios</option>
                    <option value="industria petrolera">Industria Petrolera</option>
                    <option value="bodegas y logistica">Bodegas y Logística</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <Field label="Cluster ID" style={{ flex: 1 }}>
                  <input value={genClusterId} onChange={e => setGenClusterId(e.target.value)}
                    list="cluster-list" placeholder='ej: rfid-manufactura o "default"'
                    style={{ ...input, width: "100%", boxSizing: "border-box" }} />
                  <datalist id="cluster-list">
                    {clusters.map(c => <option key={c.id} value={c.id} label={c.name} />)}
                  </datalist>
                  {clusters.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {clusters.map(c => (
                        <button key={c.id} onClick={() => setGenClusterId(c.id)} style={{
                          padding: "3px 10px", background: genClusterId === c.id ? "#0b194f" : "#f0f0f0",
                          color: genClusterId === c.id ? "white" : "#555",
                          border: "none", borderRadius: 20, cursor: "pointer", fontSize: 12
                        }}>{c.name}</button>
                      ))}
                    </div>
                  )}
                </Field>
                {genType === "secondary" && (
                  <Field label="Pillar ID" style={{ flex: 1 }}>
                    <input value={genPillarId} onChange={e => setGenPillarId(e.target.value)}
                      placeholder='Slug del pillar padre o "default"'
                      style={{ ...input, width: "100%", boxSizing: "border-box" }} />
                  </Field>
                )}
              </div>

              <button onClick={generateContent} disabled={loading || !genKeyword.trim()} style={{
                ...btnBlue, width: "100%", padding: "14px", fontSize: 16,
                marginTop: 8, opacity: loading || !genKeyword.trim() ? 0.55 : 1,
                cursor: loading || !genKeyword.trim() ? "not-allowed" : "pointer",
              }}>
                {loading ? "Generando con Claude..." : "Generar contenido con Claude"}
              </button>
              <p style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginTop: 10, marginBottom: 0 }}>
                Modelo: claude-opus-4-5 · El resultado va a Pendientes para tu aprobación
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB: PENDIENTES ─── */}
        {tab === "pending" && (
          <div>
            <h2 style={h2}>Pendientes de Aprobación</h2>
            {pending.length === 0
              ? <Empty text="Sin páginas pendientes. Genera contenido primero." />
              : pending.map(p => {
                const typeInfo = PAGE_TYPE_LABELS[p.page_type] || PAGE_TYPE_LABELS.pillar
                const isExpanded = expandedPage === p.id
                return (
                  <div key={p.id} style={{ background: "white", borderRadius: 12, border: "1px solid #eee", marginBottom: 14, overflow: "hidden" }}>
                    <div style={{ padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <h3 style={{ margin: 0, color: "#0b194f", fontSize: 15 }}>{p.content?.title || p.keyword}</h3>
                          <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: typeInfo.bg, color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                          <Badge text={p.industry} />
                        </div>
                        <p style={{ margin: "3px 0 0", color: "#888", fontSize: 12 }}>
                          /{p.content?.slug}
                          {p.cluster_id && p.cluster_id !== "default" && <> · cluster: <code style={codeStyle}>{p.cluster_id}</code></>}
                          {p.page_type === "secondary" && p.pillar_id && p.pillar_id !== "default" && <> · pillar: <code style={codeStyle}>{p.pillar_id}</code></>}
                          {" · "}{new Date(p.created_at).toLocaleDateString("es-CO")}
                        </p>
                        <p style={{ margin: "6px 0 0", color: "#555", fontSize: 13, lineHeight: 1.5 }}>{p.content?.meta_description}</p>
                      </div>
                      <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                        <button onClick={() => setExpandedPage(isExpanded ? null : p.id)}
                          style={{ padding: "7px 13px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
                          {isExpanded ? "Cerrar" : "Ver"}
                        </button>
                        <button onClick={() => rejectPage(p.id)}
                          style={{ padding: "7px 13px", background: "#fff0f0", color: "#dc3545", border: "1px solid #f5c2c7", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
                          Rechazar
                        </button>
                        <button onClick={() => publishPage(p.id)} disabled={loading}
                          style={{ ...btnCyan, padding: "7px 15px", fontSize: 12, opacity: loading ? 0.55 : 1 }}>
                          ✓ Publicar
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #f0f0f0", padding: "18px 22px", background: "#fafafa" }}>
                        <div style={{ marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <PreviewMeta label="Meta title" text={p.content?.title} />
                          <PreviewMeta label="Meta description" text={p.content?.meta_description} />
                          <PreviewMeta label="CTA" text={p.content?.cta_text} />
                        </div>
                        <ContentPreview page={p} />
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ─── TAB: CLUSTERS ─── */}
        {tab === "clusters" && (
          <div>
            <h2 style={h2}>Clusters de Contenido</h2>
            <p style={{ color: "#666", fontSize: 14, marginTop: -12, marginBottom: 24 }}>
              Agrupa Pillar Pages y Secondary Pages. El ID aquí debe coincidir exactamente con <code style={codeStyle}>cluster_id</code> en Base44.
            </p>
            <div style={{ background: "white", padding: 22, borderRadius: 12, border: "1px solid #eee", marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <Field label="Nombre del cluster" style={{ flex: 1, marginBottom: 0 }}>
                  <input value={newClusterName} onChange={e => setNewClusterName(e.target.value)}
                    placeholder="ej: Manufactura RFID"
                    style={{ ...input, width: "100%", boxSizing: "border-box" }} />
                </Field>
                <Field label="ID (usado en Base44)" style={{ flex: 1, marginBottom: 0 }}>
                  <input value={newClusterId} onChange={e => setNewClusterId(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCluster()}
                    placeholder="ej: manufactura-rfid"
                    style={{ ...input, width: "100%", boxSizing: "border-box" }} />
                </Field>
                <button onClick={addCluster} style={{ ...btnBlue, flexShrink: 0, marginBottom: 0 }}>Agregar</button>
              </div>
            </div>

            {clusters.length === 0
              ? <Empty text="Sin clusters. Agrégalos para organizar tu contenido." />
              : clusters.map(c => (
                <div key={c.id} style={{ ...card, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0b194f" }}>{c.name}</span>
                    <code style={{ ...codeStyle, marginLeft: 10, fontSize: 13 }}>{c.id}</code>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#aaa", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString("es-CO")}</span>
                    <button onClick={() => { setGenClusterId(c.id); setTab("generate") }} style={btnCyan}>
                      Usar en generación
                    </button>
                    <button onClick={() => deleteCluster(c.id)} style={{ padding: "6px 12px", background: "#fff0f0", color: "#dc3545", border: "1px solid #f5c2c7", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ─── TAB: SITEMAP / PUBLICADAS ─── */}
        {tab === "sitemap" && (
          <div>
            <h2 style={h2}>Páginas Publicadas en Base44</h2>
            {sitemap.length === 0
              ? <Empty text="Sin páginas publicadas. Aprueba páginas desde Pendientes." />
              : sitemap.map((s, i) => {
                const typeInfo = PAGE_TYPE_LABELS[s.entity?.toLowerCase().replace("page", "").replace("post", "") ?? "pillar"]
                return (
                  <div key={i} style={{ ...card, flexDirection: "column", alignItems: "flex-start", gap: 4, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span style={{ fontWeight: 600, color: "#0b194f", fontSize: 14 }}>{s.keyword}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {s.entity && <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#f0f0f0", color: "#555" }}>{s.entity}</span>}
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#f0fff4", color: "#28a745" }}>p{s.priority}</span>
                      </div>
                    </div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#007aed", fontSize: 13 }}>{s.url}</a>
                    <span style={{ color: "#bbb", fontSize: 12 }}>Publicado: {new Date(s.lastmod).toLocaleDateString("es-CO")}</span>
                  </div>
                )
              })
            }
            <div style={{ marginTop: 20, background: "white", padding: 18, borderRadius: 10, border: "1px solid #eee" }}>
              <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
                Sitemap XML autogenerado en <code style={codeStyle}>wetracking.co/sitemap.xml</code>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Subcomponentes ──

function ContentPreview({ page }: { page: Page }) {
  const { page_type, content } = page
  if (page_type === "blog") {
    return (
      <div>
        <PreviewBlock label="Párrafo 1" text={content.paragraph_1} />
        <PreviewBlock label="Párrafo 2" text={content.paragraph_2} />
        <PreviewBlock label="Párrafo 3" text={content.paragraph_3} />
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>Imagen 1 alt</span>
            <p style={{ margin: 0, fontSize: 13, color: "#555", fontStyle: "italic" }}>{content.image_1_alt}</p>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>Imagen 2 alt</span>
            <p style={{ margin: 0, fontSize: 13, color: "#555", fontStyle: "italic" }}>{content.image_2_alt}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Content Sections ({content.content_sections?.length || 0})
      </span>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {content.content_sections?.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{
              flexShrink: 0, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: s.type === "heading2" ? "#e8f4fd" : s.type === "heading3" ? "#f0f0f0" : "#fafafa",
              color: s.type === "heading2" ? "#007aed" : "#888",
              border: "1px solid #e0e0e0", fontFamily: "monospace"
            }}>{s.type}</span>
            <p style={{ margin: 0, fontSize: 13, color: s.type.startsWith("heading") ? "#0b194f" : "#666", fontWeight: s.type.startsWith("heading") ? 600 : 400 }}>
              {s.content}
            </p>
          </div>
        ))}
      </div>
      {page_type === "pillar" && content.faq_items?.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
            FAQ — {content.faq_title}
          </span>
          <p style={{ margin: "2px 0 10px", fontSize: 12, color: "#aaa" }}>{content.faq_subtitle}</p>
          {content.faq_items.map((f, i) => (
            <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: "3px solid #00ffd7" }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#333" }}>{f.question}</p>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#666" }}>{f.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeaderStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 13px" }}>
      <div style={{ color: highlight && value > 0 ? "#00ffd7" : "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: "white", fontWeight: 800, fontSize: 19, lineHeight: 1.2 }}>{value}</div>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#0b194f", fontSize: 13 }}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ text }: { text: string }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#f0f0f0", color: "#777", marginLeft: 6 }}>{text}</span>
}

function PreviewMeta({ label, text }: { label: string; text?: string }) {
  if (!text) return null
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#555", fontFamily: "monospace", background: "#f0f0f0", padding: "4px 8px", borderRadius: 4 }}>{text}</p>
    </div>
  )
}

function PreviewBlock({ label, text }: { label: string; text?: string }) {
  if (!text) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      <p style={{ margin: "3px 0 0", fontSize: 13, color: "#555", lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: "center", padding: "44px 24px", color: "#bbb", background: "white", borderRadius: 12, border: "1px dashed #ddd", fontSize: 14 }}>{text}</div>
}

// ── Estilos base ──

const h2: React.CSSProperties = { color: "#0b194f", marginBottom: 20, marginTop: 0, fontSize: 21 }

const input: React.CSSProperties = {
  padding: "10px 13px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none",
}

const select: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
}

const card: React.CSSProperties = {
  background: "white", padding: "13px 18px", borderRadius: 10, border: "1px solid #eee",
  display: "flex", justifyContent: "space-between", alignItems: "center",
}

const codeStyle: React.CSSProperties = {
  background: "#f0f0f0", padding: "1px 6px", borderRadius: 4, fontSize: 12, fontFamily: "monospace",
}

const btnBlue: React.CSSProperties = {
  padding: "10px 22px", background: "#007aed", color: "white",
  border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
}

const btnCyan: React.CSSProperties = {
  padding: "7px 16px", background: "#00ffd7", color: "#0b194f",
  border: "none", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 13,
}
