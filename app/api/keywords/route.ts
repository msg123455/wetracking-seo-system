import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

const memoryPath = path.join(process.cwd(), "data", "seo-memory.json")

function readMemory() {
  const raw = fs.readFileSync(memoryPath, "utf-8")
  return JSON.parse(raw)
}

function writeMemory(data: any) {
  fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2))
}

export async function GET() {
  const memory = readMemory()
  return Response.json(memory.keywords)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const memory = readMemory()
  const keyword = {
    id: Date.now().toString(),
    keyword: body.keyword,
    volume: body.volume || "unknown",
    difficulty: body.difficulty || "medium",
    intent: body.intent || "informational",
    assigned_page: body.assigned_page || null,
    status: "pending",
    created_at: new Date().toISOString()
  }
  memory.keywords.push(keyword)
  memory.last_updated = new Date().toISOString()
  writeMemory(memory)
  return Response.json(keyword)
}
