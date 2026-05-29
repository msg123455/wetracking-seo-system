"use client"
import { useState, useEffect, useRef } from "react"

// ── Types ──
type Keyword   = { id: string; keyword: string; volume: string; difficulty: string; intent: string }
type Cluster   = { id: string; name: string; created_at: string }
type Research  = { id: string; topic: string; depth: string; data: any; competitor_analysis?: any; sources_scraped?: number; created_at: string }
type YTScript  = { id: string; keyword: string; page_type: string; page_id: string | null; script: any; created_at: string }
type AEOItem   = { id: string; keyword: string; page_type: string; title: string; aeo: any | null; list: string }
type ContentSection = { type: string; content: string; alt_text: string; items?: string[]; headers?: string[]; rows?: string[][] }

type Page = {
  id: string; keyword: string; page_type: string; industry: string
  cluster_id: string; pillar_id: string; aeo?: any
  content: Record<string, any>; status: string; created_at: string
}
type SitemapEntry = { id?: string; url: string; keyword: string; lastmod: string; priority: string; entity?: string; page_type?: string; cluster_id?: string }

type SitemapNode = {
  id: string; sitemap_id: string; url: string; keyword: string
  page_type: string; depth: number; parent_id: string | null
  status: "draft" | "generated" | "published"; page_id: string | null; created_at: string
}
type SitemapDef = { id: string; name: string; root_keyword: string; industry: string; node_count: number; created_at: string }

type Tab = "dashboard" | "activity" | "sitemapbuild" | "keywords" | "research" | "generate" | "pending" | "youtube" | "aeo" | "clusters" | "published" | "images" | "updates" | "linkedin"
type GeneratedImage  = { id: string; url: string; description: string; created_at: string }
type LinkedInPost   = { id: string; keyword: string; page_type: string; format: string; format_label?: string; page_id: string | null; text: string; created_at: string }
type ProgressItem  = { text: string; detail?: string; status: "pending" | "running" | "done" | "error" }
type ProgressLog   = { id: string; title: string; success: boolean; completedAt: string }

const PAGE_TYPE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  pillar:    { label: "Pillar",    color: "#6f42c1", bg: "#f3eeff" },
  secondary: { label: "Secondary", color: "#007aed", bg: "#e8f4fd" },
  third:     { label: "Third",     color: "#0d9488", bg: "#e0f7f5" },
  blog:      { label: "Blog",      color: "#fd7e14", bg: "#fff3e8" },
}

export default function SEOCommandCenter() {
  const [tab, setTab] = useState<Tab>("dashboard")

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

  // linkedin
  const [linkedinPosts,  setLinkedinPosts]  = useState<LinkedInPost[]>([])
  const [allPages,       setAllPages]       = useState<Page[]>([])
  const [expandedLi,     setExpandedLi]     = useState<string|null>(null)
  const [copiedLi,       setCopiedLi]       = useState<string|null>(null)
  const [generatingLi,   setGeneratingLi]   = useState<string|null>(null)

  // form – image
  const [imgDesc,      setImgDesc]      = useState("")
  const [imgPageId,    setImgPageId]    = useState("")
  const [imgField,     setImgField]     = useState("image_1_url")
  const [imgPreview,   setImgPreview]   = useState("")
  const [genImages,    setGenImages]    = useState<GeneratedImage[]>([])
  const [imgTestDesc,  setImgTestDesc]  = useState("")

  // form – YouTube
  const [ytKeyword,    setYtKeyword]    = useState("")
  const [ytType,       setYtType]       = useState("pillar")
  const [ytIndustry,   setYtIndustry]   = useState("RFID general")
  const [ytPageId,     setYtPageId]     = useState("")
  const [expandedYt,   setExpandedYt]   = useState<string|null>(null)

  // pending
  const [expandedPage, setExpandedPage] = useState<string|null>(null)
  const [expandedAeo,  setExpandedAeo]  = useState<string|null>(null)
  const [ctaEdits,     setCtaEdits]     = useState<Record<string, string>>({})
  const [ctaSaved,     setCtaSaved]     = useState<Record<string, boolean>>({})

  // sitemap node editing
  const [editingNode,  setEditingNode]  = useState<string|null>(null)
  const [nodeEdits,    setNodeEdits]    = useState<Record<string, {url:string;keyword:string;page_type:string}>>({})
  const [showAddNode,  setShowAddNode]  = useState(false)
  const [addNodeUrl,   setAddNodeUrl]   = useState("")
  const [addNodeKw,    setAddNodeKw]    = useState("")
  const [addNodeType,  setAddNodeType]  = useState<"pillar"|"secondary"|"third"|"blog">("secondary")

  // content updates panel
  const [updatingPages, setUpdatingPages] = useState<Record<string, boolean>>({})
  const [updateFilter,  setUpdateFilter]  = useState<"all"|"critical"|"review"|"ok">("all")

  // activity module
  const [progressItems,   setProgressItems]   = useState<ProgressItem[]>([])
  const [progressTitle,   setProgressTitle]   = useState("")
  const [progressDone,    setProgressDone]    = useState<boolean | null>(null)
  const [progressHistory, setProgressHistory] = useState<ProgressLog[]>([])
  const progressTitleRef  = useRef("")
  const progressLogRef    = useRef<HTMLDivElement>(null)

  // global loading + messages
  const [loading,      setLoading]      = useState(false)
  const [message,      setMessage]      = useState<{text:string;type:"success"|"error"|"info"}|null>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (progressLogRef.current) progressLogRef.current.scrollTop = progressLogRef.current.scrollHeight
  }, [progressItems])

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
      const iR  = await fetch("/api/generate-image");  if (iR.ok)  setGenImages(await iR.json())
      const liR = await fetch("/api/linkedin");         if (liR.ok) setLinkedinPosts(await liR.json())
      const pgR = await fetch("/api/pages");            if (pgR.ok) setAllPages(await pgR.json())
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

  // ── Progress tracking (Activity module) ──
  function startProgress(title: string) {
    setProgressItems([])
    setProgressTitle(title)
    setProgressDone(null)
    progressTitleRef.current = title
    setTab("activity")
  }

  function addProgressStep(text: string, detail?: string) {
    setProgressItems(prev => [
      ...prev.map(item => item.status === "running" ? { ...item, status: "done" as const } : item),
      { text, detail, status: "running" as const },
    ])
  }

  function finishProgress(success: boolean) {
    setProgressItems(prev => prev.map(item =>
      item.status === "running" ? { ...item, status: success ? "done" as const : "error" as const } : item
    ))
    setProgressDone(success)
    setProgressHistory(hist => [
      { id: Date.now().toString(), title: progressTitleRef.current, success, completedAt: new Date().toISOString() },
      ...hist.slice(0, 14),
    ])
  }

  async function readSSE(
    url: string,
    body: any,
    onStep: (text: string, detail?: string) => void
  ): Promise<any> {
    const res = await fetch(url, { method: "POST", headers: jsonHdr, body: JSON.stringify(body) })
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let result: any = null
    let resultFound = false
    let errorMsg: string | null = null
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""
        for (const block of blocks) {
          const dataLine = block.split("\n").find((l: string) => l.startsWith("data: "))
          if (!dataLine) continue
          try {
            const msg = JSON.parse(dataLine.slice(6))
            if (msg.event === "step") onStep(msg.text, msg.detail)
            else if (msg.event === "done") { result = msg.data; resultFound = true }
            else if (msg.event === "error") errorMsg = msg.text
          } catch { /* malformed chunk, skip */ }
        }
      }
    } finally {
      try { reader.releaseLock() } catch { /* already released */ }
    }
    if (errorMsg) throw new Error(errorMsg)
    if (!resultFound) throw new Error("Stream finalizado sin respuesta del servidor")
    return result
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
    startProgress(`Research: "${resTopic}"`)
    setLoading(true)
    try {
      const research = await readSSE("/api/research", { topic: resTopic, depth: resDepth }, addProgressStep)
      finishProgress(true)
      notify(`Research completado: "${resTopic}" (${research.sources_scraped || 0} fuentes)`, "success")
      setResTopic(""); loadData()
    } catch (e: any) { finishProgress(false); notify("Error: " + e.message, "error") }
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
    startProgress(`Generando: "${node.keyword}"`)
    setLoading(true)
    try {
      const page = await readSSE("/api/generate-content", {
        keyword: node.keyword,
        page_type: node.page_type,
        industry: activeSitemap?.industry || "RFID general",
        cluster_id: "default",
        pillar_id: "default",
        research_id: research_id || undefined,
      }, addProgressStep)
      await fetch("/api/sitemap-builder", {
        method: "PATCH", headers: jsonHdr,
        body: JSON.stringify({ node_id: node.id, status: "generated", page_id: page.id }),
      })
      finishProgress(true)
      notify(`Contenido listo para "${node.keyword}" — ver en Pendientes`, "success")
      loadData()
    } catch (e: any) { finishProgress(false); notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  async function researchAndGenerate(node: SitemapNode) {
    const activeSitemap = sitemapDefs.find(s => s.id === node.sitemap_id)
    startProgress(`Research + Generar: "${node.keyword}"`)
    setLoading(true)
    try {
      const research = await readSSE("/api/research", { topic: node.keyword, depth: "deep" }, addProgressStep)
      const page = await readSSE("/api/generate-content", {
        keyword: node.keyword,
        page_type: node.page_type,
        industry: activeSitemap?.industry || "RFID general",
        cluster_id: "default",
        pillar_id: "default",
        research_id: research.id,
      }, addProgressStep)
      await fetch("/api/sitemap-builder", {
        method: "PATCH", headers: jsonHdr,
        body: JSON.stringify({ node_id: node.id, status: "generated", page_id: page.id }),
      })
      finishProgress(true)
      notify(`Contenido listo para "${node.keyword}" — ver en Pendientes`, "success")
      loadData()
    } catch (e: any) { finishProgress(false); notify("Error: " + e.message, "error") }
    setLoading(false)
  }

  // ── Generate content ──
  async function generateContent() {
    if (!genKeyword.trim()) return
    startProgress(`Generando: "${genKeyword}"`)
    setLoading(true)
    try {
      const page = await readSSE("/api/generate-content", {
        keyword: genKeyword, page_type: genType, industry: genIndustry,
        cluster_id: genCluster || "default", pillar_id: genPillar || "default",
        research_id: genResearch || undefined,
      }, addProgressStep)
      finishProgress(true)
      notify(`Pagina "${genKeyword}" lista para revision`, "success")
      setGenKeyword(""); setTab("pending"); loadData()
    } catch (e: any) { finishProgress(false); notify("Error: " + e.message, "error") }
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
  async function saveNodeEdit(node_id: string) {
    const edits = nodeEdits[node_id]; if (!edits) return
    await fetch("/api/sitemap-builder", { method:"PATCH", headers:jsonHdr, body: JSON.stringify({ node_id, ...edits }) })
    setEditingNode(null)
    loadData()
  }
  async function deleteNode(node_id: string) {
    await fetch("/api/sitemap-builder", { method:"DELETE", headers:jsonHdr, body: JSON.stringify({ node_id }) })
    loadData()
  }
  async function addNode() {
    if (!addNodeUrl.trim() || !addNodeKw.trim() || !activeSitemapId) return
    const depth = addNodeType === "pillar" ? 0 : addNodeType === "secondary" ? 1 : addNodeType === "blog" ? 0 : 2
    await fetch("/api/sitemap-builder", { method:"POST", headers:jsonHdr, body: JSON.stringify({ action:"add_node", sitemap_id:activeSitemapId, url:addNodeUrl, keyword:addNodeKw, page_type:addNodeType, depth }) })
    setAddNodeUrl(""); setAddNodeKw(""); setShowAddNode(false); loadData()
  }

  async function saveCta(page_id: string, value: string) {
    try {
      await fetch("/api/pending", { method:"PATCH", headers:jsonHdr, body: JSON.stringify({ page_id, field:"cta_text", value }) })
      setCtaSaved(prev => ({ ...prev, [page_id]: true }))
      setTimeout(() => setCtaSaved(prev => ({ ...prev, [page_id]: false })), 2000)
    } catch { /* silent */ }
  }

  // ── Refresh a published page (content update alert) ──
  async function refreshPublishedPage(entry: SitemapEntry) {
    if (!entry.id) return
    const nodeForPage = sitemapNodes.find(n => n.page_id === entry.id)
    startProgress(`Actualizando: "${entry.keyword}"`)
    setUpdatingPages(prev => ({ ...prev, [entry.id!]: true }))
    setLoading(true)
    try {
      const research = await readSSE("/api/research", { topic: entry.keyword, depth: "deep" }, addProgressStep)
      const page = await readSSE("/api/generate-content", {
        keyword: entry.keyword,
        page_type: entry.page_type || "pillar",
        industry: "RFID general",
        cluster_id: entry.cluster_id || "default",
        pillar_id: "default",
        research_id: research.id,
      }, addProgressStep)
      if (nodeForPage) {
        await fetch("/api/sitemap-builder", {
          method: "PATCH", headers: jsonHdr,
          body: JSON.stringify({ node_id: nodeForPage.id, status: "generated", page_id: page.id }),
        })
      }
      finishProgress(true)
      notify(`Nueva version lista para "${entry.keyword}" — revisa en Pendientes`, "success")
      setTab("pending"); loadData()
    } catch (e: any) { finishProgress(false); notify("Error al actualizar: " + e.message, "error") }
    setUpdatingPages(prev => ({ ...prev, [entry.id!]: false }))
    setLoading(false)
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
  const staleCount = publishedSM.filter(p => {
    const days = Math.floor((Date.now() - new Date(p.lastmod).getTime()) / 86_400_000)
    return days > 90
  }).length

  const TABS: { key: Tab; label: string; count?: number; dot?: boolean }[] = [
    { key:"sitemapbuild", label:"Estructura",      count: sitemapDefs.length },
    { key:"keywords",     label:"Keywords",        count: keywords.length },
    { key:"research",     label:"Research",        count: research.length },
    { key:"generate",     label:"Generar" },
    { key:"pending",      label:"Pendientes",      count: pending.length,   dot: pending.length > 0 },
    { key:"youtube",      label:"YouTube",         count: ytScripts.length },
    { key:"aeo",          label:"AEO",             count: aeoItems.filter(a=>a.aeo).length },
    { key:"clusters",     label:"Clusters",        count: clusters.length },
    { key:"published",    label:"Publicadas",      count: publishedSM.length },
    { key:"updates",      label:"Actualizaciones", count: staleCount, dot: staleCount > 0 },
    { key:"images",       label:"Imagenes",        count: genImages.length },
  ]

  const NAV_GROUPS = [
    { section: null, items: [
      { key:"dashboard", label:"Dashboard" },
      { key:"activity",  label:"Actividad", dot: loading, alertRed: progressDone === false },
    ]},
    { section: "CONTENIDO", items: [
      { key:"sitemapbuild", label:"Estructura SEO",  count: sitemapDefs.length },
      { key:"research",     label:"Research",        count: research.length },
      { key:"generate",     label:"Generar" },
    ]},
    { section: "PAGINAS", items: [
      { key:"pending",   label:"Pendientes",      count: pending.length,      dot: pending.length > 0 },
      { key:"published", label:"Publicadas",       count: publishedSM.length },
      { key:"updates",   label:"Actualizaciones",  count: staleCount,          alertRed: staleCount > 0 },
    ]},
    { section: "REDES", items: [
      { key:"linkedin", label:"LinkedIn",  count: linkedinPosts.length },
    ]},
    { section: "OPTIMIZACION", items: [
      { key:"aeo",     label:"AEO",       count: aeoItems.filter((a:any)=>a.aeo).length },
      { key:"youtube", label:"YouTube",   count: ytScripts.length },
      { key:"images",  label:"Imagenes",  count: genImages.length },
    ]},
    { section: "CONFIG", items: [
      { key:"keywords", label:"Keywords", count: keywords.length },
      { key:"clusters", label:"Clusters", count: clusters.length },
    ]},
  ]

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden", background:"#f0f2f7" }}>
      <style>{`@keyframes pgSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.pgSpin{animation:pgSpin 0.7s linear infinite;display:inline-block}`}</style>

      {/* ── Header ── */}
      <div style={{ background:"#0b194f", padding:"0 22px", height:50, display:"flex", alignItems:"center", gap:12, flexShrink:0, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ color:"#00ffd7", fontWeight:800, fontSize:17 }}>WeTracking</span>
        <span style={{ color:"rgba(255,255,255,0.2)", fontSize:18, fontWeight:200 }}>|</span>
        <span style={{ color:"rgba(255,255,255,0.7)", fontWeight:500, fontSize:13 }}>SEO Command Center</span>
        {loading && (
          <span style={{ marginLeft:8, fontSize:11, color:"#00ffd7", background:"rgba(0,255,215,0.1)", padding:"3px 10px", borderRadius:20 }}>Procesando...</span>
        )}
        {message && (
          <div style={{ marginLeft:"auto", background: message.type==="success"?"rgba(0,200,130,0.18)":message.type==="error"?"rgba(220,53,69,0.22)":"rgba(255,193,7,0.18)", padding:"5px 14px", borderRadius:20, color: message.type==="success"?"#00ffd7":message.type==="error"?"#ff9999":"#ffc107", fontSize:12, display:"flex", alignItems:"center", gap:8, maxWidth:480 }}>
            <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{message.text}</span>
            <button onClick={()=>setMessage(null)} style={{ background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:14,lineHeight:1,padding:0,flexShrink:0 }}>x</button>
          </div>
        )}
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width:212, background:"#0d1b38", display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.06)" }}>
          {NAV_GROUPS.map((group: any, gi: number) => (
            <div key={gi} style={{ marginTop: gi===0 ? 10 : 0 }}>
              {group.section && (
                <div style={{ padding:"16px 18px 5px", fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.28)", textTransform:"uppercase", letterSpacing:1.2 }}>
                  {group.section}
                </div>
              )}
              {group.items.map((item: any) => {
                const active = tab === item.key
                return (
                  <button key={item.key} onClick={()=>setTab(item.key as Tab)} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
                    width:"100%", padding:"9px 16px 9px 18px", border:"none", cursor:"pointer",
                    background: active ? "rgba(0,122,237,0.22)" : "transparent",
                    borderLeft: `3px solid ${active ? "#007aed" : "transparent"}`,
                    color: active ? "white" : "rgba(255,255,255,0.55)",
                    fontSize:13, fontWeight: active ? 600 : 400, textAlign:"left",
                  }}>
                    <span>{item.label}</span>
                    <span style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                      {item.count !== undefined && item.count > 0 && (
                        <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:20,
                          background: item.alertRed ? "#dc3545" : active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
                          color:      item.alertRed ? "white"    : active ? "white"                  : "rgba(255,255,255,0.45)",
                        }}>{item.count}</span>
                      )}
                      {item.dot && <span style={{ width:6, height:6, borderRadius:"50%", background:"#00ffd7", flexShrink:0 }}/>}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Main content ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>

        {/* ══ ACTIVIDAD ══ */}
        {tab==="activity" && (
          <div>
            <div style={{ marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <h2 style={{ ...H2, marginBottom:4 }}>Actividad del Sistema</h2>
                <p style={{ color:"#888", fontSize:13, margin:0 }}>
                  Cada operacion de research y generacion aparece aqui en tiempo real.
                </p>
              </div>
              {progressItems.length > 0 && progressDone !== null && (
                <button onClick={() => { setProgressItems([]); setProgressTitle(""); setProgressDone(null) }}
                  style={BTN_GHOST}>Limpiar</button>
              )}
            </div>

            {/* ── Operacion activa ── */}
            {progressTitle && (
              <div style={{ background:"white", borderRadius:14, overflow:"hidden", marginBottom:22, border: progressDone === false ? "1px solid #f5c2c7" : progressDone === true ? "1px solid #a3e0c5" : "1px solid #dce3f0", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                {/* Header strip */}
                <div style={{
                  background: progressDone === false ? "#dc3545" : progressDone === true ? "#146c43" : "#0b194f",
                  padding:"14px 22px", display:"flex", alignItems:"center", gap:12,
                }}>
                  {loading
                    ? <span className="pgSpin" style={{ color:"#00ffd7", fontSize:15, flexShrink:0 }}>◌</span>
                    : <span style={{ color: progressDone === false ? "white" : "#00ffd7", fontSize:15, flexShrink:0 }}>
                        {progressDone === false ? "✗" : "✓"}
                      </span>
                  }
                  <div style={{ flex:1, overflow:"hidden" }}>
                    <div style={{ color:"white", fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {progressTitle}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11, marginTop:2 }}>
                      {loading ? "Procesando..." : progressDone === true ? "Completado exitosamente" : "Finalizado con error"}
                    </div>
                  </div>
                  {progressDone === true && (
                    <button onClick={() => setTab("pending")} style={{ background:"#00ffd7", color:"#0b194f", border:"none", borderRadius:7, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:12, flexShrink:0 }}>
                      Ver en Pendientes
                    </button>
                  )}
                </div>

                {/* Steps log */}
                <div ref={progressLogRef} style={{ padding:"18px 22px", maxHeight:480, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
                  {progressItems.length === 0 && (
                    <div style={{ color:"#bbb", fontSize:13, fontFamily:"monospace" }}>Iniciando...</div>
                  )}
                  {progressItems.map((item, i) => (
                    <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <span style={{
                        flexShrink:0, width:18, textAlign:"center", marginTop:2, fontSize:13,
                        color: item.status==="done" ? "#146c43" : item.status==="error" ? "#dc3545" : item.status==="running" ? "#856404" : "#aaa",
                      }}>
                        {item.status==="done" ? "✓" : item.status==="error" ? "✗" : item.status==="running" ? "▶" : "·"}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{
                          fontSize:13, lineHeight:1.5,
                          color: item.status==="done" ? "#444" : item.status==="error" ? "#dc3545" : item.status==="running" ? "#0b194f" : "#bbb",
                          fontWeight: item.status==="running" ? 700 : 400,
                        }}>
                          {item.text}
                        </div>
                        {item.detail && (
                          <div style={{ fontSize:11, color:"#aaa", marginTop:3, fontFamily:"monospace", wordBreak:"break-all" }}>
                            {item.detail}
                          </div>
                        )}
                      </div>
                      {item.status === "running" && (
                        <span className="pgSpin" style={{ color:"#856404", fontSize:12, flexShrink:0, marginTop:2 }}>◌</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Historial ── */}
            {progressHistory.length > 0 && (
              <div style={{ background:"white", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
                <div style={{ padding:"14px 20px", borderBottom:"1px solid #eee" }}>
                  <span style={{ fontWeight:700, color:"#0b194f", fontSize:14 }}>Historial de operaciones</span>
                </div>
                <div style={{ padding:"8px 0" }}>
                  {progressHistory.map((log, i) => (
                    <div key={log.id} style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"10px 20px", borderBottom: i < progressHistory.length - 1 ? "1px solid #f5f5f5" : "none",
                    }}>
                      <span style={{ fontSize:14, color: log.success ? "#146c43" : "#dc3545", flexShrink:0 }}>
                        {log.success ? "✓" : "✗"}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:"#333", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {log.title}
                        </div>
                      </div>
                      <span style={{ fontSize:11, color:"#aaa", flexShrink:0 }}>
                        {(() => {
                          const ms = Date.now() - new Date(log.completedAt).getTime()
                          const mins = Math.floor(ms / 60000)
                          if (mins < 1) return "ahora"
                          if (mins < 60) return `hace ${mins} min`
                          if (mins < 1440) return `hace ${Math.floor(mins/60)} h`
                          return `hace ${Math.floor(mins/1440)} d`
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Empty state ── */}
            {!progressTitle && progressHistory.length === 0 && (
              <Empty text="Sin actividad reciente. Cuando inicies un research o generacion de contenido, el proceso aparece aqui en tiempo real." />
            )}
          </div>
        )}

        {/* ══ LINKEDIN ══ */}
        {tab==="linkedin" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <h2 style={{ ...H2, marginBottom:4 }}>LinkedIn Content</h2>
              <p style={{ color:"#888", fontSize:13, margin:0 }}>
                Selecciona una pagina y elige el formato. El post se genera con el contenido real de esa pagina.
              </p>
            </div>

            {allPages.length === 0
              ? <Empty text="Sin paginas publicadas todavia. Publica paginas primero desde Pendientes." />
              : allPages.map(page => {
                const LI_FMTS = [
                  { key:"carousel", label:"Carrusel",  color:"#6f42c1", bg:"#f3eeff" },
                  { key:"historia", label:"Historia",  color:"#007aed", bg:"#e8f4fd" },
                  { key:"insight",  label:"Insight",   color:"#0d9488", bg:"#e0f7f5" },
                  { key:"video",    label:"Video",     color:"#fd7e14", bg:"#fff3e8" },
                ] as const
                const pagePosts = linkedinPosts.filter(lp => lp.page_id === page.id)
                const ptc = PAGE_TYPE_COLORS[page.page_type] || { color:"#aaa", bg:"#f5f5f5", label:page.page_type }
                const title = page.content?.title || page.keyword

                return (
                  <div key={page.id} style={{ background:"white", borderRadius:12, border:"1px solid #eee", marginBottom:14, overflow:"hidden" }}>
                    <div style={{ padding:"16px 20px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                            <span style={{ fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20, background:ptc.bg, color:ptc.color, flexShrink:0 }}>{ptc.label}</span>
                            <span style={{ fontWeight:700, color:"#0b194f", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{page.keyword}</span>
                          </div>
                          {title !== page.keyword && <p style={{ margin:0, fontSize:11, color:"#aaa", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</p>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          {LI_FMTS.map(f => {
                            const done = pagePosts.some(lp => lp.format === f.key)
                            const busy = generatingLi === `${page.id}-${f.key}`
                            return (
                              <button key={f.key} disabled={loading}
                                onClick={async () => {
                                  setGeneratingLi(`${page.id}-${f.key}`)
                                  setLoading(true)
                                  try {
                                    const r = await fetch("/api/linkedin", { method:"POST", headers:jsonHdr,
                                      body: JSON.stringify({ keyword:page.keyword, page_type:page.page_type, format:f.key, page_id:page.id }) })
                                    const d = await r.json(); if (!r.ok) throw new Error(d.error)
                                    notify(`Post listo: ${f.label} para "${page.keyword}"`, "success")
                                    loadData()
                                  } catch (e:any) { notify("Error: "+e.message, "error") }
                                  setGeneratingLi(null); setLoading(false)
                                }}
                                style={{ padding:"6px 12px", borderRadius:8, border:`1.5px solid ${done?f.color:"#e0e0e0"}`,
                                  background:done?f.bg:"white", color:done?f.color:"#666",
                                  fontSize:11, fontWeight:done?700:400, cursor:loading?"not-allowed":"pointer",
                                  opacity:loading&&!busy?0.5:1 }}>
                                {busy ? "..." : done ? `✓ ${f.label}` : `+ ${f.label}`}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {pagePosts.map(lp => {
                      const fc = LI_FMTS.find(f => f.key === lp.format) || LI_FMTS[0]
                      const preview = (lp.text||"").split("\n").find((l:string) => l.trim().length > 10) || ""
                      return (
                        <div key={lp.id} style={{ borderTop:"1px solid #f0f0f0" }}>
                          <div style={{ padding:"10px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, background:"#fafafa" }}>
                            <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, background:fc.bg, color:fc.color, flexShrink:0 }}>{fc.label}</span>
                              <span style={{ fontSize:12, color:"#666", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontStyle:"italic" }}>
                                {preview.substring(0,100)}{preview.length>100?"...":""}
                              </span>
                            </div>
                            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                              <button onClick={()=>{ navigator.clipboard.writeText(lp.text||""); setCopiedLi(lp.id); setTimeout(()=>setCopiedLi(null),2000) }}
                                style={{ ...BTN_CYAN, fontSize:11, background:copiedLi===lp.id?"#d1fae5":"#00ffd7", color:copiedLi===lp.id?"#065f46":"#0b194f" }}>
                                {copiedLi===lp.id?"Copiado!":"Copiar"}
                              </button>
                              <button onClick={()=>setExpandedLi(expandedLi===lp.id?null:lp.id)} style={{ ...BTN_GHOST, fontSize:11 }}>
                                {expandedLi===lp.id?"Cerrar":"Ver"}
                              </button>
                              <button onClick={async()=>{await fetch("/api/linkedin",{method:"DELETE",headers:jsonHdr,body:JSON.stringify({id:lp.id})});loadData()}} style={{ ...BTN_DEL, fontSize:11 }}>x</button>
                            </div>
                          </div>
                          {expandedLi===lp.id && (
                            <div style={{ padding:"18px 22px", background:"white", borderTop:"1px solid #f0f0f0" }}>
                              <pre style={{ margin:0, fontFamily:"system-ui,sans-serif", fontSize:13, color:"#333", lineHeight:1.8, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                                {lp.text}
                              </pre>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {tab==="dashboard" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <h2 style={{ ...H2, marginBottom:4 }}>Dashboard</h2>
              <p style={{ color:"#888", fontSize:13, margin:0 }}>
                {new Date().toLocaleDateString("es-CO", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
              </p>
            </div>

            {/* ── Metricas principales ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
              {[
                { label:"Paginas publicadas",    value: publishedSM.length,                              color:"#007aed", bg:"#e8f4fd", onClick: ()=>setTab("published") },
                { label:"Pendientes de revision", value: pending.length,                                   color: pending.length>0?"#fd7e14":"#aaa", bg: pending.length>0?"#fff3e8":"#f8f9fa", onClick: ()=>setTab("pending"), alert: pending.length>0 },
                { label:"Necesitan actualizacion",value: staleCount,                                       color: staleCount>0?"#dc3545":"#aaa",     bg: staleCount>0?"#fff0f0":"#f8f9fa",     onClick: ()=>setTab("updates"),  alert: staleCount>0 },
                { label:"Research realizados",    value: research.length,                                  color:"#6f42c1", bg:"#f3eeff", onClick: ()=>setTab("research") },
                { label:"Scripts YouTube",        value: ytScripts.length,                                 color:"#fd7e14", bg:"#fff3e8", onClick: ()=>setTab("youtube") },
                { label:"AEO optimizadas",        value: aeoItems.filter((a:any)=>a.aeo).length,           color:"#0d9488", bg:"#e0f7f5", onClick: ()=>setTab("aeo") },
              ].map((m,i) => (
                <div key={i} onClick={m.onClick} style={{ background:"white", borderRadius:12, padding:"18px 20px", cursor:"pointer", border:`1px solid ${m.alert?"rgba(220,53,69,0.3)":"#eee"}`, boxShadow: m.alert?"0 0 0 3px rgba(220,53,69,0.08)":"none" }}>
                  <div style={{ fontSize:28, fontWeight:800, color:m.color, lineHeight:1 }}>{m.value}</div>
                  <div style={{ fontSize:12, color:"#666", marginTop:5, fontWeight:500 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* ── Salud del contenido ── */}
            {publishedSM.length > 0 && (
              <div style={{ background:"white", borderRadius:12, padding:"20px 22px", marginBottom:18, border:"1px solid #eee" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontWeight:700, color:"#0b194f", fontSize:14 }}>Salud del contenido</span>
                  <span style={{ fontSize:12, color:"#aaa" }}>{publishedSM.length} paginas publicadas</span>
                </div>
                <div style={{ display:"flex", gap:2, marginBottom:10, height:8, borderRadius:6, overflow:"hidden" }}>
                  {publishedSM.map((p, i) => {
                    const { days } = getAgeStatus(p.lastmod)
                    return <div key={i} style={{ flex:1, background: days>180?"#dc3545":days>90?"#ffc107":"#28a745" }} title={p.keyword}/>
                  })}
                </div>
                <div style={{ display:"flex", gap:20, fontSize:12 }}>
                  <span style={{ color:"#28a745", fontWeight:600 }}>Al dia: {publishedSM.filter(p=>getAgeStatus(p.lastmod).days<=90).length}</span>
                  <span style={{ color:"#ffc107", fontWeight:600 }}>Revisar: {publishedSM.filter(p=>{const d=getAgeStatus(p.lastmod).days;return d>90&&d<=180}).length}</span>
                  <span style={{ color:"#dc3545", fontWeight:600 }}>Criticas: {publishedSM.filter(p=>getAgeStatus(p.lastmod).days>180).length}</span>
                </div>
              </div>
            )}

            {/* ── Acciones rapidas ── */}
            <div style={{ background:"white", borderRadius:12, padding:"20px 22px", marginBottom:18, border:"1px solid #eee" }}>
              <div style={{ fontWeight:700, color:"#0b194f", fontSize:14, marginBottom:14 }}>Acciones rapidas</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <button onClick={()=>setTab("sitemapbuild")} style={BTN_BLUE}>Nueva estructura SEO</button>
                <button onClick={()=>setTab("research")} style={BTN_GHOST}>Nuevo research</button>
                <button onClick={()=>setTab("generate")} style={BTN_GHOST}>Generar pagina</button>
                {pending.length>0 && (
                  <button onClick={()=>setTab("pending")} style={{ padding:"9px 18px", background:"#fff3e8", color:"#fd7e14", border:"1px solid #ffddb3", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:13 }}>
                    Revisar pendientes ({pending.length})
                  </button>
                )}
                {staleCount>0 && (
                  <button onClick={()=>setTab("updates")} style={{ padding:"9px 18px", background:"#fff0f0", color:"#dc3545", border:"1px solid #f5c2c7", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:13 }}>
                    Actualizar contenido ({staleCount})
                  </button>
                )}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {/* ── Ultimo research ── */}
              {research.length>0 && (
                <div style={{ background:"white", borderRadius:12, padding:"20px 22px", border:"1px solid #eee" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontWeight:700, color:"#0b194f", fontSize:14 }}>Ultimo research</span>
                    <button onClick={()=>setTab("research")} style={{ fontSize:12, color:"#007aed", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Ver todos</button>
                  </div>
                  {research.slice(0,4).map((r,i)=>(
                    <div key={i} style={{ padding:"9px 0", borderBottom: i<3?"1px solid #f5f5f5":"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"#0b194f", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.topic}</div>
                        <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>{r.data.sources_scraped||r.sources_scraped||0} fuentes analizadas</div>
                      </div>
                      <span style={{ fontSize:10, background:"#f3eeff", color:"#6f42c1", padding:"2px 8px", borderRadius:20, fontWeight:700, flexShrink:0 }}>{r.depth}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Sitemaps activos ── */}
              {sitemapDefs.length>0 && (
                <div style={{ background:"white", borderRadius:12, padding:"20px 22px", border:"1px solid #eee" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontWeight:700, color:"#0b194f", fontSize:14 }}>Sitemaps activos</span>
                    <button onClick={()=>setTab("sitemapbuild")} style={{ fontSize:12, color:"#007aed", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Ver todos</button>
                  </div>
                  {sitemapDefs.map((sm,i)=>{
                    const smNodes = sitemapNodes.filter(n=>n.sitemap_id===sm.id)
                    const pub = smNodes.filter(n=>n.status==="published").length
                    const gen = smNodes.filter(n=>n.status==="generated").length
                    const dft = smNodes.filter(n=>n.status==="draft").length
                    return (
                      <div key={i} style={{ padding:"10px 0", borderBottom: i<sitemapDefs.length-1?"1px solid #f5f5f5":"none" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontWeight:600, fontSize:13, color:"#0b194f" }}>{sm.name}</span>
                          <button onClick={()=>{setActiveSitemapId(sm.id);setTab("sitemapbuild")}} style={{ fontSize:11, color:"#007aed", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Abrir</button>
                        </div>
                        <div style={{ display:"flex", gap:10, marginTop:5 }}>
                          <span style={{ fontSize:11, color:"#28a745" }}>{pub} publicadas</span>
                          {gen>0&&<span style={{ fontSize:11, color:"#fd7e14" }}>{gen} generadas</span>}
                          {dft>0&&<span style={{ fontSize:11, color:"#aaa" }}>{dft} borrador</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

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
                      placeholder="ej: Trazabilidad WeTracking" style={{...INP, width:"100%", boxSizing:"border-box"}} />
                  </Field>
                  <Field label="Keyword raiz" style={{flex:1}}>
                    <input value={smKeyword} onChange={e=>setSmKeyword(e.target.value)}
                      placeholder="ej: trazabilidad" style={{...INP, width:"100%", boxSizing:"border-box"}} />
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
                      const isEditing = editingNode === node.id
                      const edits = nodeEdits[node.id]
                      return (
                        <div key={node.id}>
                          {isEditing ? (
                            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 18px", background:"#f0f8ff", borderBottom:"1px solid #bee3f8" }}>
                              <select
                                value={edits?.page_type ?? node.page_type}
                                onChange={e => setNodeEdits(prev => ({ ...prev, [node.id]: { ...(prev[node.id]||{url:node.url,keyword:node.keyword,page_type:node.page_type}), page_type:e.target.value }}))}
                                style={{ ...SEL, width:110, padding:"4px 8px", fontSize:11 }}
                              >
                                <option value="pillar">Pillar</option>
                                <option value="secondary">Secondary</option>
                                <option value="third">Third</option>
                                <option value="blog">Blog</option>
                              </select>
                              <input
                                value={edits?.url ?? node.url}
                                onChange={e => setNodeEdits(prev => ({ ...prev, [node.id]: { ...(prev[node.id]||{url:node.url,keyword:node.keyword,page_type:node.page_type}), url:e.target.value }}))}
                                style={{ ...INP, flex:"0 0 220px", fontSize:11, padding:"4px 8px", fontFamily:"monospace" }}
                                placeholder="URL"
                              />
                              <input
                                value={edits?.keyword ?? node.keyword}
                                onChange={e => setNodeEdits(prev => ({ ...prev, [node.id]: { ...(prev[node.id]||{url:node.url,keyword:node.keyword,page_type:node.page_type}), keyword:e.target.value }}))}
                                style={{ ...INP, flex:1, fontSize:11, padding:"4px 8px" }}
                                placeholder="Keyword"
                              />
                              <button onClick={()=>saveNodeEdit(node.id)} style={{ ...BTN_BLUE, padding:"4px 12px", fontSize:11, flexShrink:0 }}>Guardar</button>
                              <button onClick={()=>setEditingNode(null)} style={{ ...BTN_GHOST, padding:"4px 10px", fontSize:11, flexShrink:0 }}>Cancelar</button>
                            </div>
                          ) : (
                            <div style={{
                              display:"flex", alignItems:"center", gap:8,
                              padding:"7px 18px",
                              paddingLeft: 18 + node.depth * 22,
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
                              {(node.status === "draft" || node.status === "generated") && (
                                <>
                                  <button onClick={()=>researchAndGenerate(node)} disabled={loading} style={{ ...BTN_BLUE, padding:"4px 12px", fontSize:11, flexShrink:0, opacity:loading?0.55:1 }}>
                                    Investigar + Generar
                                  </button>
                                  <button onClick={()=>generateFromNode(node)} disabled={loading} style={{ ...BTN_CYAN, padding:"4px 12px", fontSize:11, flexShrink:0, opacity:loading?0.55:1 }}>
                                    Generar
                                  </button>
                                </>
                              )}
                              {node.status === "generated" && node.page_id && (
                                <button onClick={()=>{setTab("pending"); setExpandedPage(node.page_id!)}} style={{ ...BTN_GHOST, padding:"4px 12px", fontSize:11, flexShrink:0 }}>
                                  Ver
                                </button>
                              )}
                              <button
                                onClick={()=>{ setEditingNode(node.id); setNodeEdits(prev=>({...prev,[node.id]:{url:node.url,keyword:node.keyword,page_type:node.page_type}})) }}
                                style={{ ...BTN_GHOST, padding:"3px 8px", fontSize:11, flexShrink:0 }}
                              >Editar</button>
                              {node.status === "draft" && (
                                <button onClick={()=>deleteNode(node.id)} style={{ ...BTN_DEL, padding:"3px 8px", fontSize:11, flexShrink:0 }}>x</button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {showAddNode ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"#f0fdf4", borderTop:"1px solid #86efac" }}>
                        <select value={addNodeType} onChange={e=>setAddNodeType(e.target.value as any)} style={{ ...SEL, width:110, padding:"4px 8px", fontSize:11 }}>
                          <option value="pillar">Pillar</option>
                          <option value="secondary">Secondary</option>
                          <option value="third">Third</option>
                          <option value="blog">Blog</option>
                        </select>
                        <input value={addNodeUrl} onChange={e=>setAddNodeUrl(e.target.value)} placeholder="/url/de-la-pagina" style={{ ...INP, flex:"0 0 220px", fontSize:11, padding:"4px 8px", fontFamily:"monospace" }} />
                        <input value={addNodeKw} onChange={e=>setAddNodeKw(e.target.value)} placeholder="keyword SEO" style={{ ...INP, flex:1, fontSize:11, padding:"4px 8px" }} onKeyDown={e=>e.key==="Enter"&&addNode()} />
                        <button onClick={addNode} disabled={!addNodeUrl.trim()||!addNodeKw.trim()} style={{ ...BTN_BLUE, padding:"4px 12px", fontSize:11, background:"#28a745", flexShrink:0, opacity:!addNodeUrl.trim()||!addNodeKw.trim()?0.55:1 }}>Agregar</button>
                        <button onClick={()=>setShowAddNode(false)} style={{ ...BTN_GHOST, padding:"4px 10px", fontSize:11, flexShrink:0 }}>Cancelar</button>
                      </div>
                    ) : (
                      <div style={{ padding:"8px 18px", borderTop:"1px solid #f0f0f0" }}>
                        <button onClick={()=>setShowAddNode(true)} style={{ ...BTN_GHOST, fontSize:12 }}>+ Agregar pagina</button>
                      </div>
                    )}
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
              Usa Gemini 2.5 Pro con Google Search para investigar en tiempo real. El contexto se integra automaticamente en la generacion de contenido.
            </p>

            {/* ── TEST GEMINI ── */}
            <GeminiTestPanel />


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
                {loading?"Investigando con Gemini...":"Investigar ahora"}
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
                      {r.data.paa_questions?.length>0 && (
                        <div style={{ padding:"12px 14px", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#0369a1", textTransform:"uppercase", letterSpacing:0.5, display:"block", marginBottom:8 }}>
                            La gente tambien pregunta (Google PAA)
                          </span>
                          {r.data.paa_questions.map((q:string,i:number)=>(
                            <div key={i} style={{ display:"flex", gap:8, marginBottom:5, alignItems:"flex-start" }}>
                              <span style={{ flexShrink:0, fontSize:10, fontWeight:700, color:"#0369a1", background:"#e0f2fe", padding:"1px 5px", borderRadius:3, marginTop:1 }}>PAA</span>
                              <span style={{ fontSize:12, color:"#0c4a6e" }}>{q}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.data.related_searches?.length>0 && (
                        <div style={{ padding:"12px 14px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#166534", textTransform:"uppercase", letterSpacing:0.5, display:"block", marginBottom:8 }}>
                            Busquedas relacionadas en Google
                          </span>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {r.data.related_searches.map((s:string,i:number)=>(
                              <span key={i} style={{ fontSize:11, color:"#166534", background:"#dcfce7", padding:"3px 8px", borderRadius:20, border:"1px solid #86efac" }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
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
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:8 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", flexShrink:0, letterSpacing:0.5 }}>CTA</span>
                          <input
                            value={ctaEdits[p.id] ?? p.content?.cta_text ?? ""}
                            onChange={e => setCtaEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                            onBlur={e => {
                              const val = e.target.value
                              if (val !== p.content?.cta_text) saveCta(p.id, val)
                            }}
                            placeholder="ej: Solicita una demo gratis"
                            style={{ ...INP, flex:1, fontSize:12, padding:"5px 9px" }}
                          />
                          {ctaSaved[p.id] && <span style={{ fontSize:11, color:"#28a745", flexShrink:0, fontWeight:600 }}>Guardado</span>}
                        </div>
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

        {/* ══ IMAGENES ══ */}
        {tab==="images" && (
          <div>
            <h2 style={H2}>Generador de Imagenes</h2>
            <p style={{ color:"#777", fontSize:13, marginTop:-12, marginBottom:20 }}>
              Gemini Imagen 3 · estilo editorial WeTracking · logo aplicado automaticamente
            </p>

            <div style={{ background:"white", padding:24, borderRadius:12, border:"1px solid #eee", marginBottom:24 }}>
              <Field label="Descripcion de la imagen">
                <input
                  value={imgTestDesc} onChange={e=>setImgTestDesc(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!loading&&imgTestDesc.trim()&&(async()=>{
                    setLoading(true); notify("Generando imagen con Gemini...", "info")
                    try {
                      const r = await fetch("/api/generate-image",{method:"POST",headers:jsonHdr,body:JSON.stringify({description:imgTestDesc})})
                      const d = await r.json(); if(!r.ok) throw new Error(d.error)
                      notify("Imagen generada", "success"); setImgTestDesc(""); loadData()
                    } catch(e:any){notify("Error: "+e.message,"error")}
                    setLoading(false)
                  })()}
                  placeholder="ej: ciclo completo de trazabilidad desde materia prima hasta consumidor final"
                  style={{...INP, width:"100%", boxSizing:"border-box"}}
                />
              </Field>
              <button
                onClick={async()=>{
                  if(!imgTestDesc.trim()) return
                  setLoading(true); notify("Generando imagen con Gemini...", "info")
                  try {
                    const r = await fetch("/api/generate-image",{method:"POST",headers:jsonHdr,body:JSON.stringify({description:imgTestDesc})})
                    const d = await r.json(); if(!r.ok) throw new Error(d.error)
                    notify("Imagen generada", "success"); setImgTestDesc(""); loadData()
                  } catch(e:any){notify("Error: "+e.message,"error")}
                  setLoading(false)
                }}
                disabled={loading||!imgTestDesc.trim()}
                style={{...BTN_BLUE, width:"100%", padding:"13px", fontSize:15, background:"#198754", opacity:loading||!imgTestDesc.trim()?0.55:1, cursor:loading||!imgTestDesc.trim()?"not-allowed":"pointer"}}
              >
                {loading?"Generando con Gemini Imagen 3...":"Generar imagen"}
              </button>
              <p style={{ color:"#bbb", fontSize:11, textAlign:"center", marginTop:8, marginBottom:0 }}>
                Fondo navy · paleta WeTracking · logo blanco centrado arriba · sin texto
              </p>
            </div>

            {genImages.length===0
              ? <Empty text="Sin imagenes generadas. Crea la primera arriba." />
              : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  {genImages.map(img=>(
                    <div key={img.id} style={{ background:"white", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
                      <div style={{ position:"relative", background:"#0b194f" }}>
                        <img src={img.url} alt={img.description} style={{ width:"100%", display:"block", aspectRatio:"16/9", objectFit:"cover" }} />
                      </div>
                      <div style={{ padding:"10px 14px" }}>
                        <p style={{ margin:0, fontSize:12, color:"#444", lineHeight:1.5 }}>{img.description}</p>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                          <span style={{ fontSize:11, color:"#bbb" }}>{new Date(img.created_at).toLocaleDateString("es-CO")}</span>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={()=>navigator.clipboard.writeText(window.location.origin+img.url)} style={{...BTN_GHOST, padding:"4px 10px", fontSize:11}}>Copiar URL</button>
                            <button onClick={async()=>{await fetch("/api/generate-image",{method:"DELETE",headers:jsonHdr,body:JSON.stringify({id:img.id})});loadData()}} style={{...BTN_DEL, padding:"4px 10px", fontSize:11}}>x</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
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

        {/* ══ ACTUALIZACIONES ══ */}
        {tab==="updates" && (() => {
          const critical = publishedSM.filter(p => Math.floor((Date.now() - new Date(p.lastmod).getTime()) / 86_400_000) > 180)
          const review   = publishedSM.filter(p => { const d = Math.floor((Date.now() - new Date(p.lastmod).getTime()) / 86_400_000); return d > 90 && d <= 180 })
          const ok       = publishedSM.filter(p => Math.floor((Date.now() - new Date(p.lastmod).getTime()) / 86_400_000) <= 90)

          const filtered = publishedSM
            .filter(p => {
              const days = Math.floor((Date.now() - new Date(p.lastmod).getTime()) / 86_400_000)
              if (updateFilter === "critical") return days > 180
              if (updateFilter === "review")   return days > 90 && days <= 180
              if (updateFilter === "ok")       return days <= 90
              return true
            })
            .sort((a, b) => new Date(a.lastmod).getTime() - new Date(b.lastmod).getTime())

          return (
            <div>
              <h2 style={H2}>Actualizaciones de Contenido</h2>
              <p style={{ color:"#777", fontSize:13, marginTop:-12, marginBottom:22 }}>
                Google premia el contenido fresco. Paginas con mas de 3 meses necesitan revision;
                con mas de 6 meses, nueva investigacion y regeneracion completa.
                "Actualizar" corre un deep research nuevo y genera una version actualizada que va a Pendientes para tu revision.
              </p>

              {/* ── Resumen ── */}
              <div style={{ display:"flex", gap:12, marginBottom:24 }}>
                {[
                  { label:"Desactualizadas", sublabel:"> 6 meses", count:critical.length, color:"#dc3545", bg:"#fff0f0", border:"#f5c2c7" },
                  { label:"Revisar pronto",  sublabel:"3 a 6 meses", count:review.length,   color:"#856404", bg:"#fff3cd", border:"#ffeaa7" },
                  { label:"Al dia",          sublabel:"< 3 meses",  count:ok.length,       color:"#146c43", bg:"#d1f7e4", border:"#a3e0c5" },
                ].map(stat => (
                  <div key={stat.label} onClick={() => setUpdateFilter(stat.count > 0 ? (stat.label==="Al dia"?"ok":stat.label==="Revisar pronto"?"review":"critical") : "all")}
                    style={{ flex:1, background:stat.bg, borderRadius:12, padding:"16px 20px", border:`1px solid ${stat.border}`, cursor:"pointer" }}>
                    <div style={{ fontSize:30, fontWeight:800, color:stat.color, lineHeight:1 }}>{stat.count}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:stat.color, marginTop:4 }}>{stat.label}</div>
                    <div style={{ fontSize:11, color:stat.color, opacity:0.7 }}>{stat.sublabel}</div>
                  </div>
                ))}
              </div>

              {/* ── Filtros ── */}
              <div style={{ display:"flex", gap:8, marginBottom:18 }}>
                {([["all","Todas"],["critical","Criticas (>6m)"],["review","Revisar (3-6m)"],["ok","Al dia (<3m)"]] as const).map(([k,l]) => (
                  <button key={k} onClick={() => setUpdateFilter(k)} style={{
                    padding:"6px 16px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                    background: updateFilter===k ? "#0b194f" : "#f0f0f0",
                    color:      updateFilter===k ? "white"   : "#666",
                  }}>{l}</button>
                ))}
              </div>

              {/* ── Lista ── */}
              {publishedSM.length === 0
                ? <Empty text="Sin paginas publicadas aun. Publica tu primera pagina para empezar a ver alertas." />
                : filtered.length === 0
                  ? <Empty text="Sin paginas en esta categoria." />
                  : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {filtered.map((p, i) => {
                        const age      = getAgeStatus(p.lastmod)
                        const isUpd    = !!(p.id && updatingPages[p.id])
                        const ptColor  = PAGE_TYPE_COLORS[p.page_type||""] || { label: p.page_type||"", color:"#666", bg:"#f0f0f0" }
                        const needsAct = age.days > 90
                        return (
                          <div key={i} style={{ background:"white", borderRadius:10, border:`1.5px solid ${age.border}`, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:14 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                                <span style={{ fontWeight:700, color:"#0b194f", fontSize:14 }}>{p.keyword}</span>
                                {p.page_type && (
                                  <span style={{ padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, background:ptColor.bg, color:ptColor.color }}>{ptColor.label}</span>
                                )}
                                <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, background:age.bg, color:age.color, border:`1px solid ${age.border}` }}>
                                  {age.label}
                                </span>
                              </div>
                              <div style={{ display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
                                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color:"#007aed", fontSize:12 }}>{p.url}</a>
                                <span style={{ fontSize:11, color:"#aaa" }}>
                                  Publicada: {new Date(p.lastmod).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
                                </span>
                                <span style={{ fontSize:11, fontWeight:700, color:age.color }}>{ageDays(age.days)} atras</span>
                              </div>
                            </div>
                            <div style={{ flexShrink:0 }}>
                              {needsAct ? (
                                <button
                                  onClick={() => refreshPublishedPage(p)}
                                  disabled={isUpd || loading}
                                  style={{
                                    padding:"9px 18px", borderRadius:8, border:"none", cursor: isUpd||loading ? "default":"pointer",
                                    fontWeight:700, fontSize:12,
                                    background: isUpd ? "#f0f0f0" : age.days > 180 ? "#dc3545" : "#856404",
                                    color:      isUpd ? "#999"    : "white",
                                  }}>
                                  {isUpd ? "Actualizando..." : "Actualizar"}
                                </button>
                              ) : (
                                <span style={{ fontSize:11, color:"#aaa", fontStyle:"italic" }}>Sin accion requerida</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
              }
            </div>
          )
        })()}

        </div>
      </div>

    </div>
  )
}

// ── Sub-components ──

function ContentPrev({ page }: { page: Page }) {
  const { page_type, content } = page
  if (page_type==="blog") return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <PMeta label="paragraph_1" text={content.paragraph_1} />
      {content.example_1 && <ExampleBlock text={content.example_1} />}
      {content.key_points?.length>0 && <ListBlock items={content.key_points} ordered={false} />}
      <PMeta label="paragraph_2" text={content.paragraph_2} />
      <PMeta label="paragraph_3" text={content.paragraph_3} />
      {content.example_2 && <ExampleBlock text={content.example_2} />}
      <PMeta label="paragraph_4" text={content.paragraph_4} />
      {content.image_suggestions?.length>0 && (
        <ImageSuggestions suggestions={content.image_suggestions} />
      )}
      {content.suggested_links?.length>0 && (
        <SuggestedLinks links={content.suggested_links} />
      )}
      {content.external_sources?.length>0 && (
        <ExternalSources sources={content.external_sources} />
      )}
    </div>
  )
  return (
    <div>
      <span style={{ fontSize:11, fontWeight:700, color:"#aaa", textTransform:"uppercase" }}>Content Sections ({content.content_sections?.length||0})</span>
      <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:5 }}>
        {content.content_sections?.map((s:ContentSection, i:number)=>{
          if (s.type === "example") return <ExampleBlock key={i} text={s.content} />
          if (s.type === "callout") return <CalloutBlock key={i} text={s.content} />
          if (s.type === "list") return <ListBlock key={i} items={s.items||[]} ordered={false} />
          if (s.type === "numbered_list") return <ListBlock key={i} items={s.items||[]} ordered={true} />
          if (s.type === "table") return <TableBlock key={i} headers={s.headers||[]} rows={s.rows||[]} />
          return (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ flexShrink:0, padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:700, background:s.type==="heading2"?"#e8f4fd":"#f5f5f5", color:s.type==="heading2"?"#007aed":"#888", fontFamily:"monospace", border:"1px solid #e0e0e0" }}>{s.type}</span>
              <p style={{ margin:0, fontSize:12, color:s.type.startsWith("heading")?"#0b194f":"#666", fontWeight:s.type.startsWith("heading")?600:400 }}>{s.content}</p>
            </div>
          )
        })}
      </div>
      {content.image_suggestions?.length>0 && (
        <ImageSuggestions suggestions={content.image_suggestions} />
      )}
      {(page_type==="pillar"||page_type==="secondary") && content.faq_items?.length>0 && (
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
      {content.suggested_links?.length>0 && (
        <SuggestedLinks links={content.suggested_links} />
      )}
      {content.external_sources?.length>0 && (
        <ExternalSources sources={content.external_sources} />
      )}
    </div>
  )
}

function ExampleBlock({ text }: { text: string }) {
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"8px 10px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:6 }}>
      <span style={{ flexShrink:0, padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:700, background:"#dcfce7", color:"#166534", fontFamily:"monospace", border:"1px solid #86efac" }}>ejemplo</span>
      <p style={{ margin:0, fontSize:12, color:"#166534", fontStyle:"italic" }}>{text}</p>
    </div>
  )
}

function CalloutBlock({ text }: { text: string }) {
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"8px 10px", background:"#eff6ff", border:"1px solid #93c5fd", borderLeft:"4px solid #3b82f6", borderRadius:6 }}>
      <span style={{ flexShrink:0, padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:700, background:"#dbeafe", color:"#1d4ed8", fontFamily:"monospace", border:"1px solid #93c5fd" }}>clave</span>
      <p style={{ margin:0, fontSize:12, color:"#1e40af", fontWeight:500 }}>{text}</p>
    </div>
  )
}

function ListBlock({ items, ordered }: { items: string[]; ordered: boolean }) {
  const Tag = ordered ? "ol" : "ul"
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
      <span style={{ flexShrink:0, padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:700, background:"#f5f5f5", color:"#888", fontFamily:"monospace", border:"1px solid #e0e0e0" }}>{ordered ? "steps" : "list"}</span>
      <Tag style={{ margin:0, paddingLeft:16 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize:12, color:"#444", marginBottom:10, lineHeight:1.7 }}>{item}</li>
        ))}
      </Tag>
    </div>
  )
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!headers.length) return null
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
      <span style={{ flexShrink:0, padding:"2px 7px", borderRadius:4, fontSize:9, fontWeight:700, background:"#f5f5f5", color:"#888", fontFamily:"monospace", border:"1px solid #e0e0e0" }}>tabla</span>
      <div style={{ overflowX:"auto", flex:1 }}>
        <table style={{ borderCollapse:"collapse", width:"100%", fontSize:11 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ padding:"4px 8px", background:"#f0f0f0", border:"1px solid #ddd", fontWeight:700, textAlign:"left", color:"#333" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri%2===0 ? "#fff" : "#fafafa" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding:"4px 8px", border:"1px solid #ddd", color:"#555" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ImageSuggestions({ suggestions }: { suggestions: { after_section: string; description: string }[] }) {
  return (
    <div style={{ marginTop:12, borderTop:"1px solid #eee", paddingTop:12 }}>
      <span style={{ fontSize:11, fontWeight:700, color:"#92400e", textTransform:"uppercase", letterSpacing:0.5 }}>Sugerencias de imagen ({suggestions.length})</span>
      <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:6 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{ padding:"8px 10px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6 }}>
            <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#92400e" }}>Despues de: {s.after_section}</p>
            <p style={{ margin:"3px 0 0", fontSize:12, color:"#78350f" }}>{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuggestedLinks({ links }: { links: { anchor: string; url: string; keyword: string; context: string }[] }) {
  if (!links.length) return null
  return (
    <div style={{ marginTop:12, borderTop:"1px solid #eee", paddingTop:12 }}>
      <span style={{ fontSize:11, fontWeight:700, color:"#5b21b6", textTransform:"uppercase", letterSpacing:0.5 }}>Links internos sugeridos ({links.length})</span>
      <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:5 }}>
        {links.map((l, i) => (
          <div key={i} style={{ padding:"7px 10px", background:"#f5f3ff", border:"1px solid #ddd6fe", borderRadius:6 }}>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#4c1d95" }}>"{l.anchor}"</span>
              <span style={{ fontSize:10, color:"#7c3aed" }}>→</span>
              <code style={{ fontSize:11, background:"#ede9fe", padding:"1px 6px", borderRadius:3, color:"#5b21b6" }}>{l.url}</code>
            </div>
            {l.context && <p style={{ margin:"2px 0 0", fontSize:11, color:"#7c3aed" }}>En: {l.context}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExternalSources({ sources }: { sources: { url: string; domain: string }[] }) {
  if (!sources.length) return null
  return (
    <div style={{ marginTop:12, borderTop:"1px solid #eee", paddingTop:12 }}>
      <span style={{ fontSize:11, fontWeight:700, color:"#0369a1", textTransform:"uppercase", letterSpacing:0.5 }}>Fuentes externas ({sources.length})</span>
      <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:4 }}>
        {sources.map((s, i) => (
          <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:10, fontWeight:700, background:"#e0f2fe", color:"#0369a1", padding:"2px 6px", borderRadius:3, flexShrink:0 }}>{s.domain}</span>
            <span style={{ fontSize:11, color:"#0369a1", wordBreak:"break-all" }}>{s.url}</span>
          </div>
        ))}
      </div>
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

// ── Gemini Research Test Panel ──
function GeminiTestPanel() {
  const [topic,   setTopic]   = useState("")
  const [model,   setModel]   = useState("gemini-2.0-flash")
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState<string|null>(null)

  const MODELS = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
  ]

  async function run() {
    if (!topic.trim()) return
    setLoading(true); setResult(null); setError(null)
    try {
      const r = await fetch("/api/test-gemini-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, model }),
      })
      const d = await r.json()
      if (!r.ok || d.error) throw new Error(d.error || "Error desconocido")
      setResult(d)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ background:"#fffbeb", border:"2px dashed #fbbf24", borderRadius:12, padding:20, marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ background:"#fbbf24", color:"#78350f", fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:20, textTransform:"uppercase", letterSpacing:0.8 }}>Beta</span>
        <span style={{ fontWeight:700, color:"#78350f", fontSize:14 }}>Prueba: Gemini + Google Search Grounding</span>
        <span style={{ fontSize:12, color:"#92400e" }}>— comparar con Perplexity</span>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <input
          value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key==="Enter" && run()}
          placeholder="Keyword a investigar, ej: sistema de inventarios Colombia"
          style={{ ...INP, flex:1 }}
        />
        <select value={model} onChange={e => setModel(e.target.value)} style={{ ...SEL, width:180 }}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={run} disabled={loading || !topic.trim()} style={{
          ...BTN_BLUE, background:"#d97706", opacity: loading || !topic.trim() ? 0.55 : 1,
          cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
        }}>
          {loading ? "Probando..." : "Probar Gemini"}
        </button>
      </div>

      {error && (
        <div style={{ background:"#fff0f0", border:"1px solid #f5c2c7", borderRadius:8, padding:"12px 16px", color:"#dc3545", fontSize:13 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
          {/* Stats bar */}
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"10px 14px", background:"white", borderRadius:8, border:"1px solid #fde68a" }}>
            <span style={{ fontSize:12 }}><strong style={{ color:"#0b194f" }}>Modelo:</strong> {result.model_used}</span>
            <span style={{ fontSize:12 }}><strong style={{ color:"#0b194f" }}>Tiempo:</strong> {(result.elapsed_ms/1000).toFixed(1)}s</span>
            <span style={{ fontSize:12, color: result.citations_count > 0 ? "#146c43" : "#dc3545" }}>
              <strong>Fuentes:</strong> {result.citations_count} citadas
            </span>
            <span style={{ fontSize:12 }}><strong style={{ color:"#0b194f" }}>Busquedas:</strong> {result.web_search_queries?.join(", ") || "—"}</span>
            {!result.ok && <span style={{ fontSize:12, color:"#dc3545" }}>JSON parse fallido</span>}
          </div>

          {/* Citations */}
          {result.citations?.length > 0 && (
            <div style={{ background:"white", borderRadius:8, border:"1px solid #fde68a", padding:"12px 16px" }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#78350f", marginBottom:8 }}>Fuentes encontradas ({result.citations.length})</div>
              {result.citations.map((c: any, i: number) => (
                <div key={i} style={{ fontSize:11, color:"#666", marginBottom:4, display:"flex", gap:8, alignItems:"baseline" }}>
                  <span style={{ flexShrink:0, color:"#aaa" }}>{i+1}.</span>
                  <span style={{ wordBreak:"break-all" }}>{c.title || c.url}</span>
                </div>
              ))}
            </div>
          )}

          {/* Research data preview */}
          {result.data && (
            <div style={{ background:"white", borderRadius:8, border:"1px solid #fde68a", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#78350f", marginBottom:2 }}>Contenido del research</div>
              {result.data.summary && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", marginBottom:4 }}>Resumen</div>
                  <p style={{ fontSize:12, color:"#444", margin:0, lineHeight:1.6 }}>{result.data.summary}</p>
                </div>
              )}
              {result.data.key_facts?.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", marginBottom:4 }}>Hechos clave ({result.data.key_facts.length})</div>
                  <ul style={{ margin:0, paddingLeft:16 }}>
                    {result.data.key_facts.slice(0,5).map((f: string, i: number) => (
                      <li key={i} style={{ fontSize:12, color:"#444", marginBottom:3, lineHeight:1.5 }}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.data.statistics?.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", marginBottom:4 }}>Estadisticas ({result.data.statistics.length})</div>
                  {result.data.statistics.map((s: any, i: number) => (
                    <div key={i} style={{ fontSize:12, color:"#444", marginBottom:3 }}>
                      <span>{s.data}</span>
                      {s.source && <span style={{ color:"#aaa", marginLeft:6 }}>({s.source})</span>}
                    </div>
                  ))}
                </div>
              )}
              {result.data.seo_opportunities?.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", marginBottom:4 }}>Oportunidades SEO</div>
                  <ul style={{ margin:0, paddingLeft:16 }}>
                    {result.data.seo_opportunities.map((o: string, i: number) => (
                      <li key={i} style={{ fontSize:12, color:"#444", marginBottom:3 }}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw preview if parse failed */}
          {!result.data && result.raw_text_preview && (
            <div style={{ background:"#1e293b", borderRadius:8, padding:"12px 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#aaa", marginBottom:6 }}>RESPUESTA RAW (primeros 600 chars)</div>
              <pre style={{ fontSize:11, color:"#94a3b8", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{result.raw_text_preview}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Content age helpers ──
function getAgeStatus(lastmod: string): { days: number; label: string; color: string; bg: string; border: string } {
  const days = Math.floor((Date.now() - new Date(lastmod).getTime()) / 86_400_000)
  if (days > 180) return { days, label: "Desactualizado", color: "#dc3545", bg: "#fff0f0", border: "#f5c2c7" }
  if (days > 90)  return { days, label: "Revisar pronto", color: "#856404", bg: "#fff3cd", border: "#ffeaa7" }
  return { days, label: "Al dia", color: "#146c43", bg: "#d1f7e4", border: "#a3e0c5" }
}

function ageDays(days: number): string {
  if (days < 30)  return `${days} dias`
  if (days < 365) return `${Math.floor(days / 30)} meses`
  const y = Math.floor(days / 365), m = Math.floor((days % 365) / 30)
  return m > 0 ? `${y} ano${y > 1 ? "s" : ""} ${m}m` : `${y} ano${y > 1 ? "s" : ""}`
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