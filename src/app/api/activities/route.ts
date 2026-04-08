import { NextRequest } from "next/server"
import { handleCreate, handleList } from "@/lib/api/crud"
import { activitiesSchema } from "@/lib/api/schemas"

const TABLE = "activities"

export async function GET(request: NextRequest) {
  return handleList(request, TABLE)
}

export async function POST(request: NextRequest) {
  return handleCreate(request, TABLE, activitiesSchema)
}
