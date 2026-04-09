import { NextRequest } from "next/server"
import { handleDelete, handleGetById, handleUpdate } from "@/lib/api/crud"
import { activitiesSchema } from "@/lib/api/schemas"

const TABLE = "activities"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handleGetById(request, TABLE, id)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handleUpdate(request, TABLE, id, activitiesSchema)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handleDelete(request, TABLE, id)
}
