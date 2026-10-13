import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return new NextResponse(null, { status: 404 })
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: archivos } = await supabase.storage.from("fotos-matriculados").list("identidad-visual", { limit: 100, sortBy: { column: "name", order: "desc" } })
  const icono = archivos?.find((archivo) => archivo.name.startsWith("icono-credencial-") && archivo.name.endsWith(".png"))
  if (!icono) return NextResponse.redirect(new URL("/icon-512.png", "https://www.renacli.com.ar"), 307)
  const { data, error } = await supabase.storage.from("fotos-matriculados").download(`identidad-visual/${icono.name}`)
  if (error || !data) return new NextResponse(null, { status: 404 })
  return new NextResponse(await data.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } })
}
