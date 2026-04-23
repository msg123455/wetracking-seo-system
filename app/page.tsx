"use client"
import { useState, useEffect } from "react"

type Keyword = {
  id: string
  keyword: string
  volume: string
  difficulty: string
  intent: string
  status: string
}

type Page = {
  id: string
  keyword: string
  page_type: string
  industry: string
  content: {
    h1: string
    slug: string
    meta_title: string
    meta_description: string
    intro: string
    sections: { h2: string; content: string }[]
    faq: { question: string; answer: string }[]
    cta: string
  }
  status: string
  created_at: string
}

type SitemapEntry = {
  url: string
  keyword: string
  lastmod: string
  priority: string
}

export default function SEOCommandCenter() {
  const [tab, setTab] = useState<"keywords" | "generate" | "pending" | "sitemap">("keywords")
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [pending, setPending] = useState<Page[]>([])
  const [sitemap, setSitemap] = useState<SitemapEntry[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [genKeyword, setGenKeyword] = useState("")
  const [genType, setGenType] = useState("pillar")
  const [genIndustry, setGenIndustry] = useState("RFID general")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [kRes, pRes, sRes] = await Promise.all([
      fetch("/api/keywords"),
      fetch("/api/pending"),
      fetch("/api/sitemap"),
    ])
    setKeywords(await kRes.json())
    setPending(await pRes.json())
    const sData = await sRes.json()
    setSitemap(sData.published || [])
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

  async function generateContent() {
    if (!genKeyword.trim()) return
    setLoading(true)
    setMessage("Generando contenido con IA...")
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: genKeyword, page_type: genType, industry: genIndustry }),
      })
      if (!res.ok) throw new Error("API error")
      await res.json()
      setMessage(`✓ Contenido generado para "${genKeyword}" — revisa en Pendientes`)
      setGenKeyword("")
      setTab("pending")
      loadData()
    } catch {
      setMessage("✗ Error generando contenido. Verifica tu ANTHROPIC_API_KEY.")
    }
    setLoading(false)
  }

  async function publishPage(id: string) {
    setLoading(true)
    setMessage("Publicando en Base44 y disparando redeploy en Vercel...")
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: id }),
      })
      if (!res.ok) throw new Error("Publish error")
      setMessage("✓ Página publicada en Base44 y Vercel")
      loadData()
    } catch {
      setMessage("✗ Error publicando. Verifica BASE44_API_KEY y VERCEL_TOKEN.")
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

  const tabLabels = {
    keywords: `Keywords (${keywords.length})`,
    generate: "Generar Contenido",
    pending: `Pendientes (${pending.length})`,
    sitemap: `Publicadas (${sitemap.length})`,
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f2f3f7" }}>
      {/* Header */}
      <div style={{ background: "#0b194f", padding: "18px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ color: "#00ffd7", fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>WeTracking</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>|</div>
        <div style={{ color: "white", fontWeight: 600, fontSize: 17 }}>SEO Command Center</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <Stat label="Keywords" value={keywords.length} />
          <Stat label="Pendientes" value={pending.length} accent />
          <Stat label="Publicadas" value={sitemap.length} />
        </div>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div style={{
          background: message.startsWith("✓") ? "#d4edda" : message.startsWith("✗") ? "#f8d7da" : "#fff3cd",
          padding: "11px 32px", borderBottom: "1px solid #ddd", color: "#333", fontSize: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{message}</span>
          <button onClick={() => setMessage("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: "0 32px", background: "white", display: "flex", borderBottom: "2px solid #eee" }}>
        {(Object.keys(tabLabels) as Array<keyof typeof tabLabels>).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "14px 22px", border: "none", background: "none", cursor: "pointer",
            fontWeight: tab === t ? 700 : 400,
            color: tab === t ? "#007aed" : "#666",
            borderBottom: tab === t ? "3px solid #007aed" : "3px solid transparent",
            marginBottom: -2, fontSize: 14, whiteSpace: "nowrap",
          }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>

        {/* ── TAB: KEYWORDS ── */}
        {tab === "keywords" && (
          <div>
            <h2 style={h2Style}>Banco de Keywords</h2>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()}
                placeholder="ej: gestión de activos RFID Colombia"
                style={inputStyle}
              />
              <button onClick={addKeyword} style={btnPrimary}>Agregar</button>
            </div>
            {keywords.length === 0
              ? <Empty text="Sin keywords aún. Agrega la primera arriba." />
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {keywords.map(k => (
                    <div key={k.id} style={cardStyle}>
                      <div>
                        <span style={{ fontWeight: 600, color: "#0b194f" }}>{k.keyword}</span>
                        <span style={badgeStyle}>{k.intent}</span>
                        <span style={badgeStyle}>{k.difficulty}</span>
                      </div>
                      <button
                        onClick={() => { setGenKeyword(k.keyword); setTab("generate") }}
                        style={btnCyan}
                      >
                        → Generar página
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── TAB: GENERAR CONTENIDO ── */}
        {tab === "generate" && (
          <div>
            <h2 style={h2Style}>Generar Contenido SEO con Claude</h2>
            <div style={{ background: "white", padding: 28, borderRadius: 12, border: "1px solid #eee" }}>
              <Field label="Keyword objetivo">
                <input
                  value={genKeyword}
                  onChange={e => setGenKeyword(e.target.value)}
                  placeholder="ej: sistema rastreo activos RFID manufactura"
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </Field>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <Field label="Tipo de página" style={{ flex: 1 }}>
                  <select value={genType} onChange={e => setGenType(e.target.value)} style={selectStyle}>
                    <option value="pillar">Pillar Page</option>
                    <option value="secondary">Secondary Page</option>
                    <option value="blog">Blog Post</option>
                    <option value="landing">Landing Page</option>
                  </select>
                </Field>
                <Field label="Industria" style={{ flex: 1 }}>
                  <select value={genIndustry} onChange={e => setGenIndustry(e.target.value)} style={selectStyle}>
                    <option value="RFID general">RFID General</option>
                    <option value="retail">Retail</option>
                    <option value="manufactura">Manufactura</option>
                    <option value="clubes y gimnasios">Clubes y Gimnasios</option>
                    <option value="industria petrolera">Industria Petrolera</option>
                    <option value="bodegas y logistica">Bodegas y Logística</option>
                  </select>
                </Field>
              </div>
              <button
                onClick={generateContent}
                disabled={loading || !genKeyword.trim()}
                style={{ ...btnPrimary, width: "100%", padding: "14px", fontSize: 16, opacity: loading || !genKeyword.trim() ? 0.6 : 1, cursor: loading || !genKeyword.trim() ? "not-allowed" : "pointer" }}
              >
                {loading ? "Generando con IA..." : "Generar contenido con Claude"}
              </button>
              <p style={{ color: "#999", fontSize: 12, marginTop: 12, textAlign: "center" }}>
                Usa claude-opus-4-5 · El resultado va a Pendientes para tu aprobación
              </p>
            </div>
          </div>
        )}

        {/* ── TAB: PENDIENTES ── */}
        {tab === "pending" && (
          <div>
            <h2 style={h2Style}>Pendientes de Aprobación</h2>
            {pending.length === 0
              ? <Empty text="Sin páginas pendientes. Genera contenido primero." />
              : pending.map(p => (
                <div key={p.id} style={{ background: "white", borderRadius: 12, border: "1px solid #eee", marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <h3 style={{ margin: 0, color: "#0b194f", fontSize: 16 }}>{p.content?.h1 || p.keyword}</h3>
                        <span style={{ ...badgeStyle, background: "#e8f4fd", color: "#007aed" }}>{p.page_type}</span>
                        <span style={{ ...badgeStyle, background: "#f0fff4", color: "#28a745" }}>{p.industry}</span>
                      </div>
                      <p style={{ margin: "2px 0 0", color: "#888", fontSize: 13 }}>
                        /{p.content?.slug} · {new Date(p.created_at).toLocaleDateString("es-CO")}
                      </p>
                      <p style={{ margin: "8px 0 0", color: "#555", fontSize: 13, lineHeight: 1.5 }}>{p.content?.meta_description}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginLeft: 16, flexShrink: 0 }}>
                      <button
                        onClick={() => setExpandedPage(expandedPage === p.id ? null : p.id)}
                        style={{ padding: "8px 14px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
                      >
                        {expandedPage === p.id ? "Ocultar" : "Ver"}
                      </button>
                      <button onClick={() => rejectPage(p.id)} style={{ padding: "8px 14px", background: "#fff0f0", color: "#dc3545", border: "1px solid #f5c2c7", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                        Rechazar
                      </button>
                      <button onClick={() => publishPage(p.id)} disabled={loading} style={{ ...btnCyan, padding: "8px 16px", fontSize: 13, opacity: loading ? 0.6 : 1 }}>
                        ✓ Publicar
                      </button>
                    </div>
                  </div>

                  {expandedPage === p.id && (
                    <div style={{ borderTop: "1px solid #eee", padding: "20px 24px", background: "#fafafa" }}>
                      <PreviewSection title="Meta title" text={p.content?.meta_title} mono />
                      <PreviewSection title="Meta description" text={p.content?.meta_description} mono />
                      <PreviewSection title="Introducción" text={p.content?.intro} />
                      {p.content?.sections?.map((s, i) => (
                        <PreviewSection key={i} title={s.h2} text={s.content} />
                      ))}
                      <div style={{ marginTop: 16 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#0b194f" }}>FAQ ({p.content?.faq?.length || 0} preguntas)</span>
                        {p.content?.faq?.map((f, i) => (
                          <div key={i} style={{ marginTop: 8, paddingLeft: 12, borderLeft: "3px solid #00ffd7" }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#333" }}>{f.question}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>{f.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* ── TAB: SITEMAP ── */}
        {tab === "sitemap" && (
          <div>
            <h2 style={h2Style}>Páginas Publicadas</h2>
            {sitemap.length === 0
              ? <Empty text="Sin páginas publicadas. Aprueba y publica desde Pendientes." />
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sitemap.map((s, i) => (
                    <div key={i} style={{ ...cardStyle, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ fontWeight: 600, color: "#0b194f", fontSize: 14 }}>{s.keyword}</span>
                        <span style={{ ...badgeStyle, background: "#f0fff4", color: "#28a745" }}>priority {s.priority}</span>
                      </div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#007aed", fontSize: 13, textDecoration: "none" }}>{s.url}</a>
                      <span style={{ color: "#aaa", fontSize: 12 }}>Publicado: {new Date(s.lastmod).toLocaleDateString("es-CO")}</span>
                    </div>
                  ))}
                </div>
              )
            }
            <div style={{ marginTop: 24, background: "white", padding: 20, borderRadius: 12, border: "1px solid #eee" }}>
              <p style={{ margin: 0, color: "#555", fontSize: 14 }}>
                El sitemap XML se genera automáticamente en <code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>wetracking.co/sitemap.xml</code>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Componentes auxiliares ──

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px" }}>
      <div style={{ color: accent && value > 0 ? "#00ffd7" : "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: "white", fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{value}</div>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#0b194f", fontSize: 14 }}>{label}</label>
      {children}
    </div>
  )
}

function PreviewSection({ title, text, mono }: { title: string; text?: string; mono?: boolean }) {
  if (!text) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 13, color: "#0b194f" }}>{title}</span>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555", fontFamily: mono ? "monospace" : "inherit", background: mono ? "#f5f5f5" : "transparent", padding: mono ? "4px 8px" : 0, borderRadius: 4 }}>{text}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#999", background: "white", borderRadius: 12, border: "1px dashed #ddd" }}>
      {text}
    </div>
  )
}

// ── Estilos reutilizables ──

const h2Style: React.CSSProperties = { color: "#0b194f", marginBottom: 20, marginTop: 0, fontSize: 22 }

const inputStyle: React.CSSProperties = {
  flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14,
}

const cardStyle: React.CSSProperties = {
  background: "white", padding: "14px 20px", borderRadius: 10, border: "1px solid #eee",
  display: "flex", justifyContent: "space-between", alignItems: "center",
}

const badgeStyle: React.CSSProperties = {
  display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11,
  fontWeight: 600, background: "#f0f0f0", color: "#666", marginLeft: 6,
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 22px", background: "#007aed", color: "white",
  border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
}

const btnCyan: React.CSSProperties = {
  padding: "8px 18px", background: "#00ffd7", color: "#0b194f",
  border: "none", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 14,
}
