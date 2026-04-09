type Envelope = {
  data?: unknown
  items?: unknown
  error?: unknown
  message?: unknown
}

export function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []

  const envelope = payload as Envelope
  if (Array.isArray(envelope.data)) return envelope.data as T[]
  if (Array.isArray(envelope.items)) return envelope.items as T[]

  return []
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback
  const envelope = payload as Envelope

  if (typeof envelope.error === "string" && envelope.error.trim()) return envelope.error
  if (typeof envelope.message === "string" && envelope.message.trim()) return envelope.message

  return fallback
}
