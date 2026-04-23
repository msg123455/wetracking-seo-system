import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

export async function GET() {
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  return Response.json(memory.pending_approval)
}

export async function DELETE(req: NextRequest) {
  const { page_id } = await req.json()
  const memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"))
  const idx = memory.pending_approval.findIndex((p: any) => p.id === page_id)
  if (idx === -1) {
    return Response.json({ error: "Página no encontrada" }, { status: 404 })
  }
  memory.pending_approval.splice(idx, 1)
  memory.last_updated = new Date().toISOString()
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2))
  return Response.json({ success: true })
}
