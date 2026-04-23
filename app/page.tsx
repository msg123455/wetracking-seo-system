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
  content: any
  status: string
  created_at: string
}

export default function SEOCommandCenter() {
  const [tab, setTab] = useState<"keywords" | "generate" | "pending" | "sitemap">("keywords")
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [pending, setPending] = useState<Page[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [genKeyword, setGenKeyword] = useState("")
  const [genType, setGenType] = useState("pillar")
  const [genIndustry, setGenIndustry] = useState("RFID")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const kRes = await fetch("/api/keywords")
    const kData = await kRes.json()
    setKeywords(kData)

    const sRes = await fetch("/api/sitemap")
    const sData = await sRes.json()
    setPending([])
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return
    await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: newKeyword })
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
        body: JSON.stringify({ keyword: genKeyword, page_type: genType, industry: genIndustry })
      })
      const data = await res.json()
      setMessage(`✓ Contenido generado para "${genKeyword}" — revisa en Pendientes`)
      setTab("pending")
      loadData()
    } catch {
      setMessage("Error generando contenido")
    }
    setLoading(false)
  }

  async function publishPage(id: string) {
    setLoading(true)
    setMessage("Publicando en Base44 y Vercel...")
    try {
      await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: id })
      })
      setMessage("✓ Página publicada en Base44 y Vercel")
      loadData()
    } catch {
      setMessage("Error publicando")
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f2f3f7" }}>
      <div style={{ background: "#0b194f", padding: "20px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ color: "#00ffd7", fontWeight: 800, fontSize: 22 }}>WeTracking</div>
        <div style={{ color: "white", fontWeight: 600, fontSize: 18 }}>SEO Command Center</div>
      </div>

      {message && (
        <div style={{ background: message.startsWith("✓") ? "#d4edda" : "#fff3cd", padding: "12px 32px", borderBottom: "1px solid #ddd", color: "#333" }}>
          {message}
        </div>
      )}

      <div style={{ padding: "0 32px", background: "white", display: "flex", gap: 0, borderBottom: "2px solid #eee" }}>
        {(["keywords", "generate", "pending", "sitemap"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "14px 24px", border: "none", background: "none", cursor: "pointer",
            fontWeight: tab === t ? 700 : 400, color: tab === t ? "#007aed" : "#666",
            borderBottom: tab === t ? "2px solid #007aed" : "2px solid transparent",
            marginBottom: -2, textTransform: "capitalize"
          }}>
            {t === "keywords" ? "Keywords" : t === "generate" ? "Generar Contenido" : t === "pending" ? "Pendientes" : "Sitemap"}
          </button>
        ))}
      </div>

      <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>

        {tab === "keywords" && (
          <div>
            <h2 style={{ color: "#0b194f", marginBottom: 20 }}>Banco de Keywords</h2>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()}
                placeholder="ej: gestión de activos RFID Colombia"
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15 }} />
              <button onClick={addKeyword} style={{
                padding: "10px 24px", background: "#007aed", color: "white",
                border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600
              }}>Agregar</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {keywords.length === 0 && <p style={{ color: "#999" }}>No hay keywords todavía. Agrega la primera.</p>}
              {keywords.map(k => (
                <div key={k.id} style={{ background: "white", padding: "14px 20px", borderRadius: 10, border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0b194f" }}>{k.keyword}</span>
                    <span style={{ marginLeft: 12, fontSize: 12, color: "#999" }}>{k.intent} · {k.difficulty}</span>
                  </div>
                  <button onClick={() => { setGenKeyword(k.keyword); setTab("generate") }} style={{
                    padding: "6px 16px", background: "#00ffd7", color: "#0b194f",
                    border: "none", borderRadius: 20, cursor: "pointer", fontWeight: 600, fontSize: 13
                  }}>Generar página</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "generate" && (
          <div>
            <h2 style={{ color: "#0b194f", marginBottom: 20 }}>Generar Contenido SEO</h2>
            <div style={{ background: "white", padding: 28, borderRadius: 12, border: "1px solid #eee" }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#0b194f" }}>Keyword objetivo</label>
                <input value={genKeyword} onChange={e => setGenKeyword(e.target.value)}
                  placeholder="ej: sistema rastreo activos RFID"
                  style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#0b194f" }}>Tipo de página</label>
                  <select value={genType} onChange={e => setGenType(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15 }}>
                    <option value="pillar">Pillar Page</option>
                    <option value="secondary">Secondary Page</option>
                    <option value="blog">Blog Post</option>
                    <option value="landing">Landing Page</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#0b194f" }}>Industria</label>
                  <select value={genIndustry} onChange={e => setGenIndustry(e.target.value)}
                    style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15 }}>
                    <option value="RFID general">RFID General</option>
                    <option value="retail">Retail</option>
                    <option value="manufactura">Manufactura</option>
                    <option value="clubes">Clubes y Gimnasios</option>
                    <option value="industria petrolera">Industria Petrolera</option>
                    <option value="bodegas y logistica">Bodegas y Logística</option>
                  </select>
                </div>
              </div>
              <button onClick={generateContent} disabled={loading} style={{
                width: "100%", padding: "14px", background: loading ? "#ccc" : "#0b194f",
                color: "white", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 16
              }}>
                {loading ? "Generando con IA..." : "Generar contenido con Claude"}
              </button>
            </div>
          </div>
        )}

        {tab === "pending" && (
          <div>
            <h2 style={{ color: "#0b194f", marginBottom: 20 }}>Pendientes de Aprobación</h2>
            {pending.length === 0 && <p style={{ color: "#999" }}>No hay páginas pendientes. Genera contenido primero.</p>}
            {pending.map(p => (
              <div key={p.id} style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #eee", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#0b194f" }}>{p.content?.h1 || p.keyword}</h3>
                    <p style={{ margin: "4px 0 0", color: "#999", fontSize: 13 }}>/{p.content?.slug} · {p.page_type}</p>
                  </div>
                  <button onClick={() => publishPage(p.id)} disabled={loading} style={{
                    padding: "10px 24px", background: "#00ffd7", color: "#0b194f",
                    border: "none", borderRadius: 20, cursor: "pointer", fontWeight: 700
                  }}>
                    ✓ Aprobar y publicar
                  </button>
                </div>
                <p style={{ color: "#555", fontSize: 14, margin: 0 }}>{p.content?.meta_description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "sitemap" && (
          <div>
            <h2 style={{ color: "#0b194f", marginBottom: 20 }}>Estrategia de Sitemap</h2>
            <div style={{ background: "white", padding: 24, borderRadius: 12, border: "1px solid #eee" }}>
              <p style={{ color: "#555" }}>Las páginas publicadas aparecen automáticamente en <code>wetracking.co/sitemap.xml</code></p>
              <p style={{ color: "#555", marginTop: 8 }}>Para modificar la estrategia edita el archivo <code>data/seo-memory.json</code> directamente.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
