import { NextRequest } from "next/server"
import { handleCreate, handleList } from "@/lib/api/crud"
import { jobOrdersSchema } from "@/lib/api/schemas"

const TABLE = "job_orders"

export async function GET(request: NextRequest) {
  return handleList(request, TABLE)
}

export async function POST(request: NextRequest) {
  return handleCreate(request, TABLE, jobOrdersSchema)
}
