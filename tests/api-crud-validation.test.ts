process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-test-key"

import { beforeEach, describe, expect, it, mock } from "bun:test"
import { NextRequest } from "next/server"
import { z } from "zod"

const insertSpy = mock(() => ({
  select: () => ({
    single: async () => ({ data: { id: "new-id" }, error: null }),
  }),
}))

const fromSpy = mock(() => ({
  insert: insertSpy,
}))

mock.module("@/lib/auth", () => ({
  requireApiAuth: async () => ({
    context: {
      accountId: "00000000-0000-0000-0000-000000000001",
      user: { id: "user-1" },
      supabase: {
        from: fromSpy,
      },
    },
  }),
}))

import { handleCreate } from "@/lib/api/crud"

const schema = z.object({
  name: z.string().min(1),
})

describe("handleCreate validation", () => {
  beforeEach(() => {
    insertSpy.mockClear()
    fromSpy.mockClear()
  })

  it("rejects invalid payload before any DB write", async () => {
    const request = new NextRequest("http://localhost/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    })

    const response = await handleCreate(request, "companies", schema)

    expect(response.status).toBe(422)
    expect(fromSpy).not.toHaveBeenCalled()
    expect(insertSpy).not.toHaveBeenCalled()
  })
})
