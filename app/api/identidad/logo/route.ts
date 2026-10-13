import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return new NextResponse(null, { status: 404 })
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase.storage.from("fotos-matriculados").download("identidad-visual/logo-actual.png")
  if (error || !data) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } })
  return new NextResponse(await data.arrayBuffer(), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  })
}
