export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-lg border p-6 text-center">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authenticate with Supabase Auth to access the dashboard and API.
        </p>
      </div>
    </main>
  )
}
