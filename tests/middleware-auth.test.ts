import { describe, expect, it } from "bun:test"
import { NextRequest } from "next/server"
import { middleware } from "@/middleware"

describe("middleware auth protections", () => {
  it("returns 401 for protected API routes without auth", () => {
    const request = new NextRequest("http://localhost/api/clients")
    const response = middleware(request)

    expect(response.status).toBe(401)
  })

  it("allows explicitly public webhook route without auth", () => {
    const request = new NextRequest("http://localhost/api/instantly/webhook")
    const response = middleware(request)

    expect(response.status).toBe(200)
  })

  it("allows protected API routes when bearer auth header exists", () => {
    const request = new NextRequest("http://localhost/api/clients", {
      headers: {
        authorization: "Bearer token_that_is_long_enough",
      },
    })

    const response = middleware(request)

    expect(response.status).toBe(200)
  })
})
