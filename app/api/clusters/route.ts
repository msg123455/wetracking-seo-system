import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

export async function GET() {
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  return Response.json(memory.clusters || [])
}

export async function POST(req: NextRequest) {
  const { name, id } = await req.json()
  if (!name?.trim() || !id?.trim()) {
    return Response.json({ error: "name e id son requeridos" }, { status: 400 })
  }
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  if (!memory.clusters) memory.clusters = []
  if (memory.clusters.find((c: any) => c.id === id.trim())) {
    return Response.json({ error: "Ya existe un cluster con ese ID" }, { status: 409 })
  }
  const cluster = { id: id.trim(), name: name.trim(), created_at: new Date().toISOString() }
  memory.clusters.push(cluster)
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))
  return Response.json(cluster)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  memory.clusters = (memory.clusters || []).filter((c: any) => c.id !== id)
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))
  return Response.json({ success: true })
}
