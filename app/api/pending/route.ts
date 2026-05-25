import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.pending_approval)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { page_id, field, value } = await req.json()
    const memory = readMemory()
    const page = memory.pending_approval.find((p: any) => p.id === page_id)
    if (!page) return Response.json({ error: "Página no encontrada" }, { status: 404 })
    page.content[field] = value
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { page_id } = await req.json()
    const memory = readMemory()
    const idx = memory.pending_approval.findIndex((p: any) => p.id === page_id)
    if (idx === -1) return Response.json({ error: "Página no encontrada" }, { status: 404 })
    memory.pending_approval.splice(idx, 1)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
