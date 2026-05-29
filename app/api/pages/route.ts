import { readMemory } from "@/lib/memory"

// Returns published pages with full content — used by LinkedIn module
export async function GET() {
  try {
    const memory = readMemory()
    const pages = (memory.published || []).map((p: any) => ({ ...p, list: "published" }))
    return Response.json(pages)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
