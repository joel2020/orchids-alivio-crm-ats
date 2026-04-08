import { NextRequest } from "next/server"
import { handleCreate, handleList } from "@/lib/api/crud"
import { tasksSchema } from "@/lib/api/schemas"

const TABLE = "tasks"

export async function GET(request: NextRequest) {
  return handleList(request, TABLE)
}

export async function POST(request: NextRequest) {
  return handleCreate(request, TABLE, tasksSchema)
}
