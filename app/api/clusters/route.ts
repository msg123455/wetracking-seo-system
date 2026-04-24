import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.clusters || [])
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, id } = await req.json()
    if (!name?.trim() || !id?.trim()) {
      return Response.json({ error: "name e id son requeridos" }, { status: 400 })
    }
    const memory = readMemory()
    if (!memory.clusters) memory.clusters = []
    if (memory.clusters.find((c: any) => c.id === id.trim())) {
      return Response.json({ error: "Ya existe un cluster con ese ID" }, { status: 409 })
    }
    const cluster = { id: id.trim(), name: name.trim(), created_at: new Date().toISOString() }
    memory.clusters.push(cluster)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json(cluster)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const memory = readMemory()
    memory.clusters = (memory.clusters || []).filter((c: any) => c.id !== id)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
