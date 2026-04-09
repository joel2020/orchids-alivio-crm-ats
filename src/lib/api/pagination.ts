import { z } from "zod"

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export function parsePaginationParams(searchParams: URLSearchParams) {
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  })

  if (!parsed.success) {
    throw new Error("Invalid pagination params: page must be >= 1 and limit must be between 1 and 100")
  }

  const { page, limit } = parsed.data
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { page, limit, from, to }
}
