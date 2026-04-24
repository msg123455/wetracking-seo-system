import { NextRequest } from "next/server"
import { readMemory, writeMemory } from "@/lib/memory"

export async function GET() {
  try {
    const memory = readMemory()
    return Response.json(memory.keywords)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.keyword?.trim()) {
      return Response.json({ error: "keyword es requerido" }, { status: 400 })
    }
    const memory = readMemory()
    const keyword = {
      id: Date.now().toString(),
      keyword: body.keyword.trim(),
      volume: body.volume || "unknown",
      difficulty: body.difficulty || "medium",
      intent: body.intent || "informational",
      assigned_page: body.assigned_page || null,
      status: "pending",
      created_at: new Date().toISOString(),
    }
    memory.keywords.push(keyword)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json(keyword)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const memory = readMemory()
    memory.keywords = memory.keywords.filter((k: any) => k.id !== id)
    memory.last_updated = new Date().toISOString()
    writeMemory(memory)
    return Response.json({ success: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
