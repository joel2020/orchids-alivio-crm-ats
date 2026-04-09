import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

function requireEnv(name: keyof z.infer<typeof envSchema>): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
}

const parsedEnv = envSchema.safeParse(rawEnv)
if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`)
}

export const env = parsedEnv.data
