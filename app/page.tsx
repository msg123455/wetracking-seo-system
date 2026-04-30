"use client"
import { useState, useEffect } from "react"

// ── Types ──
type Keyword   = { id: string; keyword: string; volume: string; difficulty: string; intent: string }
type Cluster   = { id: string; name: string; created_at: string }
type Research  = { id: string; topic: string; depth: string; data: any; competitor_analysis?: any; sources_scraped?: number; created_at: string }
type YTScript  = { id: string; keyword: string; page_type: string; page_id: string | null; script: any; created_at: string }
type AEOItem   = { id: string; keyword: string; page_type: string; title: string; aeo: any | null; list: string }
type ContentSection = { type: string; content: string; alt_text: string }

type Page = {
  id: string; keyword: string; page_type: string; industry: string
  cluster_id: string; pillar_id: string; aeo?: any
  content: Record<string, any>; status: string; created_at: string
}
type SitemapEntry = { url: string; keyword: string; lastmod: string; priority: string; entity?: string }

type SitemapNode = {
  id: string; sitemap_id: string; url: string; keyword: string
  page_type: string; depth: number; parent_id: string | null
  status: "draft" | "generated" | "published"; page_id: string | null; created_at: string
}
type SitemapDef = { id: string; name: string; root_keyword: string; industry: string; node_count: number; created_at: string }

type Tab = "sitemapbuild" | "keywords" | "research" | "generate" | "pending" | "youtube" | "aeo" | "clusters" | "published"

const PAGE_TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  pillar:    { label: "Pillar",    color: "#6f42c1", bg: "#f3eeff" },
  secondary: { label: "Secondary", color: "#007aed", bg: "#e8f4fd" },
  third:     { label: "Third",     color: "#0d9488", bg: "#e0f7f5" },
  blog:      { label: "Blog",      color: "#fd7e14", bg: "#fff3e8" },
}

export default function SEOCommandCenter() {
  const [tab, setTab] = useState<Tab>("sitemapbuild")

  // data
  const [keywords,     setKeywords]     = useState<Keyword[]>([])
  const [clusters,     setClusters]     = useState<Cluster[]>([])
  const [pending,      setPending]      = useState<Page[]>([])
  const [publishedSM,  setPublishedSM]  = useState<SitemapEntry[]>([])
  const [research,     setResearch]     = useState<Research[]>([])
  const [ytScripts,    setYtScripts]    = useState<YTScript[]>([])
  const [aeoItems,     setAeoItems]     = useState<AEOItem[]>([])

  // sitemap builder data
  const [sitemapDefs,     setSitemapDefs]     = useState<SitemapDef[]>([])
  const [sitemapNodes,    setSitemapNodes]    = useState<SitemapNode[]>([])
  const [activeSitemapId, setActiveSitemapId] = useState<string | null>(null)
  const [showCreateForm,  setShowCreateForm]  = useState(false)
  const [smName,          setSmName]          = useState("")
  const [smKeyword,       setSmKeyword]       = useState("")
  const [smIndustry,      setSmIndustry]      = useState("logistica y bodegas")
  const [smText,          setSmText]          = useState("")

  // form – keywords
  const [newKeyword,   setNewKeyword]   = useState("")

  // form – clusters
  const [newCName,     setNewCName]     = useState("")
  const [newCId,       setNewCId]       = useState("")

  // form – research
  const [resTopic,     setResTopic]     = useState("")
  const [resDepth,     setResDepth]     = useState<"basic"|"deep">("basic")
  const [expandedRes,  setExpandedRes]  = useState<string|null>(null)

  // form – generate
  const [genKeyword,   setGenKeyword]   = useState("")
  const [genType,      setGenType]      = useState<"pillar"|"secondary"|"third"|"blog">("pillar")
  const [genIndustry,  setGenIndustry]  = useState("RFID general")
  const [genCluster,   setGenCluster]   = useState("")
  const [genPillar,    setGenPillar]    = useState("")
  const [genResearch,  setGenResearch]  = useState("")

  // form – image
  const [imgDesc,      setImgDesc]      = useState("")
  const [imgPageId,    setImgPageId]    = useState("")
  const [imgField,     setImgField]     = useState("image_1_url")
  const [imgPreview,   setImgPreview]   = useState("")

  // form – YouTube
  const [ytKeyword,    setYtKeyword]    = useState("")
  const [ytType,       setYtType]       = useState("pillar")
  const [ytIndustry,   setYtIndustry]   = useState("RFID general")
  const [ytPageId,     setYtPageId]     = useState("")
  const [expandedYt,   setExpandedYt]   = useState<string|null>(null)

  // pending
  const [expandedPage, setExpandedPage] = useState<string|null>(null)
  const [expandedAeo,  setExpandedAeo]  = useState<string|null>(null)

  // global loading + messages
  const [loading,      setLoading]      = useState(false)
  const [message,      setMessage]      = useState<{text:string;type:"success"|"error"|"info"}|null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [kR, pR, sR, cR, rR, yR, aR, sbR] = await Promise.all([
        fetch("/api/keywords"), fetch("/api/pending"), fetch("/api/sitemap"),
        fetch("/api/clusters"), fetch("/api/research"), fetch("/api/youtube-script"),
        fetch("/api/aeo"), fetch("/api/sitemap-builder"),
      ])
      if (kR.ok) setKeywords(await kR.json())
      if (pR.ok) setPending(await pR.json())
      if (sR.ok) { const d = await sR.json(); setPublishedSM(d.published || []) }
      if (cR.ok) setClusters(await cR.json())
      if (rR.ok) setResearch(await rR.json())
      if (yR.ok) setYtScripts(await yR.json())
      if (aR.ok) setAeoItems(await aR.json())
      if (sbR.ok) {
        const d = await sbR.json()
        setSitemapDefs(d.sitemaps || [])
        setSitemapNodes(d.nodes || [])
        if (!activeSitemapId && d.sitemaps?.length > 0) {
          setActiveSitemapId(d.sitemaps[0].id)
        }
      }
    } catch (e) { console.error("loadData:", e) }
  }

  function notify(text: string, type: "success"|"error"|"info" = "info") {
    setMessage({ text, type })
  }

  // ── Keywords ──
  async function addKeyword() {
    const kw = newKeyword.trim(); if (!kw) return
    try {
      const r = await fetch("/api/keywords", { method:"POST", headers:jsonHdr, body: JSON.stringify({ keyword: kw }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setNewKeyword(""); loadData()
    } catch (e: any) { notify("Error al agregar keyword: " + e.message, "error") }
  }
  async function deleteKeyword(id: string) {
    await fetch("/api/keywords", { method:"DELETE", headers:jsonHdr, body: JSON.stringify({ id }) })
    loadData()
  }

  // ── Clusters ──
  async function addCluster() {
    if (!newCName.trim() || !newCId.trim()) return
    const r = await fetch("/api/clusters", { method:"POST", headers:jsonHdr, body: JSON.stringify({ name:newCName, id:newCId }) })
    if (r.ok) { setNewCName(""); setNewCId(""); loadData() }
    else { const d = await r.json(); notify(d.error, "error") }
  }
  async function deleteCluster(id: string) {
    await fetch("/api/clusters", { method:"DELETE", headers:jsonHdr, body: JSON.stringify({ id }) })
    loadData()
  }

  // ── Research ──
  async function runResearch() {
    if (!resTopic.trim()) return
    setLoading(true); notify("Investigando con Perplexity...", "info")
    try {
      const r = await fetch("/api/research", { method:"POST", headers:jsonHdr, body: JSON.stringify({ topic:resTopic, depth:resDepth }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      notify(`Investigacion completada: "${resTopic}"`, "success")
      setResTopic(""); loadData()
    } catch (e: any) { notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  // ── Sitemap Builder ──
  async function parseSitemap() {
    if (!smName.trim() || !smKeyword.trim() || !smText.trim()) {
      notify("Completa nombre, keyword raiz y estructura del sitemap", "error"); return
    }
    setLoading(true); notify("Analizando estructura con Claude...", "info")
    try {
      const r = await fetch("/api/sitemap-builder", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({ action:"parse", name:smName, root_keyword:smKeyword, industry:smIndustry, structure_text:smText }),
      })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      notify(`Sitemap creado: ${d.nodes.length} paginas detectadas`, "success")
      setActiveSitemapId(d.sitemap.id)
      setShowCreateForm(false)
      setSmName(""); setSmKeyword(""); setSmText("")
      loadData()
    } catch (e: any) { notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  async function deleteSitemap(sitemapId: string) {
    await fetch("/api/sitemap-builder", { method:"DELETE", headers:jsonHdr, body: JSON.stringify({ sitemap_id: sitemapId }) })
    if (activeSitemapId === sitemapId) setActiveSitemapId(null)
    loadData()
  }

  async function generateFromNode(node: SitemapNode, research_id?: string) {
    const activeSitemap = sitemapDefs.find(s => s.id === node.sitemap_id)
    setLoading(true); notify(`Generando "${node.keyword}"...`, "info")
    try {
      const r = await fetch("/api/generate-content", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({
          keyword: node.keyword,
          page_type: node.page_type,
          industry: activeSitemap?.industry || "RFID general",
          cluster_id: "default",
          pillar_id: "default",
          research_id: research_id || undefined,
        }),
      })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      await fetch("/api/sitemap-builder", {
        method:"PATCH", headers:jsonHdr,
        body: JSON.stringify({ node_id: node.id, status: "generated", page_id: d.id }),
      })
      notify(`Contenido listo para "${node.keyword}" — ver en Pendientes`, "success")
      loadData()
    } catch (e: any) { notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  async function researchAndGenerate(node: SitemapNode) {
    const activeSitemap = sitemapDefs.find(s => s.id === node.sitemap_id)
    setLoading(true)
    notify(`Investigando competidores para "${node.keyword}"...`, "info")
    try {
      // Step 1: Perplexity + scrape competitors
      const rr = await fetch("/api/research", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({ topic: node.keyword, depth: "basic" }),
      })
      const rd = await rr.json(); if (!rr.ok) throw new Error(rd.error)
      notify(`Research listo (${rd.sources_scraped || 0} paginas analizadas). Generando contenido...`, "info")

      // Step 2: Generate using research context
      const gr = await fetch("/api/generate-content", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({
          keyword: node.keyword,
          page_type: node.page_type,
          industry: activeSitemap?.industry || "RFID general",
          cluster_id: "default",
          pillar_id: "default",
          research_id: rd.id,
        }),
      })
      const gd = await gr.json(); if (!gr.ok) throw new Error(gd.error)
      await fetch("/api/sitemap-builder", {
        method:"PATCH", headers:jsonHdr,
        body: JSON.stringify({ node_id: node.id, status: "generated", page_id: gd.id }),
      })
      notify(`Contenido listo para "${node.keyword}" con analisis de competidores`, "success")
      loadData()
    } catch (e: any) { notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  // ── Generate content ──
  async function generateContent() {
    if (!genKeyword.trim()) return
    setLoading(true); notify("Generando contenido con Claude...", "info")
    try {
      const r = await fetch("/api/generate-content", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({ keyword:genKeyword, page_type:genType, industry:genIndustry,
          cluster_id:genCluster||"default", pillar_id:genPillar||"default",
          research_id:genResearch||undefined }),
      })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      notify(`Contenido generado para "${genKeyword}"`, "success")
      setGenKeyword(""); setTab("pending"); loadData()
    } catch (e: any) { notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  // ── Generate image ──
  async function generateImage() {
    if (!imgDesc.trim()) return
    setLoading(true); notify("Generando imagen con Gemini Imagen...", "info")
    try {
      const r = await fetch("/api/generate-image", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({ description:imgDesc, page_id:imgPageId||undefined, image_field:imgField }),
      })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setImgPreview(d.url)
      notify(`Imagen generada: ${d.url}`, "success")
      if (imgPageId) { setImgDesc(""); loadData() }
    } catch (e: any) { notify("Error Gemini: " + e.message, "error") }
    setLoading(false)
  }

  // ── YouTube ──
  async function generateYTScript() {
    if (!ytKeyword.trim()) return
    setLoading(true); notify("Generando script YouTube con Claude...", "info")
    try {
      const r = await fetch("/api/youtube-script", {
        method:"POST", headers:jsonHdr,
        body: JSON.stringify({ keyword:ytKeyword, page_type:ytType, industry:ytIndustry, page_id:ytPageId||undefined }),
      })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      notify(`Script generado: "${d.script.video_title}"`, "success")
      setYtKeyword(""); loadData()
    } catch (e: any) { notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  // ── AEO ──
  async function optimizeAEO(page_id: string) {
    setLoading(true); notify("Optimizando para motores de IA con Claude...", "info")
    try {
      const r = await fetch("/api/aeo", { method:"POST", headers:jsonHdr, body: JSON.stringify({ page_id }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      notify("AEO optimizado — direct_answer, schema FAQ y citation blocks generados", "success")
      loadData()
    } catch (e: any) { notify("Error AEO: " + e.message, "error") }
    setLoading(false)
  }

  // ── Publish ──
  async function publishPage(id: string) {
    setLoading(true); notify("Publicando en Base44 y disparando redeploy Vercel...", "info")
    try {
      const r = await fetch("/api/publish", { method:"POST", headers:jsonHdr, body: JSON.stringify({ page_id:id }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      notify(`Publicado en Base44 (${d.entity})`, "success"); loadData()
    } catch (e: any) { notify("Error publicando: " + e.message, "error") }
    setLoading(false)
  }
  async function rejectPage(id: string) {
    await fetch("/api/pending", { method:"DELETE", headers:jsonHdr, body: JSON.stringify({ page_id:id }) })
    loadData()
  }

  // ── Sitemap tree rendering ──
  const activeSitemap = sitemapDefs.find(s => s.id === activeSitemapId) || null
  const activeNodes = sitemapNodes
    .filter(n => n.sitemap_id === activeSitemapId)
    .sort((a, b) => a.url.localeCompare(b.url))

  const nodeStats = {
    pillar:    activeNodes.filter(n => n.page_type === "pillar").length,
    secondary: activeNodes.filter(n => n.page_type === "secondary").length,
    third:     activeNodes.filter(n => n.page_type === "third").length,
    blog:      activeNodes.filter(n => n.page_type === "blog").length,
    draft:     activeNodes.filter(n => n.status === "draft").length,
    generated: activeNodes.filter(n => n.status === "generated").length,
    published: activeNodes.filter(n => n.status === "published").length,
  }

  // ─────────────────────────────────────────────────
  // TAB BAR
  // ─────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; count?: number; dot?: boolean }[] = [
    { key:"sitemapbuild", label:"Estructura",   count: sitemapDefs.length },
    { key:"keywords",     label:"Keywords",     count: keywords.length },
    { key:"research",     label:"Research",     count: research.length },
    { key:"generate",     label:"Generar" },
    { key:"pending",      label:"Pendientes",   count: pending.length, dot: pending.length > 0 },
    { key:"youtube",      label:"YouTube",      count: ytScripts.length },
    { key:"aeo",          label:"AEO",          count: aeoItems.filter(a=>a.aeo).length },
    { key:"clusters",     label:"Clusters",     count: clusters.length },
    { key:"published",    label:"Publicadas",   count: publishedSM.length },
  ]

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", minHeight:"100vh", background:"#f2f3f7" }}>

      {/* ── Header ── */}
      <div style={{ background:"#0b194f", padding:"16px 28px", display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ color:"#00ffd7", fontWeight:800, fontSize:21 }}>WeTracking</span>
        <span style={{ color:"rgba(255,255,255,0.3)" }}>|</span>
        <span style={{ color:"white", fontWeight:600, fontSize:16 }}>SEO Command Center</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {[["Sitemaps",sitemapDefs.length],["Keywords",keywords.length],["Pendientes",pending.length,true],["Research",research.length],["YouTube",ytScripts.length],["Publicadas",publishedSM.length]].map(([l,v,hi]:any) => (
            <div key={l} style={{ textAlign:"center", background:"rgba(255,255,255,0.1)", borderRadius:7, padding:"4px 11px" }}>
              <div style={{ color: hi && v>0 ? "#00ffd7" : "rgba(255,255,255,0.55)", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
              <div style={{ color:"white", fontWeight:800, fontSize:17, lineHeight:1.2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Notificacion ── */}
      {message && (
        <div style={{ background: message.type==="success"?"#d4edda":message.type==="error"?"#f8d7da":"#fff3cd", padding:"9px 28px", borderBottom:"1px solid #ddd", color:"#333", fontSize:13, display:"flex", justifyContent:"space-between" }}>
          <span>{message.text}</span>
          <button onClick={()=>setMessage(null)} style={{ background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:18,lineHeight:1 }}>x</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ background:"white", borderBottom:"2px solid #eee", overflowX:"auto", whiteSpace:"nowrap", scrollbarWidth:"none" }}>
        <div style={{ display:"inline-flex", padding:"0 24px" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              padding:"12px 18px", border:"none", background:"none", cursor:"pointer",
              fontWeight: tab===t.key?700:400, color: tab===t.key?"#007aed":"#666",
              borderBottom: tab===t.key?"3px solid #007aed":"3px solid transparent",
              marginBottom:-2, fontSize:13, whiteSpace:"nowrap", position:"relative",
            }}>
              {t.label}{t.count!==undefined?` (${t.count})`:""}
              {t.dot && t.count && t.count > 0 && <span style={{ position:"absolute", top:8, right:6, width:6, height:6, borderRadius:"50%", background:"#00ffd7" }}/>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding:28, maxWidth:980, margin:"0 auto" }}>

        {/* ══ SITEMAP BUILDER ══ */}
        {tab==="sitemapbuild" && (
          <div>
            <h2 style={H2}>Estructura SEO — Sitemap Builder</h2>
            <p style={{ color:"#777", fontSize:13, marginTop:-12, marginBottom:20 }}>
              Define la arquitectura de contenido. Claude detecta automaticamente cada URL como Pillar, Secondary, Third o Blog.
              Desde aqui puedes generar el contenido de cada pagina directamente.
            </p>

            {/* Selector de sitemaps activos */}
            {sitemapDefs.length > 0 && (
              <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                {sitemapDefs.map(sm => (
                  <button key={sm.id} onClick={()=>setActiveSitemapId(sm.id)} style={{
                    padding:"8px 18px", border:`2px solid ${activeSitemapId===sm.id?"#007aed":"#ddd"}`,
                    borderRadius:8, cursor:"pointer", fontWeight:activeSitemapId===sm.id?700:400,
                    color:activeSitemapId===sm.id?"#007aed":"#666", background:"white", fontSize:13,
                    display:"flex", alignItems:"center", gap:8,
                  }}>
                    {sm.name}
                    <span style={{ fontSize:11, color:"#aaa" }}>{sm.node_count} paginas</span>
                  </button>
                ))}
                <button onClick={()=>setShowCreateForm(true)} style={{...BTN_BLUE, fontSize:12}}>
                  + Nuevo sitemap
                </button>
              </div>
            )}

            {/* Form crear sitemap */}
            {(showCreateForm || sitemapDefs.length === 0) && (
              <div style={{ background:"white", padding:24, borderRadius:12, border:"2px dashed #007aed", marginBottom:24 }}>
                <h3 style={{ margin:"0 0 18px", color:"#0b194f", fontSize:15 }}>
                  {sitemapDefs.length === 0 ? "Crear primer sitemap" : "Nuevo sitemap"}
                </h3>
                <div style={{ display:"flex", gap:14 }}>
                  <Field label="Nombre" style={{flex:1}}>
                    <input value={smName} onChange={e=>setSmName(e.target.value)}
                      placeholder="ej: Gestion de Inventarios" style={{...INP, width:"100%", boxSizing:"border-box"}} />
                  </Field>
                  <Field label="Keyword raiz" style={{flex:1}}>
                    <input value={smKeyword} onChange={e=>setSmKeyword(e.target.value)}
                      placeholder="ej: gestion de inventarios" style={{...INP, width:"100%", boxSizing:"border-box"}} />
                  </Field>
                  <Field label="Industria" style={{flex:1}}>
                    <select value={smIndustry} onChange={e=>setSmIndustry(e.target.value)} style={SEL}>
                      <option>logistica y bodegas</option><option>manufactura</option>
                      <option>retail</option><option>salud</option><option>RFID general</option>
                      <option>trazabilidad</option><option>activos fijos</option>
                    </select>
                  </Field>
                </div>
                <Field label="Estructura del sitemap (pega el texto, cualquier formato)">
                  <textarea
                    value={smText} onChange={e=>setSmText(e.target.value)} rows={12}
                    placeholder={`Ejemplo:\n/gestion-de-inventarios\n  /gestion-de-inventarios/beneficios\n    /gestion-de-inventarios/beneficios/impacto-financiero\n    /gestion-de-inventarios/beneficios/eficiencia-operativa\n  /gestion-de-inventarios/metodos\n    /gestion-de-inventarios/metodos/abc\n    /gestion-de-inventarios/metodos/fifo\nblog/gestion-de-inventarios/que-es-un-inventario\nblog/gestion-de-inventarios/metodos-de-inventario`}
                    style={{ ...INP, width:"100%", boxSizing:"border-box", resize:"vertical", fontFamily:"monospace", fontSize:12, lineHeight:1.6 }}
                  />
                </Field>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={parseSitemap} disabled={loading||!smText.trim()||!smName.trim()} style={{
                    ...BTN_BLUE, flex:1, padding:"13px", fontSize:15,
                    opacity:loading||!smText.trim()||!smName.trim()?0.55:1,
                    cursor:loading||!smText.trim()||!smName.trim()?"not-allowed":"pointer",
                  }}>
                    {loading?"Analizando con Claude...":"Analizar y crear sitemap"}
                  </button>
                  {showCreateForm && sitemapDefs.length > 0 && (
                    <button onClick={()=>setShowCreateForm(false)} style={BTN_GHOST}>Cancelar</button>
                  )}
                </div>
                <p style={{ color:"#bbb", fontSize:11, textAlign:"center", marginTop:8, marginBottom:0 }}>
                  Claude detecta automaticamente: Pillar (profundidad 0), Secondary (1), Third (2), Blog (blog/)
                </p>
              </div>
            )}

            {/* Sitemap activo */}
            {activeSitemap && activeNodes.length > 0 && (
              <div>
                {/* Stats */}
                <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
                  {[
                    { label:"Total", val:activeNodes.length, color:"#0b194f", bg:"#eef0f8" },
                    { label:"Pillar", val:nodeStats.pillar, color:"#6f42c1", bg:"#f3eeff" },
                    { label:"Secondary", val:nodeStats.secondary, color:"#007aed", bg:"#e8f4fd" },
                    { label:"Third", val:nodeStats.third, color:"#0d9488", bg:"#e0f7f5" },
                    { label:"Blog", val:nodeStats.blog, color:"#fd7e14", bg:"#fff3e8" },
                    { label:"Generadas", val:nodeStats.generated, color:"#28a745", bg:"#e8f5e9" },
                    { label:"Pendientes", val:nodeStats.draft, color:"#856404", bg:"#fff3cd" },
                  ].map(s => (
                    <div key={s.label} style={{ padding:"6px 14px", borderRadius:8, background:s.bg, textAlign:"center" }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", color:s.color, letterSpacing:0.5 }}>{s.label}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.val}</div>
                    </div>
                  ))}
                  <div style={{ marginLeft:"auto", display:"flex", alignItems:"center" }}>
                    <button onClick={()=>deleteSitemap(activeSitemap.id)} style={{ ...BTN_DEL, fontSize:12 }}>
                      Eliminar sitemap
                    </button>
                  </div>
                </div>

                {/* Tree */}
                <div style={{ background:"white", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
                  <div style={{ padding:"12px 18px", background:"#f8f9fa", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:700, fontSize:13, color:"#0b194f" }}>
                      {activeSitemap.name} — {activeSitemap.root_keyword}
                    </span>
                    <span style={{ fontSize:12, color:"#aaa" }}>{activeSitemap.industry}</span>
                  </div>
                  <div style={{ padding:"8px 0" }}>
                    {activeNodes.map(node => {
                      const ti = PAGE_TYPE_COLORS[node.page_type] || PAGE_TYPE_COLORS.pillar
                      const statusColor = node.status === "generated" ? "#28a745" : node.status === "published" ? "#007aed" : "#aaa"
                      const statusBg = node.status === "generated" ? "#e8f5e9" : node.status === "published" ? "#e8f4fd" : "#f5f5f5"
                      return (
                        <div key={node.id} style={{
                          display:"flex", alignItems:"center", gap:8,
                          padding:"7px 18px",
                          paddingLeft: 18 + node.depth * 22,
                          borderLeft: node.depth > 0 ? undefined : undefined,
                          borderBottom:"1px solid #f8f8f8",
                          background: node.status === "generated" ? "#fafffe" : "white",
                        }}>
                          {node.depth > 0 && (
                            <span style={{ color:"#ddd", fontSize:16, marginLeft:-(node.depth * 8) }}>└</span>
                          )}
                          <span style={{
                            padding:"2px 7px", borderRadius:4, fontSize:10, fontWeight:700,
                            background:ti.bg, color:ti.color, flexShrink:0, minWidth:58, textAlign:"center",
                          }}>{ti.label}</span>
                          <code style={{ fontSize:11, color:"#888", flexShrink:0, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{node.url}</code>
                          <span style={{ flex:1, fontSize:12, color:"#0b194f", fontWeight:node.depth===0?700:400 }}>{node.keyword}</span>
                          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600, background:statusBg, color:statusColor, flexShrink:0 }}>{node.status}</span>
                          {node.status === "draft" && node.page_type === "secondary" && (
                            <button onClick={()=>researchAndGenerate(node)} disabled={loading} style={{ ...BTN_BLUE, padding:"4px 12px", fontSize:11, flexShrink:0, opacity:loading?0.55:1 }}>
                              Investigar + Generar
                            </button>
                          )}
                          {node.status === "draft" && node.page_type !== "secondary" && (
                            <button onClick={()=>generateFromNode(node)} disabled={loading} style={{ ...BTN_CYAN, padding:"4px 12px", fontSize:11, flexShrink:0, opacity:loading?0.55:1 }}>
                              Generar
                            </button>
                          )}
                          {node.status === "generated" && node.page_id && (
                            <button onClick={()=>{setTab("pending"); setExpandedPage(node.page_id)}} style={{ ...BTN_GHOST, padding:"4px 12px", fontSize:11, flexShrink:0 }}>
                              Ver
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ KEYWORDS ══ */}
        {tab==="keywords" && (
          <div>
            <h2 style={H2}>Banco de Keywords</h2>
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              <input value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKeyword()}
                placeholder="ej: gestion de activos RFID Colombia" style={{...INP,flex:1}} />
              <button onClick={addKeyword} style={BTN_BLUE}>Agregar</button>
            </div>
            {keywords.length===0 ? <Empty text="Sin keywords. Agrega la primera arriba." />
              : keywords.map(k=>(
                <div key={k.id} style={{...CARD, marginBottom:8}}>
                  <div>
                    <span style={{ fontWeight:600, color:"#0b194f" }}>{k.keyword}</span>
                    <Bx>{k.intent}</Bx><Bx>{k.difficulty}</Bx>
                  </div>
                  <div style={{ display:"flex", gap:7 }}>
                    <button onClick={()=>{setGenKeyword(k.keyword);setTab("generate")}} style={BTN_CYAN}>Generar</button>
                    <button onClick={()=>{setResTopic(k.keyword);setTab("research")}} style={BTN_GHOST}>Investigar</button>
                    <button onClick={()=>deleteKeyword(k.id)} style={BTN_DEL}>x</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ══ RESEARCH ══ */}
        {tab==="research" && (
          <div>
            <h2 style={H2}>Superagente de Investigacion</h2>
            <p style={{ color:"#777", fontSize:13, marginTop:-12, marginBottom:20 }}>
              Usa Perplexity para investigar en tiempo real. El contexto se integra automaticamente en la generacion de contenido.
            </p>
            <div style={{ background:"white", padding:22, borderRadius:12, border:"1px solid #eee", marginBottom:24 }}>
              <Field label="Tema a investigar">
                <input value={resTopic} onChange={e=>setResTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runResearch()}
                  placeholder="ej: implementacion RFID en bodegas logisticas Colombia 2025"
                  style={{...INP, width:"100%", boxSizing:"border-box"}} />
              </Field>
              <Field label="Profundidad">
                <div style={{ display:"flex", gap:10 }}>
                  {(["basic","deep"] as const).map(d=>(
                    <button key={d} onClick={()=>setResDepth(d)} style={{
                      padding:"8px 22px", border:`2px solid ${resDepth===d?"#007aed":"#ddd"}`,
                      borderRadius:8, cursor:"pointer", fontWeight:resDepth===d?700:400,
                      color:resDepth===d?"#007aed":"#666", background:"white", fontSize:13,
                    }}>{d==="basic"?"Basico (rapido)":"Profundo (detallado)"}</button>
                  ))}
                </div>
              </Field>
              <button onClick={runResearch} disabled={loading||!resTopic.trim()} style={{...BTN_BLUE, width:"100%", padding:"13px", opacity:loading||!resTopic.trim()?0.55:1, cursor:loading||!resTopic.trim()?"not-allowed":"pointer"}}>
                {loading?"Investigando con Perplexity...":"Investigar ahora"}
              </button>
            </div>

            {research.length===0 ? <Empty text="Sin investigaciones. Corre tu primera busqueda arriba." />
              : research.map(r=>(
                <div key={r.id} style={{ background:"white", borderRadius:12, border:"1px solid #eee", marginBottom:12, overflow:"hidden" }}>
                  <div style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <span style={{ fontWeight:700, color:"#0b194f" }}>{r.topic}</span>
                      <Bx>{r.depth}</Bx>
                      <span style={{ color:"#bbb", fontSize:12, marginLeft:8 }}>{new Date(r.created_at).toLocaleDateString("es-CO")}</span>
                    </div>
                    <div style={{ display:"flex", gap:7 }}>
                      <button onClick={()=>{setGenResearch(r.id);setGenKeyword(r.topic);setTab("generate")}} style={BTN_CYAN}>Usar en contenido</button>
                      <button onClick={()=>setExpandedRes(expandedRes===r.id?null:r.id)} style={BTN_GHOST}>{expandedRes===r.id?"Cerrar":"Ver"}</button>
                      <button onClick={async()=>{await fetch("/api/research",{method:"DELETE",headers:jsonHdr,body:JSON.stringify({id:r.id})});loadData()}} style={BTN_DEL}>x</button>
                    </div>
                  </div>
                  {expandedRes===r.id && (
                    <div style={{ borderTop:"1px solid #f0f0f0", padding:"16px 20px", background:"#fafafa", display:"flex", flexDirection:"column", gap:12 }}>
                      <ResBlock label="Resumen" items={[r.data.summary]} />
                      <ResBlock label="Hechos clave" items={r.data.key_facts} />
                      <ResBlock label="Tendencias" items={r.data.trends} />
                      <ResBlock label="Oportunidades SEO" items={r.data.seo_opportunities} />
                      <ResBlock label="Keywords relacionadas" items={r.data.related_keywords?.map((k:any)=>k.keyword+" ("+k.estimated_volume+")")} />
                      <ResBlock label="Preguntas frecuentes" items={r.data.common_questions} />
                      {r.competitor_analysis && (
                        <div style={{ marginTop:4, padding:"14px 16px", background:"#fff8e1", borderRadius:8, border:"1px solid #ffe082", display:"flex", flexDirection:"column", gap:10 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#e65100", textTransform:"uppercase", letterSpacing:0.5 }}>
                            Analisis competitivo — {r.sources_scraped} paginas reales analizadas
                          </span>
                          <ResBlock label="Temas que todos cubren (obligatorio)" items={r.competitor_analysis.temas_comunes} />
                          <ResBlock label="Content gaps — lo que nadie responde bien" items={r.competitor_analysis.content_gaps} />
                          <ResBlock label="Angulos unicos WeTracking" items={r.competitor_analysis.angulos_unicos_wetracking} />
                          <ResBlock label="Estructura H2 recomendada" items={r.competitor_analysis.estructura_recomendada} />
                          <ResBlock label="Preguntas sin responder por competidores" items={r.competitor_analysis.preguntas_sin_responder} />
                          <ResBlock label="Elementos de engagement a incluir" items={r.competitor_analysis.elementos_engagement} />
                          {r.data.sources?.length > 0 && (
                            <div>
                              <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Fuentes analizadas</span>
                              <div style={{ display:"flex", flexDirection:"column", gap:3, marginTop:4 }}>
                                {r.data.sources.map((s:string,i:number)=>(
                                  <a key={i} href={s} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#007aed", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s}</a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* ══ GENERAR CONTENIDO ══ */}
        {tab==="generate" && (
          <div>
            <h2 style={H2}>Generar Contenido SEO</h2>

            <div style={{ background:"white", padding:24, borderRadius:12, border:"1px solid #eee", marginBottom:20 }}>
              <h3 style={{ margin:"0 0 16px", color:"#0b194f", fontSize:15 }}>Contenido con Claude</h3>
              <Field label="Keyword objetivo">
                <input value={genKeyword} onChange={e=>setGenKeyword(e.target.value)}
                  placeholder="ej: sistema rastreo activos RFID manufactura"
                  style={{...INP, width:"100%", boxSizing:"border-box"}} />
              </Field>
              <div style={{ display:"flex", gap:14 }}>
                <Field label="Tipo de pagina" style={{flex:1}}>
                  <select value={genType} onChange={e=>setGenType(e.target.value as any)} style={SEL}>
                    <option value="pillar">Pillar Page (nivel 0)</option>
                    <option value="secondary">Secondary Page (nivel 1)</option>
                    <option value="third">Third Page (nivel 2)</option>
                    <option value="blog">Blog Post</option>
                  </select>
                </Field>
                <Field label="Industria" style={{flex:1}}>
                  <select value={genIndustry} onChange={e=>setGenIndustry(e.target.value)} style={SEL}>
                    <option>RFID general</option><option>retail</option><option>manufactura</option>
                    <option>clubes y gimnasios</option><option>industria petrolera</option><option>bodegas y logistica</option>
                  </select>
                </Field>
              </div>
              <div style={{ display:"flex", gap:14 }}>
                <Field label="Cluster ID" style={{flex:1}}>
                  <input value={genCluster} onChange={e=>setGenCluster(e.target.value)} list="cl-list"
                    placeholder='ID cluster o "default"' style={{...INP, width:"100%", boxSizing:"border-box"}} />
                  <datalist id="cl-list">{clusters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</datalist>
                  {clusters.length>0 && <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
                    {clusters.map(c=><button key={c.id} onClick={()=>setGenCluster(c.id)} style={{ padding:"2px 9px", border:"none", borderRadius:20, fontSize:11, cursor:"pointer", background:genCluster===c.id?"#0b194f":"#f0f0f0", color:genCluster===c.id?"white":"#555" }}>{c.name}</button>)}
                  </div>}
                </Field>
                {(genType==="secondary"||genType==="third") && (
                  <Field label="Pillar ID" style={{flex:1}}>
                    <input value={genPillar} onChange={e=>setGenPillar(e.target.value)} placeholder='Slug del pillar padre' style={{...INP, width:"100%", boxSizing:"border-box"}} />
                  </Field>
                )}
              </div>
              {research.length>0 && (
                <Field label="Usar investigacion (opcional)">
                  <select value={genResearch} onChange={e=>setGenResearch(e.target.value)} style={SEL}>
                    <option value="">Sin investigacion</option>
                    {research.map(r=><option key={r.id} value={r.id}>{r.topic} ({r.depth})</option>)}
                  </select>
                </Field>
              )}
              <button onClick={generateContent} disabled={loading||!genKeyword.trim()} style={{...BTN_BLUE, width:"100%", padding:"13px", fontSize:15, opacity:loading||!genKeyword.trim()?0.55:1, cursor:loading||!genKeyword.trim()?"not-allowed":"pointer"}}>
                {loading?"Generando con Claude...":"Generar contenido"}
              </button>
              <p style={{ color:"#bbb", fontSize:11, textAlign:"center", marginTop:8, marginBottom:0 }}>claude-sonnet-4-6 · resultado va a Pendientes para revision</p>
            </div>

            {/* Image generation */}
            <div style={{ background:"white", padding:24, borderRadius:12, border:"1px solid #eee" }}>
              <h3 style={{ margin:"0 0 16px", color:"#0b194f", fontSize:15 }}>Generar Imagen con Gemini Imagen 3</h3>
              <Field label="Descripcion de la imagen">
                <input value={imgDesc} onChange={e=>setImgDesc(e.target.value)}
                  placeholder="ej: trabajadores en bodega usando lectores RFID en estanterias industriales"
                  style={{...INP, width:"100%", boxSizing:"border-box"}} />
              </Field>
              <div style={{ display:"flex", gap:14 }}>
                <Field label="Aplicar a pagina (opcional)" style={{flex:1}}>
                  <select value={imgPageId} onChange={e=>setImgPageId(e.target.value)} style={SEL}>
                    <option value="">Solo previsualizar</option>
                    {pending.filter(p=>p.page_type==="blog").map(p=><option key={p.id} value={p.id}>{p.content.title||p.keyword}</option>)}
                  </select>
                </Field>
                <Field label="Campo de imagen" style={{flex:1}}>
                  <select value={imgField} onChange={e=>setImgField(e.target.value)} style={SEL}>
                    <option value="image_1_url">Imagen 1</option>
                    <option value="image_2_url">Imagen 2</option>
                  </select>
                </Field>
              </div>
              <button onClick={generateImage} disabled={loading||!imgDesc.trim()} style={{...BTN_BLUE, width:"100%", padding:"12px", opacity:loading||!imgDesc.trim()?0.55:1, cursor:loading||!imgDesc.trim()?"not-allowed":"pointer", background:"#198754"}}>
                {loading?"Generando imagen...":"Generar imagen con Gemini"}
              </button>
              {imgPreview && (
                <div style={{ marginTop:16, borderRadius:10, overflow:"hidden", border:"1px solid #ddd" }}>
                  <img src={imgPreview} alt="Generated" style={{ width:"100%", display:"block" }} />
                  <div style={{ padding:"8px 12px", background:"#f8f8f8", fontSize:12, color:"#777" }}>
                    URL: <code style={CODE}>{imgPreview}</code>
                    <button onClick={()=>navigator.clipboard.writeText(imgPreview)} style={{ marginLeft:8, padding:"2px 8px", border:"1px solid #ddd", borderRadius:4, cursor:"pointer", fontSize:11 }}>Copiar URL</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ PENDIENTES ══ */}
        {tab==="pending" && (
          <div>
            <h2 style={H2}>Pendientes de Aprobacion</h2>
            {pending.length===0 ? <Empty text="Sin paginas pendientes. Genera contenido primero." />
              : pending.map(p=>{
                const ti = PAGE_TYPE_COLORS[p.page_type]||PAGE_TYPE_COLORS.pillar
                const isExp = expandedPage===p.id
                return (
                  <div key={p.id} style={{ background:"white", borderRadius:12, border:"1px solid #eee", marginBottom:14, overflow:"hidden" }}>
                    <div style={{ padding:"15px 20px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:4 }}>
                          <h3 style={{ margin:0, color:"#0b194f", fontSize:15 }}>{p.content?.title||p.keyword}</h3>
                          <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:ti.bg, color:ti.color }}>{ti.label}</span>
                          <Bx>{p.industry}</Bx>
                          {p.aeo && <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:"#e8f5e9", color:"#2e7d32" }}>AEO ok</span>}
                        </div>
                        <p style={{ margin:"2px 0 0", color:"#999", fontSize:12 }}>
                          /{p.content?.slug}
                          {p.cluster_id&&p.cluster_id!=="default"&&<> · cluster: <code style={CODE}>{p.cluster_id}</code></>}
                          {" · "}{new Date(p.created_at).toLocaleDateString("es-CO")}
                        </p>
                        <p style={{ margin:"5px 0 0", color:"#666", fontSize:13, lineHeight:1.5 }}>{p.content?.meta_description}</p>
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                        <button onClick={()=>setExpandedPage(isExp?null:p.id)} style={BTN_GHOST}>{isExp?"Cerrar":"Ver"}</button>
                        <button onClick={()=>optimizeAEO(p.id)} disabled={loading} style={{ ...BTN_GHOST, color:"#6f42c1", borderColor:"#d4b8ff" }}>AEO</button>
                        <button onClick={()=>rejectPage(p.id)} style={BTN_DEL}>Rechazar</button>
                        <button onClick={()=>publishPage(p.id)} disabled={loading} style={{ ...BTN_CYAN, opacity:loading?0.55:1 }}>Publicar</button>
                      </div>
                    </div>
                    {isExp && (
                      <div style={{ borderTop:"1px solid #f0f0f0", padding:"16px 20px", background:"#fafafa" }}>
                        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 }}>
                          <PMeta label="title" text={p.content?.title} />
                          <PMeta label="meta_description" text={p.content?.meta_description} />
                          <PMeta label="cta_text" text={p.content?.cta_text} />
                        </div>
                        <ContentPrev page={p} />
                        {p.aeo && (
                          <div style={{ marginTop:14, padding:14, background:"#f0f9ff", borderRadius:8, border:"1px solid #bee3f8" }}>
                            <div style={{ fontWeight:700, fontSize:12, color:"#0369a1", marginBottom:6 }}>AEO — Direct Answer</div>
                            <p style={{ margin:0, fontSize:13, color:"#333" }}>{p.aeo.direct_answer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ══ YOUTUBE ══ */}
        {tab==="youtube" && (
          <div>
            <h2 style={H2}>Scripts YouTube SEO</h2>
            <div style={{ background:"white", padding:24, borderRadius:12, border:"1px solid #eee", marginBottom:24 }}>
              <Field label="Keyword del video">
                <input value={ytKeyword} onChange={e=>setYtKeyword(e.target.value)}
                  placeholder="ej: control de activos fijos con RFID"
                  style={{...INP, width:"100%", boxSizing:"border-box"}} />
              </Field>
              <div style={{ display:"flex", gap:14 }}>
                <Field label="Tipo de contenido" style={{flex:1}}>
                  <select value={ytType} onChange={e=>setYtType(e.target.value)} style={SEL}>
                    <option value="pillar">Basado en Pillar Page</option>
                    <option value="secondary">Basado en Secondary Page</option>
                    <option value="third">Basado en Third Page</option>
                    <option value="blog">Basado en Blog Post</option>
                    <option value="demo">Demo de producto</option>
                    <option value="tutorial">Tutorial paso a paso</option>
                  </select>
                </Field>
                <Field label="Industria" style={{flex:1}}>
                  <select value={ytIndustry} onChange={e=>setYtIndustry(e.target.value)} style={SEL}>
                    <option>RFID general</option><option>retail</option><option>manufactura</option>
                    <option>clubes y gimnasios</option><option>industria petrolera</option><option>bodegas y logistica</option>
                  </select>
                </Field>
              </div>
              {pending.length>0 && (
                <Field label="Vincular a pagina existente (opcional)">
                  <select value={ytPageId} onChange={e=>setYtPageId(e.target.value)} style={SEL}>
                    <option value="">Sin vinculacion</option>
                    {pending.map(p=><option key={p.id} value={p.id}>{p.content.title||p.keyword} ({p.page_type})</option>)}
                  </select>
                </Field>
              )}
              <button onClick={generateYTScript} disabled={loading||!ytKeyword.trim()} style={{...BTN_BLUE, width:"100%", padding:"13px", opacity:loading||!ytKeyword.trim()?0.55:1, cursor:loading||!ytKeyword.trim()?"not-allowed":"pointer", background:"#cc0000"}}>
                {loading?"Generando script YouTube...":"Generar script con Claude"}
              </button>
            </div>

            {ytScripts.length===0 ? <Empty text="Sin scripts. Genera el primero arriba." />
              : ytScripts.map(s=>{
                const isExp = expandedYt===s.id
                return (
                  <div key={s.id} style={{ background:"white", borderRadius:12, border:"1px solid #eee", marginBottom:12, overflow:"hidden" }}>
                    <div style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <span style={{ fontWeight:700, color:"#0b194f" }}>{s.script.video_title}</span>
                        <Bx>{s.page_type}</Bx>
                        <span style={{ color:"#bbb", fontSize:12, marginLeft:8 }}>{new Date(s.created_at).toLocaleDateString("es-CO")}</span>
                      </div>
                      <div style={{ display:"flex", gap:7 }}>
                        <button onClick={()=>setExpandedYt(isExp?null:s.id)} style={BTN_GHOST}>{isExp?"Cerrar":"Ver script"}</button>
                        <button onClick={async()=>{await fetch("/api/youtube-script",{method:"DELETE",headers:jsonHdr,body:JSON.stringify({id:s.id})});loadData()}} style={BTN_DEL}>x</button>
                      </div>
                    </div>
                    {isExp && (
                      <div style={{ borderTop:"1px solid #f0f0f0", padding:"16px 20px", background:"#fafafa" }}>
                        <PMeta label="Descripcion YouTube" text={s.script.video_description} />
                        <div style={{ marginBottom:10 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Tags</span>
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:4 }}>
                            {s.script.tags?.map((t:string,i:number)=><span key={i} style={{ background:"#f0f0f0", padding:"2px 8px", borderRadius:20, fontSize:11, color:"#555" }}>{t}</span>)}
                          </div>
                        </div>
                        <PMeta label="Hook (primeros 15s)" text={s.script.hook} />
                        <div style={{ marginTop:10 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Capitulos</span>
                          {s.script.chapters?.map((c:any,i:number)=>(
                            <div key={i} style={{ marginTop:8, paddingLeft:12, borderLeft:"3px solid #cc0000" }}>
                              <p style={{ margin:0, fontWeight:700, fontSize:13, color:"#0b194f" }}>{c.timestamp} — {c.title}</p>
                              <p style={{ margin:"3px 0 0", fontSize:12, color:"#666", lineHeight:1.5 }}>{c.script}</p>
                            </div>
                          ))}
                        </div>
                        <PMeta label="CTA Outro" text={s.script.cta_outro} />
                        <PMeta label="Comentario fijado" text={s.script.pinned_comment} />
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ══ AEO ══ */}
        {tab==="aeo" && (
          <div>
            <h2 style={H2}>AEO — Optimizacion para Motores de IA</h2>
            <p style={{ color:"#777", fontSize:13, marginTop:-12, marginBottom:20 }}>
              Optimiza tus paginas para ChatGPT Search, Perplexity, Google AI Overviews, Gemini y Bing Copilot.
              El sistema genera: direct answer, featured snippet, schema FAQ JSON-LD, citation blocks y LLM seed phrases.
            </p>
            <Tip type="info">
              Despues de optimizar: copia el <strong>schema_faq JSON-LD</strong> al head de la pagina en wetracking.co para maximo impacto en AI Overviews.
            </Tip>

            {aeoItems.length===0 ? <Empty text="Sin paginas. Genera y revisa contenido primero." />
              : aeoItems.map(item=>{
                const ti = PAGE_TYPE_COLORS[item.page_type]||PAGE_TYPE_COLORS.pillar
                const isExp = expandedAeo===item.id
                return (
                  <div key={item.id} style={{ background:"white", borderRadius:12, border:"1px solid #eee", marginBottom:12, overflow:"hidden" }}>
                    <div style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <span style={{ fontWeight:700, color:"#0b194f" }}>{item.title||item.keyword}</span>
                        <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:ti.bg, color:ti.color, marginLeft:7 }}>{ti.label}</span>
                        {item.aeo
                          ? <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:"#e8f5e9", color:"#2e7d32", marginLeft:6 }}>AEO optimizado</span>
                          : <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fff3cd", color:"#856404", marginLeft:6 }}>Sin AEO</span>
                        }
                        <span style={{ marginLeft:8, fontSize:11, color:"#bbb" }}>{item.list}</span>
                      </div>
                      <div style={{ display:"flex", gap:7 }}>
                        {item.aeo && <button onClick={()=>setExpandedAeo(isExp?null:item.id)} style={BTN_GHOST}>{isExp?"Cerrar":"Ver AEO"}</button>}
                        <button onClick={()=>optimizeAEO(item.id)} disabled={loading} style={{ ...BTN_BLUE, padding:"7px 14px", fontSize:12 }}>
                          {item.aeo?"Re-optimizar":"Optimizar para IA"}
                        </button>
                      </div>
                    </div>
                    {isExp && item.aeo && (
                      <div style={{ borderTop:"1px solid #f0f0f0", padding:"16px 20px", background:"#fafafa" }}>
                        <AEOBlock label="Direct Answer (para citar)" text={item.aeo.direct_answer} accent="#007aed" />
                        <AEOBlock label="Featured Snippet (Google Position Zero)" text={item.aeo.featured_snippet} accent="#28a745" />
                        <div style={{ marginBottom:12 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Queries de IA que esta pagina responde</span>
                          {item.aeo.ai_queries?.map((q:string,i:number)=>(
                            <div key={i} style={{ marginTop:4, padding:"4px 10px", background:"#f0f8ff", borderRadius:6, fontSize:12, color:"#333" }}>{q}</div>
                          ))}
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Citation Blocks</span>
                          {item.aeo.citation_blocks?.map((b:any,i:number)=>(
                            <div key={i} style={{ marginTop:6, paddingLeft:12, borderLeft:"3px solid #00ffd7" }}>
                              <p style={{ margin:0, fontWeight:600, fontSize:13 }}>{b.claim}</p>
                              <p style={{ margin:"2px 0 0", fontSize:12, color:"#777" }}>{b.context}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>LLM Seed Phrases</span>
                          {item.aeo.llm_seed_phrases?.map((p:string,i:number)=>(
                            <div key={i} style={{ marginTop:4, padding:"6px 10px", background:"#f5f0ff", borderRadius:6, fontSize:12, color:"#555", fontStyle:"italic" }}>"{p}"</div>
                          ))}
                        </div>
                        <div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Schema FAQ JSON-LD</span>
                            <button onClick={()=>navigator.clipboard.writeText(`<script type="application/ld+json">\n${JSON.stringify(item.aeo.schema_faq,null,2)}\n</script>`)}
                              style={{ padding:"3px 10px", background:"#007aed", color:"white", border:"none", borderRadius:5, cursor:"pointer", fontSize:11 }}>
                              Copiar JSON-LD
                            </button>
                          </div>
                          <pre style={{ background:"#1e1e2e", color:"#cdd6f4", padding:"12px 14px", borderRadius:8, fontSize:11, overflowX:"auto", margin:0 }}>
                            {JSON.stringify(item.aeo.schema_faq, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ══ CLUSTERS ══ */}
        {tab==="clusters" && (
          <div>
            <h2 style={H2}>Clusters de Contenido</h2>
            <div style={{ background:"white", padding:20, borderRadius:12, border:"1px solid #eee", marginBottom:20 }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-end" }}>
                <Field label="Nombre del cluster" style={{flex:1,marginBottom:0}}>
                  <input value={newCName} onChange={e=>setNewCName(e.target.value)} placeholder="ej: Manufactura RFID" style={{...INP,width:"100%",boxSizing:"border-box"}} />
                </Field>
                <Field label="ID (en Base44)" style={{flex:1,marginBottom:0}}>
                  <input value={newCId} onChange={e=>setNewCId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCluster()} placeholder="ej: manufactura-rfid" style={{...INP,width:"100%",boxSizing:"border-box"}} />
                </Field>
                <button onClick={addCluster} style={BTN_BLUE}>Agregar</button>
              </div>
            </div>
            {clusters.length===0 ? <Empty text="Sin clusters." />
              : clusters.map(c=>(
                <div key={c.id} style={{...CARD,marginBottom:8}}>
                  <div><span style={{ fontWeight:600, color:"#0b194f" }}>{c.name}</span><code style={{ ...CODE, marginLeft:9 }}>{c.id}</code></div>
                  <div style={{ display:"flex", gap:7 }}>
                    <button onClick={()=>{setGenCluster(c.id);setTab("generate")}} style={BTN_CYAN}>Usar</button>
                    <button onClick={()=>deleteCluster(c.id)} style={BTN_DEL}>Eliminar</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ══ PUBLICADAS ══ */}
        {tab==="published" && (
          <div>
            <h2 style={H2}>Paginas Publicadas</h2>
            <div style={{ background:"#0b194f", borderRadius:12, padding:"16px 22px", marginBottom:22, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ color:"#00ffd7", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Sitemap XML activo</div>
                <code style={{ color:"white", fontSize:13 }}>https://wetracking.co/sitemap.xml</code>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" style={{ padding:"7px 14px", background:"rgba(255,255,255,0.15)", color:"white", borderRadius:7, fontSize:12, textDecoration:"none", fontWeight:600 }}>Ver local</a>
                <a href="https://wetracking.co/sitemap.xml" target="_blank" rel="noopener noreferrer" style={{ padding:"7px 14px", background:"#00ffd7", color:"#0b194f", borderRadius:7, fontSize:12, textDecoration:"none", fontWeight:700 }}>Ver produccion</a>
              </div>
            </div>
            <div style={{ background:"white", borderRadius:12, border:"1px solid #eee", marginBottom:18, overflow:"hidden" }}>
              <div style={{ padding:"11px 18px", background:"#f8f9fa", borderBottom:"1px solid #eee" }}>
                <span style={{ fontWeight:700, fontSize:12, color:"#0b194f" }}>Paginas estaticas (siempre incluidas)</span>
              </div>
              {[{u:"https://wetracking.co",p:"1.0"},{u:"https://wetracking.co/soluciones",p:"0.9"},{u:"https://wetracking.co/industrias",p:"0.8"},{u:"https://wetracking.co/contacto",p:"0.8"},{u:"https://wetracking.co/blog",p:"0.7"},{u:"https://wetracking.co/nosotros",p:"0.7"}].map((s,i)=>(
                <div key={i} style={{ padding:"9px 18px", borderBottom:"1px solid #f5f5f5", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#007aed", fontSize:13 }}>{s.u}</span>
                  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:"#f0fff4", color:"#28a745" }}>p{s.p}</span>
                </div>
              ))}
            </div>
            <div style={{ fontWeight:700, fontSize:13, color:"#0b194f", marginBottom:10 }}>Paginas dinamicas ({publishedSM.length})</div>
            {publishedSM.length===0 ? <Empty text="Sin paginas publicadas." />
              : publishedSM.map((s,i)=>(
                <div key={i} style={{...CARD, flexDirection:"column", alignItems:"flex-start", gap:3, marginBottom:8}}>
                  <div style={{ display:"flex", justifyContent:"space-between", width:"100%" }}>
                    <span style={{ fontWeight:600, color:"#0b194f", fontSize:13 }}>{s.keyword}</span>
                    <div style={{ display:"flex", gap:5 }}>
                      {s.entity&&<Bx>{s.entity}</Bx>}
                      <span style={{ padding:"2px 7px", borderRadius:20, fontSize:10, fontWeight:700, background:"#f0fff4", color:"#28a745" }}>p{s.priority}</span>
                    </div>
                  </div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color:"#007aed", fontSize:12 }}>{s.url}</a>
                </div>
              ))
            }
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ──

function ContentPrev({ page }: { page: Page }) {
  const { page_type, content } = page
  if (page_type==="blog") return (
    <div>
      <PMeta label="paragraph_1" text={content.paragraph_1} />
      <PMeta label="paragraph_2" text={content.paragraph_2} />
      <PMeta label="paragraph_3" text={content.paragraph_3} />
    </div>
  )
  return (
    <div>
      <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Content Sections ({content.content_sections?.length||0})</span>
      <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:5 }}>
        {content.content_sections?.map((s:ContentSection, i:number)=>(
          <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <span style={{ flexShrink:0, padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:700, background:s.type==="heading2"?"#e8f4fd":"#f5f5f5", color:s.type==="heading2"?"#007aed":"#888", fontFamily:"monospace", border:"1px solid #e0e0e0" }}>{s.type}</span>
            <p style={{ margin:0, fontSize:12, color:s.type.startsWith("heading")?"#0b194f":"#666", fontWeight:s.type.startsWith("heading")?600:400 }}>{s.content}</p>
          </div>
        ))}
      </div>
      {page_type==="pillar" && content.faq_items?.length>0 && (
        <div style={{ marginTop:12, borderTop:"1px solid #eee", paddingTop:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>FAQ — {content.faq_title}</span>
          {content.faq_items.map((f:any,i:number)=>(
            <div key={i} style={{ marginTop:6, paddingLeft:10, borderLeft:"3px solid #00ffd7" }}>
              <p style={{ margin:0, fontWeight:600, fontSize:12 }}>{f.question}</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#666" }}>{f.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResBlock({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:0.5 }}>{label}</span>
      <ul style={{ margin:"4px 0 0", paddingLeft:16 }}>
        {items.map((it,i)=><li key={i} style={{ fontSize:12, color:"#444", marginBottom:3, lineHeight:1.5 }}>{it}</li>)}
      </ul>
    </div>
  )
}

function AEOBlock({ label, text, accent }: { label: string; text?: string; accent?: string }) {
  if (!text) return null
  return (
    <div style={{ marginBottom:12, padding:"10px 14px", background:"#f8faff", borderRadius:8, borderLeft:`3px solid ${accent||"#007aed"}` }}>
      <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>{label}</span>
      <p style={{ margin:"4px 0 0", fontSize:13, color:"#333", lineHeight:1.6 }}>{text}</p>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom:14, ...style }}>
      <label style={{ display:"block", fontWeight:600, marginBottom:5, color:"#0b194f", fontSize:13 }}>{label}</label>
      {children}
    </div>
  )
}

function PMeta({ label, text }: { label: string; text?: string }) {
  if (!text) return null
  return (
    <div style={{ flex:1, minWidth:180, marginBottom:8 }}>
      <span style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>{label}</span>
      <p style={{ margin:"3px 0 0", fontSize:12, color:"#555", fontFamily:"monospace", background:"#f0f0f0", padding:"3px 7px", borderRadius:4 }}>{text}</p>
    </div>
  )
}

function Bx({ children }: { children: React.ReactNode }) {
  return <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:20, fontSize:10, fontWeight:600, background:"#f0f0f0", color:"#777", marginLeft:5 }}>{children}</span>
}

function Tip({ type, children }: { type:"warn"|"info"; children: React.ReactNode }) {
  return (
    <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, fontSize:13,
      background:type==="warn"?"#fff3cd":"#e8f4fd", color:type==="warn"?"#856404":"#0b4f8a",
      border:`1px solid ${type==="warn"?"#ffeaa7":"#bee3f8"}` }}>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign:"center", padding:"40px 24px", color:"#bbb", background:"white", borderRadius:12, border:"1px dashed #ddd", fontSize:13 }}>{text}</div>
}

// ── Styles ──
const jsonHdr = { "Content-Type": "application/json" }
const H2: React.CSSProperties = { color:"#0b194f", marginBottom:20, marginTop:0, fontSize:20 }
const INP: React.CSSProperties = { padding:"9px 12px", borderRadius:7, border:"1px solid #ddd", fontSize:13, color:"#1a1a1a", background:"white" }
const SEL: React.CSSProperties = { width:"100%", padding:"9px 12px", borderRadius:7, border:"1px solid #ddd", fontSize:13, color:"#1a1a1a", background:"white" }
const CARD: React.CSSProperties = { background:"white", padding:"12px 18px", borderRadius:10, border:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center" }
const CODE: React.CSSProperties = { background:"#f0f0f0", padding:"1px 5px", borderRadius:3, fontSize:11, fontFamily:"monospace" }
const BTN_BLUE: React.CSSProperties  = { padding:"9px 20px", background:"#007aed", color:"white", border:"none", borderRadius:7, cursor:"pointer", fontWeight:600, fontSize:13 }
const BTN_CYAN: React.CSSProperties  = { padding:"7px 14px", background:"#00ffd7", color:"#0b194f", border:"none", borderRadius:20, cursor:"pointer", fontWeight:700, fontSize:12 }
const BTN_GHOST: React.CSSProperties = { padding:"7px 12px", background:"#f5f5f5", color:"#555", border:"1px solid #ddd", borderRadius:7, cursor:"pointer", fontSize:12 }
const BTN_DEL: React.CSSProperties   = { padding:"7px 12px", background:"#fff0f0", color:"#dc3545", border:"1px solid #f5c2c7", borderRadius:7, cursor:"pointer", fontSize:12 }
